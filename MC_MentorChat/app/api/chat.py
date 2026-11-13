import logging
import traceback
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.models.schemas import ChatRequest, ChatResponse, TranscriptIngestRequest, IngestResponse
from app.services.document_service import extract_text_from_pdf, extract_text_from_txt
from app.rag.rag_service import RAGService

logger = logging.getLogger("mentorchat.api")

router = APIRouter(prefix="/api", tags=["Mentor Chat & Ingestion"])

# ---------------------------------------------------------------------------
# POST /api/chat  — Học viên đặt câu hỏi
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat_in_course(req: ChatRequest):
    """Endpoint học viên đặt câu hỏi trong 1 khóa học cụ thể."""
    logger.info(
        "[Chat] course_id=%s lesson_id=%s | câu hỏi: %.120s",
        req.course_id, req.lesson_id, req.message,
    )

    if not req.message or not req.message.strip():
        logger.warning("[Chat] course_id=%s — câu hỏi rỗng, từ chối request.", req.course_id)
        raise HTTPException(status_code=422, detail="Câu hỏi không được để trống.")

    try:
        result = RAGService.anwer_question(
            course_id=req.course_id,
            question=req.message,
            lesson_id=req.lesson_id,
            top_k=req.top_k
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
async def ingest_transcript(req: TranscriptIngestRequest):
    """Endpoint nhận transcript video bài học (gọi từ .Net sau khi Whisper xong)"""
    logger.info(
        "[Ingest/Transcript] course_id=%s lesson_id=%s title='%s' | %d ký tự transcript.",
        req.course_id, req.lesson_id, req.lesson_title, len(req.transcript_text),
    )

    if not req.transcript_text or not req.transcript_text.strip():
        logger.warning(
            "[Ingest/Transcript] course_id=%s lesson_id=%s — transcript rỗng, bỏ qua.",
            req.course_id, req.lesson_id,
        )
        raise HTTPException(status_code=422, detail="Nội dung transcript không được để trống.")

    try:
        total = RAGService.ingest_video_transcript(
            course_id=req.course_id,
            lesson_id=req.lesson_id,
            lesson_title=req.lesson_title,
            transcript_text=req.transcript_text
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
    file: UploadFile = File(...),
):
    """Upload và lập chỉ mục tệp PDF tài liệu của khóa học."""
    logger.info(
        "[Ingest/Document] course_id=%s lesson_id=%s | file='%s' content_type='%s'.",
        course_id, lesson_id, file.filename, file.content_type,
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

    # --- Trích xuất văn bản ---
    try:
        if filename_lower.endswith(".pdf"):
            extracted_text = extract_text_from_pdf(content)
            logger.info(
                "[Ingest/Document] course_id=%s — trích xuất PDF '%s': %d ký tự.",
                course_id, file.filename, len(extracted_text),
            )
        else:
            extracted_text = extract_text_from_txt(content)
            logger.info(
                "[Ingest/Document] course_id=%s — đọc TXT/MD '%s': %d ký tự.",
                course_id, file.filename, len(extracted_text),
            )
    except Exception as e:
        logger.error(
            "[Ingest/Document] course_id=%s — LỖI trích xuất nội dung từ '%s': %s",
            course_id, file.filename, e, exc_info=True,
        )
        raise HTTPException(
            status_code=422,
            detail=f"Không thể đọc nội dung file '{file.filename}'. File có thể bị hỏng hoặc được mã hóa: {e}",
        )

    if not extracted_text or not extracted_text.strip():
        logger.warning(
            "[Ingest/Document] course_id=%s — không trích xuất được văn bản từ '%s'.",
            course_id, file.filename,
        )
        raise HTTPException(
            status_code=422,
            detail=f"File '{file.filename}' không có văn bản để lập chỉ mục (PDF có thể chỉ chứa ảnh scan).",
        )

    # --- Lập chỉ mục vào Qdrant ---
    try:
        total = RAGService.ingest_document(
            course_id=course_id,
            filename=file.filename,
            content_text=extracted_text,
            lesson_id=lesson_id
        )
        logger.info(
            "[Ingest/Document] course_id=%s — đã lập chỉ mục %d đoạn từ '%s'.",
            course_id, total, file.filename,
        )
        return IngestResponse(
            course_id=course_id,
            source_type="document",
            title=file.filename,
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
