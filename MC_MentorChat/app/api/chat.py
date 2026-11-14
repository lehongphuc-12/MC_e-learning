import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header, Depends
from starlette.concurrency import run_in_threadpool
from app.core.config import settings
from app.models.schemas import (
    ChatRequest, 
    ChatResponse, 
    TranscriptIngestRequest, 
    IngestResponse,
    KnowledgeDeleteResponse,
)
from app.services.document_service import (
    extract_pages_from_pdf, 
    extract_text_from_txt, 
    extract_text_from_pdf
)
from app.rag.rag_service import RAGService
from app.rag.qdrant_service import delete_knowledge_points

logger = logging.getLogger("mentorchat.api")

router = APIRouter(prefix="/api", tags=["Mentor Chat & Ingestion"])


def verify_internal_api_key(
    x_internal_api_key: Optional[str] = Header(None, alias="X-Internal-Api-Key")
):
    """
    Xác thực bảo mật nội bộ giữa MC_BE và MC_MentorChat.
    Nếu cấu hình INTERNAL_API_KEY trong hệ thống, bắt buộc header X-Internal-Api-Key phải khớp.
    """
    expected_key = (settings.INTERNAL_API_KEY or "").strip()
    if not expected_key:
        return

    if not x_internal_api_key or x_internal_api_key.strip() != expected_key:
        logger.warning("[Security] Yêu cầu bị từ chối do header X-Internal-Api-Key không hợp lệ hoặc thiếu.")
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Header X-Internal-Api-Key không hợp lệ hoặc bị thiếu.",
        )


# ---------------------------------------------------------------------------
# POST /api/chat  — Học viên đặt câu hỏi
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat_in_course(
    req: ChatRequest,
    _ = Depends(verify_internal_api_key),
):
    """Endpoint học viên đặt câu hỏi trong 1 khóa học cụ thể."""
    logger.info(
        "[Chat] course_id=%s lesson_id=%s top_k=%d | câu hỏi: %.120s",
        req.course_id, req.lesson_id, req.top_k, req.message,
    )

    if not req.message or not req.message.strip():
        logger.warning("[Chat] course_id=%s — câu hỏi rỗng, từ chối request.", req.course_id)
        raise HTTPException(status_code=422, detail="Câu hỏi không được để trống.")

    try:
        # run_in_threadpool: đẩy toàn bộ pipeline RAG (Qdrant query + LLM call)
        # sang thread pool — event loop không bị block, các request khác xử lý song song
        result = await run_in_threadpool(
            RAGService.answer_question,
            req.course_id,
            req.message,
            req.lesson_id,
            req.top_k,
            req.provider,
        )
        logger.info(
            "[Chat] course_id=%s — trả lời thành công, %d nguồn được trích dẫn.",
            req.course_id, len(result.sources),
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "[Chat] course_id=%s — LỖI xử lý câu hỏi: %s",
            req.course_id, e, exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Không thể tạo câu trả lời từ AI Mentor: {e}",
        )


# ---------------------------------------------------------------------------
# POST /api/transcripts/ingest  — Nhận transcript từ .NET sau Whisper
# ---------------------------------------------------------------------------
@router.post("/transcripts/ingest", response_model=IngestResponse)
async def ingest_transcript(
    req: TranscriptIngestRequest,
    _ = Depends(verify_internal_api_key),
):
    """Endpoint nhận transcript video bài học (gọi từ .Net sau khi Whisper xong)"""
    logger.info(
        "[Ingest/Transcript] course_id=%s lesson_id=%s title='%s' | %d ký tự transcript.",
        req.course_id, req.lesson_id, req.lesson_title, len(req.transcript_text) if req.transcript_text else 0,
    )

    if not req.transcript_text or not req.transcript_text.strip():
        logger.warning(
            "[Ingest/Transcript] course_id=%s lesson_id=%s — transcript rỗng, bỏ qua.",
            req.course_id, req.lesson_id,
        )
        raise HTTPException(status_code=422, detail="Nội dung transcript không được để trống.")

    try:
        # Embedding + Qdrant upsert đều là blocking I/O → chạy trong thread pool
        total = await run_in_threadpool(
            RAGService.ingest_video_transcript,
            req.course_id,
            req.lesson_id,
            req.lesson_title,
            req.transcript_text,
        )
        logger.info(
            "[Ingest/Transcript] course_id=%s lesson_id=%s — đã lập chỉ mục %d đoạn.",
            req.course_id, req.lesson_id, total,
        )
        return IngestResponse(
            course_id=req.course_id,
            source_type="video_transcript",
            title=req.lesson_title,
            total_chunks=total,
            message=f"Đã lập chỉ mục {total} đoạn transcript cho bài học '{req.lesson_title}'"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "[Ingest/Transcript] course_id=%s lesson_id=%s — LỖI lập chỉ mục transcript: %s",
            req.course_id, req.lesson_id, e, exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi lập chỉ mục transcript bài học '{req.lesson_title}': {e}",
        )


# ---------------------------------------------------------------------------
# POST /api/documents/upload  — Upload và lập chỉ mục tài liệu PDF/TXT/MD
# ---------------------------------------------------------------------------
@router.post("/documents/upload", response_model=IngestResponse)
async def upload_document(
    course_id: int = Form(...),
    lesson_id: Optional[int] = Form(None),
    material_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    _ = Depends(verify_internal_api_key),
):
    """Upload và lập chỉ mục tệp PDF tài liệu của khóa học kèm metadata (page_number, material_id)."""
    logger.info(
        "[Ingest/Document] course_id=%s lesson_id=%s material_id=%s | file='%s' content_type='%s'.",
        course_id, lesson_id, material_id, file.filename, file.content_type,
    )

    # --- Kiểm tra định dạng file ---
    filename_lower = (file.filename or "").lower()
    if not filename_lower.endswith((".pdf", ".txt", ".md")):
        logger.warning(
            "[Ingest/Document] course_id=%s — file '%s' không được hỗ trợ.",
            course_id, file.filename,
        )
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng file '{file.filename}' không được hỗ trợ. Chỉ chấp nhận PDF, TXT hoặc MD.",
        )

    try:
        content = await file.read()
    except Exception as e:
        logger.error(
            "[Ingest/Document] course_id=%s — LỖI đọc file '%s': %s",
            course_id, file.filename, e, exc_info=True,
        )
        raise HTTPException(status_code=400, detail=f"Không thể đọc file tải lên: {e}")

    if not content:
        logger.warning("[Ingest/Document] course_id=%s — file '%s' rỗng.", course_id, file.filename)
        raise HTTPException(status_code=422, detail="File tải lên không có nội dung.")

    # --- Trích xuất văn bản / trang ---
    try:
        pages: Optional[List[Dict[str, Any]]] = None
        extracted_text: Optional[str] = None

        if filename_lower.endswith(".pdf"):
            pages = await run_in_threadpool(extract_pages_from_pdf, content)
            total_text_len = sum(len(p.get("text", "")) for p in pages)
            logger.info(
                "[Ingest/Document] course_id=%s — trích xuất PDF '%s': %d trang, %d ký tự.",
                course_id, file.filename, len(pages), total_text_len,
            )
            if not pages or total_text_len == 0:
                raise ValueError("PDF không chứa văn bản nào có thể trích xuất (có thể là file ảnh scan).")
        else:
            extracted_text = await run_in_threadpool(extract_text_from_txt, content)
            logger.info(
                "[Ingest/Document] course_id=%s — đọc TXT/MD '%s': %d ký tự.",
                course_id, file.filename, len(extracted_text),
            )
            if not extracted_text or not extracted_text.strip():
                raise ValueError("Tập tin văn bản rỗng.")
    except Exception as e:
        logger.error(
            "[Ingest/Document] course_id=%s — LỖI trích xuất nội dung từ '%s': %s",
            course_id, file.filename, e, exc_info=True,
        )
        raise HTTPException(
            status_code=422,
            detail=f"Không thể đọc nội dung file '{file.filename}': {e}",
        )

    # --- Lập chỉ mục vào Qdrant ---
    try:
        # Embedding + Qdrant upsert đều là blocking I/O → chạy trong thread pool
        total = await run_in_threadpool(
            RAGService.ingest_document,
            course_id=course_id,
            filename=file.filename or "document",
            pages=pages,
            content_text=extracted_text,
            lesson_id=lesson_id,
            material_id=material_id,
        )
        logger.info(
            "[Ingest/Document] course_id=%s — đã lập chỉ mục %d đoạn từ '%s'.",
            course_id, total, file.filename,
        )
        return IngestResponse(
            course_id=course_id,
            source_type="document",
            title=file.filename or "document",
            total_chunks=total,
            message=f"Đã lập chỉ mục {total} đoạn tài liệu từ file '{file.filename}'!"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "[Ingest/Document] course_id=%s — LỖI lập chỉ mục '%s' vào Qdrant: %s",
            course_id, file.filename, e, exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi lập chỉ mục tài liệu '{file.filename}' vào Vector Store: {e}",
        )


# ---------------------------------------------------------------------------
# DELETE /api/knowledge  — Xóa vector kiến thức (Lifecycle Sync)
# ---------------------------------------------------------------------------
@router.delete("/knowledge", response_model=KnowledgeDeleteResponse)
async def delete_knowledge(
    course_id: int,
    lesson_id: Optional[int] = None,
    material_id: Optional[int] = None,
    source_type: Optional[str] = None,
    _ = Depends(verify_internal_api_key),
):
    """
    Endpoint dọn vector trong Qdrant theo course_id và bộ lọc tùy chọn:
    - lesson_id: Xóa toàn bộ vector của bài học (hoặc video transcript cụ thể)
    - material_id: Xóa vector của tài liệu cụ thể
    - source_type: Lọc thêm theo 'video_transcript' hoặc 'document'
    """
    logger.info(
        "[Knowledge/Delete] course_id=%s lesson_id=%s material_id=%s source_type=%s",
        course_id, lesson_id, material_id, source_type,
    )

    try:
        success = await run_in_threadpool(
            delete_knowledge_points,
            course_id=course_id,
            lesson_id=lesson_id,
            material_id=material_id,
            source_type=source_type,
        )
        return KnowledgeDeleteResponse(
            course_id=course_id,
            lesson_id=lesson_id,
            material_id=material_id,
            source_type=source_type,
            deleted=success,
            message=f"Đã dọn dẹp vector trong Vector Store cho Course {course_id} thành công.",
        )
    except Exception as e:
        logger.error(
            "[Knowledge/Delete] Lỗi khi dọn vector cho Course %s: %s",
            course_id, e, exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi dọn vector trong Vector Store: {e}",
        )
