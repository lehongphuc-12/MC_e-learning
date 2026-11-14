from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# --- Dành cho Endpoint Hỏi Đáp (Chat) ---
class ChatRequest(BaseModel):
    course_id: int = Field(..., description="ID khóa học hiện tại (bắt buộc để cô lập RAG)")
    message: str = Field(..., description="Nội dung câu hỏi của học viên")
    lesson_id: Optional[int] = Field(default=None, description="ID bài học cụ thể nếu muốn hỏi riêng trong bài đó")
    top_k: int = Field(default=4, ge=1, le=12, description="Số lượng đoạn kiến thức liên quan cần trích xuất (1-12)")
    provider: Optional[Literal["aiportalapi", "portal", "gemini", "hybrid"]] = Field(
        default=None,
        description="Ghi đè LLM provider cho request này. None → dùng LLM_PROVIDER trong .env"
    )


class SourceItem(BaseModel):
    source_type: str = Field(..., description="'video_transcript' hoặc 'document'")
    title: str = Field(..., description="Tiêu đề bài học hoặc tên file tài liệu")
    lesson_id: Optional[int] = Field(default=None, description="ID bài học nếu có")
    material_id: Optional[int] = Field(default=None, description="ID tài liệu nếu có")
    page_number: Optional[int] = Field(default=None, description="Số trang trong tài liệu PDF")
    snippet: str = Field(..., description="Nội dung tóm lược làm dẫn chứng")
    score: float = Field(..., description="Độ khớp tương đồng ngữ nghĩa")


class ChatResponse(BaseModel):
    answer: str
    course_id: int
    sources: List[SourceItem]


# --- Dành cho Nạp Video Transcript ---
class TranscriptIngestRequest(BaseModel):
    course_id: int = Field(..., description="ID khóa học")
    lesson_id: int = Field(..., description="ID bài học")
    lesson_title: str = Field(..., description="Tiêu đề bài học")
    transcript_text: str = Field(..., description="Văn bản bóc tách từ Whisper")


# --- Phản hồi nạp dữ liệu thành công ---
class IngestResponse(BaseModel):
    course_id: int
    source_type: str
    title: str
    total_chunks: int
    message: str


# --- Phản hồi xóa dữ liệu kiến thức (Lifecycle Sync) ---
class KnowledgeDeleteResponse(BaseModel):
    course_id: int
    lesson_id: Optional[int] = None
    material_id: Optional[int] = None
    source_type: Optional[str] = None
    deleted: bool
    message: str
