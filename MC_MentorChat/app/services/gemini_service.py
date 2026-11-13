import logging
from typing import List, Dict, Any
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger("mentorchat.gemini")

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
        logger.warning(
            "[Gemini] generate_rag_answer — không có context chunks, trả về thông báo mặc định."
        )
        return "Hiện tại khóa học này chưa có tài liệu hoặc bài giảng nào liên quan đến câu hỏi của bạn."

    context_str = ""
    for idx, c in enumerate(context_chunks):
        type_label = "Bài giảng video" if c.get("source_type") == "video_transcript" else "Tài liệu"
        context_str += f"\n--- [{idx+1}. {type_label}: {c.get('title', '')}] ---\n{c.get('content', '')}\n"

    user_prompt = f"""[NGỮ CẢNH KHÓA HỌC]:
{context_str}

[CÂU HỎI CỦA HỌC VIÊN]:
{query}
"""

    models_to_try = list(dict.fromkeys([settings.GEMINI_MODEL, "gemini-3.8-flash", "gemini-flash-latest"]))
    logger.info(
        "[Gemini] Đang gọi generate_content với %d chunks ngữ cảnh. Thứ tự thử model: %s",
        len(context_chunks), models_to_try,
    )

    last_err = None
    for attempt, model_name in enumerate(models_to_try, start=1):
        try:
            logger.info("[Gemini] Lần thử %d/%d: model='%s'...", attempt, len(models_to_try), model_name)
            response = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.2
                )
            )
            logger.info("[Gemini] model='%s' — tạo câu trả lời thành công (%d ký tự).", model_name, len(response.text))
            return response.text
        except Exception as e:
            logger.warning(
                "[Gemini] Lần thử %d/%d model='%s' thất bại: %s",
                attempt, len(models_to_try), model_name, e,
            )
            last_err = e
            continue

    logger.error(
        "[Gemini] TẤT CẢ %d models đều thất bại. Lỗi cuối: %s",
        len(models_to_try), last_err, exc_info=True,
    )
    raise last_err if last_err else Exception("Không thể kết nối đến Gemini AI model.")
