import logging
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

logger = logging.getLogger("mentorchat.qdrant")


def create_qdrant_client() -> QdrantClient:
    """Tự động kết nối Qdrant Server hoặc fallback sang file cục bộ ./qdrant_db."""
    if settings.QDRANT_URL and settings.QDRANT_URL.startswith("http"):
        logger.info("[Qdrant] Đang kết nối tới Qdrant server: %s", settings.QDRANT_URL)
        try:
            client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None, timeout=3)
            # Test ping
            client.get_collections()
            logger.info("[Qdrant] Kết nối Qdrant server thành công: %s", settings.QDRANT_URL)
            return client
        except Exception as e:
            logger.warning(
                "[Qdrant] Không thể kết nối tới '%s': %s. Tự động chuyển sang lưu trữ cục bộ './qdrant_db'.",
                settings.QDRANT_URL, e,
            )
            return QdrantClient(path="./qdrant_db")
    logger.info("[Qdrant] Không có QDRANT_URL, sử dụng lưu trữ cục bộ './qdrant_db'.")
    return QdrantClient(path="./qdrant_db")


qdrant_client = create_qdrant_client()


def init_qdrant():
    """Khởi tạo Collection và tạo Payload Indexes cho các trường lọc."""
    logger.info("[Qdrant/Init] Kiểm tra collection '%s'...", settings.QDRANT_COLLECTION)
    try:
        collections = [c.name for c in qdrant_client.get_collections().collections]
    except Exception as e:
        logger.error("[Qdrant/Init] Không thể liệt kê collections: %s", e, exc_info=True)
        raise

    if settings.QDRANT_COLLECTION not in collections:
        logger.info(
            "[Qdrant/Init] Collection '%s' chưa tồn tại — đang tạo mới (vector_size=%d, metric=COSINE)...",
            settings.QDRANT_COLLECTION, settings.VECTOR_SIZE,
        )
        try:
            qdrant_client.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=VectorParams(size=settings.VECTOR_SIZE, distance=Distance.COSINE),
            )
        except Exception as e:
            logger.error(
                "[Qdrant/Init] Tạo collection '%s' thất bại: %s",
                settings.QDRANT_COLLECTION, e, exc_info=True,
            )
            raise

        # BẮT BUỘC: Index course_id để cô lập từng khóa học với tốc độ mili-giây
        for field_name in ("course_id", "lesson_id"):
            try:
                qdrant_client.create_payload_index(
                    collection_name=settings.QDRANT_COLLECTION,
                    field_name=field_name,
                    field_schema=PayloadSchemaType.INTEGER
                )
                logger.info("[Qdrant/Init] Payload index tạo thành công: field='%s'.", field_name)
            except Exception as e:
                logger.error(
                    "[Qdrant/Init] Tạo payload index field='%s' thất bại: %s",
                    field_name, e, exc_info=True,
                )
                raise

        logger.info("[Qdrant/Init] Collection '%s' đã được khởi tạo đầy đủ.", settings.QDRANT_COLLECTION)
    else:
        logger.info("[Qdrant/Init] Collection '%s' đã tồn tại, bỏ qua khởi tạo.", settings.QDRANT_COLLECTION)


def upsert_chunks(
    course_id: int,
    source_type: str,
    title: str,
    chunks: List[str],
    vectors: List[List[float]],
    lesson_id: Optional[int] = None
):
    """Lưu trữ danh sách vector và payload vào Qdrant."""
    if len(chunks) != len(vectors):
        logger.error(
            "[Qdrant/Upsert] Số lượng chunks (%d) và vectors (%d) không khớp — hủy upsert.",
            len(chunks), len(vectors),
        )
        raise ValueError(f"Số chunk ({len(chunks)}) và vector ({len(vectors)}) không khớp.")

    logger.info(
        "[Qdrant/Upsert] course_id=%s source_type='%s' title='%s' — chuẩn bị upsert %d điểm...",
        course_id, source_type, title, len(chunks),
    )

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

    try:
        qdrant_client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=points
        )
        logger.info(
            "[Qdrant/Upsert] HOÀN TẤT: %d điểm đã được upsert vào collection '%s'.",
            len(points), settings.QDRANT_COLLECTION,
        )
    except Exception as e:
        logger.error(
            "[Qdrant/Upsert] LỖI upsert %d điểm vào collection '%s': %s",
            len(points), settings.QDRANT_COLLECTION, e, exc_info=True,
        )
        raise
