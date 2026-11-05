from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.models.schemas import ChatRequest, ChatResponse, TranscriptIngestRequest, IngestResponse
from app.services.document_service import extract_text_from_pdf, extract_text_from_txt
from app.rag.rag_service import RAGService

router =  APIRouter(prefix="/api", tags=["Mentor Chat & Ingestion"])

@router.post("/chat", response_model=ChatResponse)
async def chat_in_course(req: ChatRequest):
    """Endpoint học viên đặt câu hỏi trong 1 khóa học cụ thể."""
    try:
        return RAGService.anwer_question(
            course_id=req.course_id,
            question=req.message,
            lesson_id=req.lesson_id,
            top_k=req.top_k
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcripts/ingest", response_model=IngestResponse)
async def ingest_transcript(req: TranscriptIngestRequest):
    """Endpoint nhận transcript video bài học(gọi từ .Net sau khi Whisper xong)"""
    try:
        total = RAGService.ingest_video_transcript(
            course_id=req.course_id,
            lesson_id=req.lesson_id,
            lesson_title=req.lesson_title,
            transcript_text=req.transcript_text
        )
        return IngestResponse(
            course_id=req.course_id,
            source_type="video_transcript",
            title=req.lesson_title,
            total_chunks=total,
            message=f"Đã lập chỉ mục {total} đoạn transcript cho bài học '{req.lesson_title}'"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/upload", response_model=IngestResponse)
async def upload_document(
    course_id: int = Form(...),
    lesson_id: Optional[int] = Form(None),
    file: UploadFile = File(...)
):
    """Upload và lập chỉ mục tệp PDF tài liệu của khóa học."""
    try:
        content = await file.read()
        filename = file.filename.lower()

        if filename.endswith(".pdf"):
            extracted_text = extract_text_from_pdf(content)
        elif filename.endswith((".txt", ".md")):
            extracted_text = extract_text_from_txt(content)
        else:
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file PDF, TXT hoặc MD")
        
        total = RAGService.ingest_document(
            course_id=course_id,
            filename=file.filename,
            content_text=extracted_text,
            lesson_id=lesson_id
        )
        return IngestResponse(
            course_id=course_id,
            source_type="document",
            title=file.filename,
            total_chunks=total,
            message=f"Đã lập chỉ mục {total} đoạn tìa liều từ file '{file.filename}'!"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))