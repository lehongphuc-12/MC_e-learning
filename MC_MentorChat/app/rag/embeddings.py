import logging
from typing import List
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger("mentorchat.embeddings")

client = genai.Client(api_key=settings.GEMINI_API_KEY)


def generate_embedding(text: str) -> List[float]:
    """Tạo vector nhúng 768 chiều từ Gemini Embedding API."""
    if not text or not text.strip():
        logger.warning("[Embeddings] generate_embedding được gọi với text rỗng, trả về vector 0.")
        return [0.0] * settings.VECTOR_SIZE

    primary_model = settings.EMBEDDING_MODEL
    fallback_model = "gemini-embedding-001"

    try:
        response = client.models.embed_content(
            model=primary_model,
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=settings.VECTOR_SIZE)
        )
        return response.embeddings[0].values
    except Exception as primary_err:
        logger.warning(
            "[Embeddings] Model chính '%s' thất bại: %s. Đang thử fallback sang '%s'...",
            primary_model, primary_err, fallback_model,
        )
        # Fallback tự động sang gemini-embedding-001 nếu model cấu hình lỗi
        if primary_model != fallback_model:
            try:
                response = client.models.embed_content(
                    model=fallback_model,
                    contents=text,
                    config=types.EmbedContentConfig(output_dimensionality=settings.VECTOR_SIZE)
                )
                logger.info("[Embeddings] Fallback sang '%s' thành công.", fallback_model)
                return response.embeddings[0].values
            except Exception as fallback_err:
                logger.error(
                    "[Embeddings] Fallback model '%s' cũng thất bại: %s",
                    fallback_model, fallback_err, exc_info=True,
                )
                raise RuntimeError(
                    f"Không thể tạo embedding: model chính '{primary_model}' lỗi ({primary_err}), "
                    f"fallback '{fallback_model}' cũng lỗi ({fallback_err})"
                ) from fallback_err
        raise RuntimeError(
            f"Không thể tạo embedding với model '{primary_model}': {primary_err}"
        ) from primary_err


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Tạo vector nhúng cho danh sách các chunks."""
    if not texts:
        logger.warning("[Embeddings] generate_embeddings_batch được gọi với danh sách rỗng.")
        return []

    logger.info("[Embeddings] Đang tạo embeddings cho %d chunks...", len(texts))
    results = []
    failed = 0
    for idx, text in enumerate(texts):
        try:
            vec = generate_embedding(text)
            results.append(vec)
        except Exception as e:
            failed += 1
            logger.error(
                "[Embeddings] Chunk #%d/%d thất bại: %s — dùng zero vector thay thế.",
                idx + 1, len(texts), e,
            )
            results.append([0.0] * settings.VECTOR_SIZE)

    if failed > 0:
        logger.warning(
            "[Embeddings] HOÀN TẤT với %d/%d chunk thất bại (zero vector).",
            failed, len(texts),
        )
    else:
        logger.info("[Embeddings] HOÀN TẤT: %d embeddings tạo thành công.", len(texts))
    return results
