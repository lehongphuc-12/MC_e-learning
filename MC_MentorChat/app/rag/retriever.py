import re
import logging
from typing import List, Dict, Any, Optional
from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchText
from app.core.config import settings
from app.rag.qdrant_service import qdrant_client
from app.rag.embeddings import generate_embedding

logger = logging.getLogger("mentorchat.retriever")

_VI_STOPWORDS = {
    "xin", "chào", "bạn", "ơi", "ạ", "nhé", "nha", "cho", "mình", "hỏi", "với", "tôi", "em", "anh", "chị",
    "là", "và", "của", "có", "được", "trong", "này", "đó", "kia", "ở", "đâu", "gì", "nào", "sao",
    "thế", "như", "thế nào", "làm sao", "cảm ơn", "thanks", "thank", "bye", "tạm biệt", "hello", "hi",
    "giúp", "hãy", "về", "cái", "con", "người", "biết", "hiểu"
}

_GREETINGS_REGEX = re.compile(
    r"^(xin chào|chào|hello|hi|hey|chào bạn|bạn là ai|bạn tên gì|khỏe không|tạm biệt|cảm ơn|thanks)[\s.?!]*$",
    re.IGNORECASE
)


def _clean_for_keyword(text: str) -> str:
    """Tách từ khóa đặc thù cho Full-text search, loại bỏ ký tự lạ và hư từ."""
    cleaned = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE).lower()
    tokens = [t for t in cleaned.split() if len(t) > 1 and t not in _VI_STOPWORDS]
    return " ".join(tokens)


def _is_conversational_smalltalk(text: str) -> bool:
    """Nhận diện câu hỏi xã giao, chào hỏi để không tìm kiếm từ khóa giả mạo."""
    t = text.strip().lower()
    if _GREETINGS_REGEX.match(t):
        return True
    tokens = t.split()
    return len(tokens) <= 3 and all(tok in _VI_STOPWORDS for tok in tokens)


def retrieve_course_chunks(
    course_id: int, 
    query: str, 
    lesson_id: Optional[int] = None, 
    top_k: int = 4
) -> List[Dict[str, Any]]:
    """
    Hybrid Search (Dense Vector + Full-Text Keyword Match + RRF Fusion) kết hợp Score Threshold.
    
    1. Dense Search: Truy vấn tương đồng ngữ nghĩa bằng embedding câu hỏi, áp dụng
       score_threshold = settings.MIN_RELEVANCE_SCORE (0.48) để loại bỏ nhiễu.
    2. Keyword Search: Dùng Qdrant Full-Text MatchText trên trường 'content' để bắt chính xác
       thuật ngữ chuyên ngành MC ("cột hơi", "khẩu hình miệng", "prompter", "cue card") và
       số bài/chương ("Bài 1", "Chương 2").
    3. RRF (Reciprocal Rank Fusion): Kết hợp xếp hạng đa chiều với hằng số K=60.
    4. Guardrail: Nếu câu hỏi ngoài lề hoặc không chunk nào vượt ngưỡng, trả về [] (không trích dẫn giả).
    """
    safe_top_k = max(1, min(12, top_k))

    logger.info(
        "[Retriever/Hybrid] course_id=%s lesson_id=%s top_k=%d (threshold=%.2f) — Bắt đầu tìm kiếm: '%.100s'",
        course_id, lesson_id, safe_top_k, settings.MIN_RELEVANCE_SCORE, query,
    )

    # 1. Tạo Query Vector (task_type=RETRIEVAL_QUERY)
    try:
        query_vector = generate_embedding(query, task_type="RETRIEVAL_QUERY")
    except Exception as e:
        logger.error(
            "[Retriever] course_id=%s — LỖI tạo query embedding: %s",
            course_id, e, exc_info=True,
        )
        raise RuntimeError(f"Không thể tạo embedding cho câu hỏi: {e}") from e

    # 2. Xây dựng bộ lọc bắt buộc theo course_id (và lesson_id nếu có)
    must_conditions = [
        FieldCondition(
            key="course_id",
            match=MatchValue(value=int(course_id))
        )
    ]
    if lesson_id is not None:
        must_conditions.append(
            FieldCondition(
                key="lesson_id",
                match=MatchValue(value=int(lesson_id))
            )
        )
        logger.info("[Retriever] course_id=%s — Lọc theo phạm vi lesson_id=%s.", course_id, lesson_id)

    dense_filter = Filter(must=must_conditions)

    # 3. Dense Vector Search với score_threshold
    dense_hits = []
    try:
        if hasattr(qdrant_client, "query_points"):
            search_res = qdrant_client.query_points(
                collection_name=settings.QDRANT_COLLECTION,
                query=query_vector,
                query_filter=dense_filter,
                limit=safe_top_k * 2,
                score_threshold=settings.MIN_RELEVANCE_SCORE,
            )
            dense_hits = search_res.points
        else:
            dense_hits = qdrant_client.search(
                collection_name=settings.QDRANT_COLLECTION,
                query_vector=query_vector,
                query_filter=dense_filter,
                limit=safe_top_k * 2,
                score_threshold=settings.MIN_RELEVANCE_SCORE,
            )
        logger.info(
            "[Retriever/Dense] course_id=%s — Tìm thấy %d điểm vượt ngưỡng score_threshold=%.2f",
            course_id, len(dense_hits), settings.MIN_RELEVANCE_SCORE,
        )
    except Exception as e:
        logger.warning("[Retriever/Dense] course_id=%s — Cảnh báo khi tìm kiếm dense: %s", course_id, e)

    # 4. Sparse / Full-Text Keyword Search (nếu không phải câu hỏi xã giao)
    kw_hits = []
    clean_kw = _clean_for_keyword(query)
    is_smalltalk = _is_conversational_smalltalk(query)

    if clean_kw and not is_smalltalk:
        try:
            kw_conditions = list(must_conditions)
            kw_conditions.append(
                FieldCondition(
                    key="content",
                    match=MatchText(text=clean_kw)
                )
            )
            kw_filter = Filter(must=kw_conditions)
            scroll_res, _ = qdrant_client.scroll(
                collection_name=settings.QDRANT_COLLECTION,
                scroll_filter=kw_filter,
                limit=safe_top_k * 2,
                with_payload=True
            )
            kw_hits = scroll_res or []
            logger.info(
                "[Retriever/Keyword] course_id=%s — Tìm thấy %d điểm khớp từ khóa '%s'",
                course_id, len(kw_hits), clean_kw,
            )
        except Exception as e:
            logger.debug("[Retriever/Keyword] Không thực hiện được full-text search: %s", e)

    # 5. Guardrail: Nếu không có kết quả từ cả Dense lẫn Keyword (hoặc là câu chào hỏi đơn thuần)
    if not dense_hits and not kw_hits:
        logger.info(
            "[Retriever/Guardrail] course_id=%s — Không có chunk liên quan (dense=0, kw=0, smalltalk=%s). Trả về [].",
            course_id, is_smalltalk,
        )
        return []

    # 6. Reciprocal Rank Fusion (RRF) để kết hợp Dense & Keyword
    RRF_K = 60.0
    rrf_scores: Dict[str, float] = {}
    point_payloads: Dict[str, Dict[str, Any]] = {}
    dense_score_map: Dict[str, float] = {}

    for rank, hit in enumerate(dense_hits):
        pid = str(hit.id)
        point_payloads[pid] = hit.payload or {}
        dense_score_map[pid] = float(hit.score) if hit.score is not None else 0.0
        rrf_scores[pid] = rrf_scores.get(pid, 0.0) + (1.0 / (RRF_K + rank + 1.0))

    for rank, hit in enumerate(kw_hits):
        pid = str(hit.id)
        point_payloads[pid] = hit.payload or {}
        rrf_scores[pid] = rrf_scores.get(pid, 0.0) + (1.0 / (RRF_K + rank + 1.0))

    sorted_pids = sorted(rrf_scores.keys(), key=lambda k: rrf_scores[k], reverse=True)

    results = []
    for pid in sorted_pids[:safe_top_k]:
        payload = point_payloads[pid]
        raw_score = dense_score_map.get(pid)
        display_score = round(raw_score, 3) if raw_score is not None else round(rrf_scores[pid] * 50.0, 3)

        results.append({
            "content": payload.get("content", ""),
            "title": payload.get("title", ""),
            "source_type": payload.get("source_type", ""),
            "lesson_id": payload.get("lesson_id"),
            "material_id": payload.get("material_id"),
            "page_number": payload.get("page_number"),
            "score": display_score
        })

    logger.info(
        "[Retriever/Hybrid] course_id=%s — Trả về %d chunks sau RRF, top score: %s",
        course_id, len(results), [r["score"] for r in results],
    )
    return results
