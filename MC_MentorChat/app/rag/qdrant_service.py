import uuid
from typing import List, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, 
    Distance, 
    PointStruct, 
    PayloadSchemaType
)
from app.core.config import settings

# Kết nối Qdrant Server hoặc File lưu trữ cục bộ
if settings.QDRANT_URL and settings.QDRANT_URL.startswith("http"):
    qdrant_client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)
else:
    qdrant_client = QdrantClient(path="./qdrant_db")

def init_qdrant():
    """Khởi tạo Collection và tạo Payload Indexes cho các trường lọc."""
    collections = [c.name for c in qdrant_client.get_collections().collections]
    if settings.QDRANT_COLLECTION not in collections:
        qdrant_client.create_collection(
            collection_name=settings.QDRANT_COLLECTION,
            vectors_config=VectorParams(size=settings.VECTOR_SIZE, distance=Distance.COSINE),
        )
        # BẮT BUỘC: Index course_id để cô lập từng khóa học với tốc độ mili-giây
        qdrant_client.create_payload_index(
            collection_name=settings.QDRANT_COLLECTION,
            field_name="course_id",
            field_schema=PayloadSchemaType.INTEGER
        )
        # Index lesson_id để hỗ trợ lọc theo bài học cụ thể
        qdrant_client.create_payload_index(
            collection_name=settings.QDRANT_COLLECTION,
            field_name="lesson_id",
            field_schema=PayloadSchemaType.INTEGER
        )

def upsert_chunks(
    course_id: int,
    source_type: str,
    title: str,
    chunks: List[str],
    vectors: List[List[float]],
    lesson_id: Optional[int] = None
):
    """Lưu trữ danh sách vector và payload vào Qdrant."""
    points = []
    for idx, (chunk, vector) in enumerate(zip(chunks, vectors)):
        point = PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "course_id": int(course_id),
                "lesson_id": int(lesson_id) if lesson_id is not None else None,
                "source_type": source_type,
                "title": title,
                "content": chunk,
                "chunk_index": idx
            }
        )
        points.append(point)

    qdrant_client.upsert(
        collection_name=settings.QDRANT_COLLECTION,
        points=points
    )