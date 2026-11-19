import logging
import random
import time
from typing import List, Optional
from google.genai import types
from app.core.config import settings
from app.services.gemini_pool import gemini_pool

logger = logging.getLogger("mentorchat.embeddings")

# Lô batch 20–50 chunks/lần theo khuyến cáo của google-genai
_DEFAULT_BATCH_SIZE = 32
_MAX_RETRIES_PER_KEY = 3
_BASE_BACKOFF_SECONDS = 1.5


def _is_rate_limit(err: Exception) -> bool:
    msg = str(err).lower()
    return any(k in msg for k in ("429", "quota", "resourceexhausted", "resource_exhausted", "rate limit"))


def _is_transient_error(err: Exception) -> bool:
    msg = str(err).lower()
    return any(k in msg for k in ("503", "500", "502", "504", "unavailable", "timeout", "deadline", "connection"))


def _embed_batch_with_retry(
    contents: List[str],
    task_type: str,
) -> List[List[float]]:
    """
    Tạo embeddings cho 1 lô văn bản với Google GenAI.
    Thực hiện retry exponential backoff đối với 429 và 503/transient.
    Xoay vòng pool API Key nếu gặp Rate Limit.
    TUYỆT ĐỐI không fallback zero vector; nếu thất bại sẽ raise exception.
    """
    models = list(dict.fromkeys([settings.EMBEDDING_MODEL, "gemini-embedding-001"]))
    _, _, start_key_num = gemini_pool.get_round_robin_client()
    clients_to_try = gemini_pool.get_ordered_clients_starting_from(start_key_num)

    last_err: Optional[Exception] = None

    for client, _, key_num in clients_to_try:
        for model_name in models:
            for attempt in range(1, _MAX_RETRIES_PER_KEY + 1):
                try:
                    response = client.models.embed_content(
                        model=model_name,
                        contents=contents,
                        config=types.EmbedContentConfig(
                            output_dimensionality=settings.VECTOR_SIZE,
                            task_type=task_type,
                        ),
                    )
                    vectors = [list(e.values) for e in response.embeddings]
                    if len(vectors) != len(contents):
                        raise RuntimeError(
                            f"Số vector trả về ({len(vectors)}) không khớp số input ({len(contents)})."
                        )

                    # Kiểm tra tính hợp lệ: tuyệt đối không cho phép zero vector
                    for idx, vec in enumerate(vectors):
                        if not vec or all(abs(val) < 1e-9 for val in vec):
                            raise ValueError(
                                f"Model trả về zero vector không hợp lệ tại vị trí {idx} cho văn bản: {contents[idx][:60]}..."
                            )

                    return vectors

                except Exception as err:
                    last_err = err
                    if _is_rate_limit(err):
                        logger.warning(
                            "[Embeddings] Key #%d bị Rate Limit / 429 (lần thử %d/%d): %s.",
                            key_num, attempt, _MAX_RETRIES_PER_KEY, err,
                        )
                        # Nếu còn Key khác trong pool, chuyển ngay sang Key tiếp theo
                        if len(clients_to_try) > 1 and attempt == 1:
                            break
                        # Nếu đã qua các key hoặc chỉ có 1 key, áp dụng exponential backoff
                        backoff = _BASE_BACKOFF_SECONDS * (2 ** (attempt - 1)) + random.uniform(0.1, 0.5)
                        logger.info("[Embeddings] Chờ exponential backoff %.2fs rồi thử lại...", backoff)
                        time.sleep(backoff)
                        continue

                    if _is_transient_error(err):
                        backoff = _BASE_BACKOFF_SECONDS * (2 ** (attempt - 1)) + random.uniform(0.1, 0.5)
                        logger.warning(
                            "[Embeddings] Lỗi tạm thời (503/500/timeout) tại Key #%d (lần %d/%d): %s. Backoff %.2fs...",
                            key_num, attempt, _MAX_RETRIES_PER_KEY, err, backoff,
                        )
                        time.sleep(backoff)
                        continue

                    # Các lỗi khác (cấu hình, auth sai hẳn...)
                    logger.error("[Embeddings] Lỗi không thể retry tại Key #%d: %s", key_num, err)
                    break

    raise RuntimeError(
        f"Không thể tạo embeddings với tất cả các API Key có sẵn (tuyệt đối không lưu zero vector): {last_err}"
    ) from last_err


def generate_embedding(text: str, task_type: str = "RETRIEVAL_QUERY") -> List[float]:
    """
    Tạo vector cho câu truy vấn (mặc định task_type='RETRIEVAL_QUERY').
    """
    if not text or not text.strip():
        raise ValueError("Không thể tạo embedding cho chuỗi rỗng.")
    return _embed_batch_with_retry([text.strip()], task_type=task_type)[0]


def generate_embeddings_batch(
    texts: List[str],
    task_type: str = "RETRIEVAL_DOCUMENT",
    batch_size: int = _DEFAULT_BATCH_SIZE,
) -> List[List[float]]:
    """
    Tạo embeddings hàng loạt theo lô 20–50 chunks (mặc định task_type='RETRIEVAL_DOCUMENT').
    """
    if not texts:
        return []

    cleaned = [t.strip() for t in texts]
    if any(not t for t in cleaned):
        raise ValueError("Danh sách chunks chứa phần tử rỗng.")

    # Đảm bảo batch_size nằm trong khoảng tối ưu 20-50
    effective_batch_size = max(20, min(50, batch_size))
    logger.info(
        "[Embeddings] Bắt đầu batch embedding cho %d chunks (lô %d chunks, task_type=%s)...",
        len(cleaned), effective_batch_size, task_type,
    )

    results: List[List[float]] = []

    for start in range(0, len(cleaned), effective_batch_size):
        batch = cleaned[start:start + effective_batch_size]
        vectors = _embed_batch_with_retry(batch, task_type=task_type)
        results.extend(vectors)

    logger.info("[Embeddings] HOÀN TẤT: Đã tạo %d vectors an toàn (không có zero vector).", len(results))
    return results
