from typing import List, Dict, Any
from google import genai
from google.genai import types
from app.core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """Bạn là Trợ Lý Cố Vấn Học Tập (AI Mentor) cho khóa học trực tuyến.
Nhiệm vụ của bạn là hỗ trợ học viên giải đáp các thắc mắc chuyên môn dựa trên tài liệu bài giảng và video bài học của khóa học.

Quy tắc bắt buộc:
1. Chỉ sử dụng thông tin có trong phần [NGỮ CẢNH KHÓA HỌC] bên dưới để trả lời. Không được tự suy diễn ngoài khóa học.
2. Nếu câu hỏi không được đề cập trong ngữ cảnh, hãy lịch sự thông báo: "Nội dung này chưa được đề cập trong bài giảng hoặc tài liệu của khóa học hiện tại." và khuyên học viên hỏi thêm giảng viên.
3. Cách trích dẫn nguồn ở cuối câu trả lời:
   - Nếu từ video bài giảng: "Theo bài giảng: [Tên bài học]"
   - Nếu từ tài liệu PDF: "Theo tài liệu: [Tên file PDF]"
4. Giữ giọng văn thân thiện, rõ ràng, mang tính sư phạm và khích lệ người học."""

def generate_rag_answer(query: str, context_chunks: List[Dict[str, Any]]) -> str:
    """Ghép ngữ cảnh và gửi đến Gemini để tạo câu trả lời hoàn chỉnh."""
    if not context_chunks:
        return "Hiện tại khóa học này chưa có tài liệu hoặc bài giảng nào liên quan đến câu hỏi của bạn."

    context_str = ""
    for idx, c in enumerate(context_chunks):
        type_label = "Bài giảng video" if c["source_type"] == "video_transcript" else "Tài liệu"
        context_str += f"\n--- [{idx+1}. {type_label}: {c['title']}] ---\n{c['content']}\n"

    user_prompt = f"""[NGỮ CẢNH KHÓA HỌC]:
{context_str}

[CÂU HỎI CỦA HỌC VIÊN]:
{query}
"""

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2  # Giữ nhiệt độ thấp để câu trả lời chính xác, bám sát tài liệu
        )
    )
    return response.text