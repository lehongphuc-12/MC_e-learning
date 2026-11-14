import logging
import uuid
from typing import List, Optional, Any, Dict, Union
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, 
    Distance, 
    PointStruct, 
    PayloadSchemaType,
    Filter,
    FieldCondition,
    MatchValue,
    FilterSelector,
)
from app.core.config import settings
from app.rag.chunker import ChunkItem

logger = logging.getLogger("mentorchat.qdrant")

_NAMESPACE_UUID = uuid.uuid5(uuid.NAMESPACE_DNS, "mseek.e-learning.mentorchat")


def create_qdrant_client() -> QdrantClient:
    """Tự động kết nối Qdrant Server hoặc fallback sang file cục bộ ./qdrant_db."""
    if settings.QDRANT_URL and settings.QDRANT_URL.startswith("http"):
        logger.info("[Qdrant] Đang kết nối tới Qdrant server: %s", settings.QDRANT_URL)
        try:
            client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None, timeout=5)
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


def ensure_payload_indexes():
    """
    Tạo Payload Indexes một cách idempotent bất kể collection mới tạo hay đã tồn tại.
    Hỗ trợ lọc tốc độ cao theo: course_id, lesson_id, material_id, source_type.
    """
    logger.info("[Qdrant/Indexes] Đảm bảo các Payload Indexes cho collection '%s'...", settings.QDRANT_COLLECTION)
    index_fields = [
        ("course_id", PayloadSchemaType.INTEGER),
        ("lesson_id", PayloadSchemaType.INTEGER),
        ("material_id", PayloadSchemaType.INTEGER),
        ("source_type", PayloadSchemaType.KEYWORD),
    ]

    for field_name, schema_type in index_fields:
        try:
            qdrant_client.create_payload_index(
                collection_name=settings.QDRANT_COLLECTION,
                field_name=field_name,
                field_schema=schema_type
            )
            logger.info("[Qdrant/Indexes] Tạo/xác nhận payload index: field='%s' (%s).", field_name, schema_type)
        except Exception as e:
            msg = str(e).lower()
            if "already exists" in msg or "acknowledged" in msg:
                logger.debug("[Qdrant/Indexes] Payload index field='%s' đã tồn tại sẵn.", field_name)
            else:
                logger.warning("[Qdrant/Indexes] Thông báo khi tạo payload index '%s': %s", field_name, e)


def init_qdrant():
    """Khởi tạo Collection nếu chưa có, và LUÔN chạy ensure_payload_indexes() idempotent."""
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
            logger.info("[Qdrant/Init] Đã tạo collection '%s'.", settings.QDRANT_COLLECTION)
        except Exception as e:
            logger.error("[Qdrant/Init] Tạo collection '%s' thất bại: %s", settings.QDRANT_COLLECTION, e, exc_info=True)
            raise
    else:
        logger.info("[Qdrant/Init] Collection '%s' đã tồn tại.", settings.QDRANT_COLLECTION)

    # Idempotent: chạy tạo indexes bất kể collection mới tạo hay đã có từ trước
    ensure_payload_indexes()


def delete_knowledge_points(
    course_id: int,
    lesson_id: Optional[int] = None,
    material_id: Optional[int] = None,
    source_type: Optional[str] = None,
    title: Optional[str] = None,
) -> bool:
    """
    Xóa các vector points trong Qdrant theo tiêu chí lọc kết hợp.
    Dùng cho Lifecycle Sync khi xóa Bài học, Video hoặc Tài liệu.
    """
    must_conditions = [
        FieldCondition(
            key="course_id",
            match=MatchValue(value=int(course_id))
        )
    ]

    if lesson_id is not None:
        must_conditions.append(
            FieldCondition(key="lesson_id", match=MatchValue(value=int(lesson_id)))
        )

    if material_id is not None:
        must_conditions.append(
            FieldCondition(key="material_id", match=MatchValue(value=int(material_id)))
        )

    if source_type is not None:
        must_conditions.append(
            FieldCondition(key="source_type", match=MatchValue(value=str(source_type)))
        )

    if title is not None:
        must_conditions.append(
            FieldCondition(key="title", match=MatchValue(value=str(title)))
        )

    filter_obj = Filter(must=must_conditions)
    logger.info(
        "[Qdrant/Delete] Xóa kiến thức: course_id=%s, lesson_id=%s, material_id=%s, source_type=%s, title=%s",
        course_id, lesson_id, material_id, source_type, title,
    )

    try:
        qdrant_client.delete(
            collection_name=settings.QDRANT_COLLECTION,
            points_selector=FilterSelector(filter=filter_obj),
        )
        logger.info("[Qdrant/Delete] Đã gửi lệnh xóa points thành công.")
        return True
    except Exception as e:
        logger.error("[Qdrant/Delete] Lỗi khi xóa points: %s", e, exc_info=True)
        raise


def upsert_chunks(
    course_id: int,
    source_type: str,
    title: str,
    chunks: Union[List[str], List[ChunkItem]],
    vectors: List[List[float]],
    lesson_id: Optional[int] = None,
    material_id: Optional[int] = None,
) -> int:
    """
    Lưu trữ danh sách vector và payload vào Qdrant với tính Idempotency & Lifecycle Sync:
    1. Xóa các vector cũ cùng (course_id, lesson_id/material_id, source_type) trước khi nạp mới.
    2. Dùng deterministic UUIDv5 theo (course_id, source_type, id/title, chunk_index) tránh nhân bản.
    3. Lưu metadata: page_number, material_id.
    """
    if len(chunks) != len(vectors):
        logger.error(
            "[Qdrant/Upsert] Số lượng chunks (%d) và vectors (%d) không khớp — hủy upsert.",
            len(chunks), len(vectors),
        )
        raise ValueError(f"Số chunk ({len(chunks)}) và vector ({len(vectors)}) không khớp.")

    if not chunks:
        logger.warning("[Qdrant/Upsert] Không có chunk nào để upsert.")
        return 0

    # BƯỚC 1: Dọn dẹp các điểm cũ cùng phạm vi để tránh phân mảnh và dữ liệu thừa
    try:
        if material_id is not None:
            delete_knowledge_points(course_id=course_id, material_id=material_id)
        elif lesson_id is not None:
            delete_knowledge_points(course_id=course_id, lesson_id=lesson_id, source_type=source_type)
        else:
            delete_knowledge_points(course_id=course_id, source_type=source_type, title=title)
    except Exception as del_err:
        logger.warning("[Qdrant/Upsert] Cảnh báo khi dọn điểm cũ (tiếp tục upsert): %s", del_err)

    # BƯỚC 2: Chuẩn bị points với Deterministic UUIDv5
    points: List[PointStruct] = []
    scope_key = str(material_id) if material_id is not None else (str(lesson_id) if lesson_id is not None else title)

    for idx, (chunk_data, vector) in enumerate(zip(chunks, vectors)):
        if isinstance(chunk_data, ChunkItem):
            content = chunk_data.content
            chunk_idx = chunk_data.chunk_index
            page_number = chunk_data.page_number
        else:
            content = str(chunk_data)
            chunk_idx = idx
            page_number = None

        # Deterministic UUIDv5: bảo đảm trùng lặp hoàn toàn sẽ sinh đúng ID này
        point_id_seed = f"{course_id}:{source_type}:{scope_key}:{chunk_idx}"
        point_id = str(uuid.uuid5(_NAMESPACE_UUID, point_id_seed))

        payload: Dict[str, Any] = {
            "course_id": int(course_id),
            "lesson_id": int(lesson_id) if lesson_id is not None else None,
            "material_id": int(material_id) if material_id is not None else None,
            "source_type": source_type,
            "title": title,
            "content": content,
            "chunk_index": chunk_idx,
            "page_number": page_number,
        }

        points.append(
            PointStruct(
                id=point_id,
                vector=vector,
                payload=payload,
            )
        )

    # BƯỚC 3: Upsert vào Qdrant
    try:
        qdrant_client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=points
        )
        logger.info(
            "[Qdrant/Upsert] HOÀN TẤT: %d điểm (UUIDv5) đã được upsert vào '%s' cho course_id=%s.",
            len(points), settings.QDRANT_COLLECTION, course_id,
        )
        return len(points)
    except Exception as e:
        logger.error(
            "[Qdrant/Upsert] LỖI upsert %d điểm vào collection '%s': %s",
            len(points), settings.QDRANT_COLLECTION, e, exc_info=True,
        )
        raise
