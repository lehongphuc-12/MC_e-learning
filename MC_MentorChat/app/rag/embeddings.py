import logging
import time
from typing import List
from google.genai import types
from app.core.config import settings
from app.services.gemini_pool import gemini_pool

logger = logging.getLogger("mentorchat.embeddings")

_BATCH_SIZE = 32
_MAX_RETRIES = 2


def _embed_with_failover(
    contents: List[str],
    task_type: str,
) -> List[List[float]]:
    models = list(dict.fromkeys([settings.EMBEDDING_MODEL, "gemini-embedding-001"]))
    _, _, start_key_num = gemini_pool.get_round_robin_client()
    clients_to_try = gemini_pool.get_ordered_clients_starting_from(start_key_num)

    last_err: Exception | None = None

    for client, _, key_num in clients_to_try:
        for model_name in models:
            for attempt in range(1, _MAX_RETRIES + 1):
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
                    return vectors
                except Exception as err:
                    last_err = err
                    err_msg = str(err).lower()
                    is_rate_limit = any(k in err_msg for k in ("429", "quota", "resourceexhausted", "limit"))
                    if is_rate_limit:
                        logger.warning(
                            "[Embeddings] Key #%d bị Rate Limit / Quota (429): %s. Đang chuyển sang Key tiếp theo...",
                            key_num, err,
                        )
                        break  # Chuyển ngay sang Key tiếp theo trong pool!

                    is_transient = any(k in err_msg for k in ("503", "500", "timeout", "unavailable"))
                    if is_transient and attempt < _MAX_RETRIES:
                        time.sleep(1.0 * attempt)
                        continue
                    break

    raise RuntimeError(
        f"Không thể tạo embeddings với tất cả các Key Gemini có sẵn: {last_err}"
    ) from last_err


def generate_embedding(text: str, task_type: str = "RETRIEVAL_QUERY") -> List[float]:
    if not text or not text.strip():
        raise ValueError("Không thể tạo embedding cho chuỗi rỗng.")
    return _embed_with_failover([text.strip()], task_type=task_type)[0]


def generate_embeddings_batch(
    texts: List[str],
    task_type: str = "RETRIEVAL_DOCUMENT",
) -> List[List[float]]:
    if not texts:
        return []

    cleaned = [t.strip() for t in texts]
    if any(not t for t in cleaned):
        raise ValueError("Danh sách chunks chứa phần tử rỗng.")

    logger.info("[Embeddings] Đang tạo embeddings cho %d chunks...", len(cleaned))
    results: List[List[float]] = []

    for start in range(0, len(cleaned), _BATCH_SIZE):
        batch = cleaned[start:start + _BATCH_SIZE]
        vectors = _embed_with_failover(batch, task_type=task_type)
        results.extend(vectors)

    logger.info("[Embeddings] HOÀN TẤT: %d embeddings tạo thành công.", len(results))
    return results
