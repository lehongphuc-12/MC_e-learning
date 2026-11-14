import logging
from typing import List, Dict, Any, Optional
from qdrant_client.models import Filter, FieldCondition, MatchValue
from app.core.config import settings
from app.rag.qdrant_service import qdrant_client
from app.rag.embeddings import generate_embedding

logger = logging.getLogger("mentorchat.retriever")


def retrieve_course_chunks(
    course_id: int, 
    query: str, 
    lesson_id: Optional[int] = None, 
    top_k: int = 4
) -> List[Dict[str, Any]]:
    """
    Tìm kiếm đoạn kiến thức tương đồng ngữ nghĩa.
    Khóa cứng bộ lọc course_id để tuyệt đối không lấy nhầm khóa khác.
    Dùng task_type='RETRIEVAL_QUERY' riêng cho câu truy vấn.
    """
    # Ép buộc top_k trong khoảng an toàn 1 <= top_k <= 12
    safe_top_k = max(1, min(12, top_k))

    logger.info(
        "[Retriever] course_id=%s lesson_id=%s top_k=%d (requested=%d) — đang tạo query embedding...",
        course_id, lesson_id, safe_top_k, top_k,
    )

    try:
        query_vector = generate_embedding(query, task_type="RETRIEVAL_QUERY")
    except Exception as e:
        logger.error(
            "[Retriever] course_id=%s — LỖI tạo query embedding: %s",
            course_id, e, exc_info=True,
        )
        raise RuntimeError(f"Không thể tạo embedding cho câu hỏi: {e}") from e

    # Bộ lọc bắt buộc theo course_id
    must_conditions = [
        FieldCondition(
            key="course_id",
            match=MatchValue(value=int(course_id))
        )
    ]

    # Nếu học viên chọn bài học cụ thể
    if lesson_id is not None:
        must_conditions.append(
            FieldCondition(
                key="lesson_id",
                match=MatchValue(value=int(lesson_id))
            )
        )
        logger.info("[Retriever] course_id=%s — lọc theo lesson_id=%s.", course_id, lesson_id)

    filter_obj = Filter(must=must_conditions)

    logger.info("[Retriever] course_id=%s — đang tìm kiếm vector trong Qdrant...", course_id)
    try:
        if hasattr(qdrant_client, "query_points"):
            search_res = qdrant_client.query_points(
                collection_name=settings.QDRANT_COLLECTION,
                query=query_vector,
                query_filter=filter_obj,
                limit=safe_top_k
            )
            hits = search_res.points
        else:
            hits = qdrant_client.search(
                collection_name=settings.QDRANT_COLLECTION,
                query_vector=query_vector,
                query_filter=filter_obj,
                limit=safe_top_k
            )
    except Exception as e:
        logger.error(
            "[Retriever] course_id=%s — LỖI truy vấn Qdrant: %s",
            course_id, e, exc_info=True,
        )
        raise RuntimeError(f"Lỗi truy vấn Vector Store: {e}") from e

    results = []
    for hit in hits:
        payload = hit.payload or {}
        results.append({
            "content": payload.get("content", ""),
            "title": payload.get("title", ""),
            "source_type": payload.get("source_type", ""),
            "lesson_id": payload.get("lesson_id"),
            "material_id": payload.get("material_id"),
            "page_number": payload.get("page_number"),
            "score": round(hit.score, 3) if hit.score is not None else 0.0
        })

    if results:
        logger.info(
            "[Retriever] course_id=%s — tìm thấy %d chunks, scores: %s",
            course_id, len(results), [r["score"] for r in results],
        )
    else:
        logger.warning(
            "[Retriever] course_id=%s lesson_id=%s — KHÔNG tìm thấy chunk nào.",
            course_id, lesson_id,
        )

    return results
