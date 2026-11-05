from typing import List, Dict, Any, Optional
from qdrant_client.models import Filter, FieldCondition, MatchValue
from app.core.config import settings
from app.rag.qdrant_service import qdrant_client
from app.rag.embeddings import generate_embedding

def retrieve_course_chunks(
    course_id: int, 
    query: str, 
    lesson_id: Optional[int] = None, 
    top_k: int = 4
) -> List[Dict[str, Any]]:
    """
    Tìm kiếm đoạn kiến thức tương đồng ngữ nghĩa.
    Khóa cứng bộ lọc course_id để tuyệt đối không lấy nhầm khóa khác.
    """
    query_vector = generate_embedding(query)

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

    search_result = qdrant_client.search(
        collection_name=settings.QDRANT_COLLECTION,
        query_vector=query_vector,
        query_filter=Filter(must=must_conditions),
        limit=top_k
    )

    results = []
    for hit in search_result:
        results.append({
            "content": hit.payload.get("content", ""),
            "title": hit.payload.get("title", ""),
            "source_type": hit.payload.get("source_type", ""),
            "lesson_id": hit.payload.get("lesson_id"),
            "score": round(hit.score, 3)
        })

    return results