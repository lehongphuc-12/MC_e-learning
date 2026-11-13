import logging
from typing import Any, Dict, List, Optional
from google.genai import types
from app.core.config import settings
from app.services.gemini_pool import gemini_pool

logger = logging.getLogger("mentorchat.gemini")

SYSTEM_PROMPT = """Bạn là Trợ Lý Cố Vấn Học Tập (AI Mentor) cho khóa học trực tuyến.
Nhiệm vụ của bạn là hỗ trợ học viên giải đáp thắc mắc dựa trên tài liệu bài giảng và video bài học của khóa học.

Quy tắc bắt buộc:
1. Chỉ sử dụng thông tin có trong phần [NGỮ CẢNH KHÓA HỌC] bên dưới để trả lời. Không tự suy diễn kiến thức ngoài khóa học.
2. Nếu ngữ cảnh không chứa thông tin để trả lời, hãy lịch sự thông báo: "Nội dung này chưa được đề cập trong bài giảng hoặc tài liệu của khóa học hiện tại." và khuyên học viên trao đổi thêm với giảng viên.
3. Trích dẫn nguồn ngắn gọn ở cuối câu trả lời (chỉ liệt kê nguồn thực sự đã dùng):
   - Từ video bài giảng: "Theo bài giảng: [Tên bài học]"
   - Từ tài liệu: "Theo tài liệu: [Tên tài liệu]" (kèm "Trang X" nếu có)
4. Giữ giọng văn thân thiện, rõ ràng, sư phạm và khích lệ người học."""


def _candidate_models() -> List[str]:
    return list(dict.fromkeys([settings.GEMINI_MODEL, *settings.GEMINI_FALLBACK_MODELS]))


def _call_gemini_with_failover(prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.2) -> str:
    models_to_try = _candidate_models()
    _, _, start_key_num = gemini_pool.get_round_robin_client()
    clients_to_try = gemini_pool.get_ordered_clients_starting_from(start_key_num)

    last_err: Optional[Exception] = None

    for client, _, key_num in clients_to_try:
        for model_name in models_to_try:
            try:
                config = types.GenerateContentConfig(temperature=temperature)
                if system_instruction:
                    config.system_instruction = system_instruction

                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                )
                text = (getattr(response, "text", None) or "").strip()
                if not text:
                    raise ValueError(f"Model '{model_name}' trả về phản hồi rỗng.")

                logger.info(
                    "[Gemini] Key #%d model='%s' — tạo câu trả lời thành công (%d ký tự).",
                    key_num, model_name, len(text),
                )
                return text
            except Exception as e:
                err_msg = str(e).lower()
                is_rate_limit = any(k in err_msg for k in ("429", "quota", "resourceexhausted", "limit"))
                if is_rate_limit:
                    logger.warning(
                        "[Gemini] Key #%d bị Rate Limit / Hết Quota (429): %s. Tự động nhảy sang Key tiếp theo...",
                        key_num, e,
                    )
                    last_err = e
                    break  # Bỏ qua các model khác của Key này, chuyển ngay sang Key tiếp theo!
                else:
                    logger.warning("[Gemini] Key #%d model='%s' thất bại: %s", key_num, model_name, e)
                    last_err = e
                    continue

    raise last_err if last_err else RuntimeError("Tất cả các API Key Gemini đều thất bại.")


def rewrite_query_with_history(query: str, history: List[Dict[str, str]]) -> str:
    """Viết lại câu hỏi nối tiếp thành câu hỏi độc lập (hỗ trợ xoay vòng Key Gemini)."""
    if not history:
        return query

    recent = history[-4:]
    history_text = "\n".join(
        f"{'Học viên' if h['role'] == 'user' else 'AI Mentor'}: {h['content'][:400]}"
        for h in recent
    )
    prompt = (
        "Dựa vào đoạn hội thoại sau, hãy viết lại câu hỏi cuối cùng của học viên thành một câu hỏi tiếng Việt "
        "đầy đủ ngữ cảnh, ngắn gọn, rõ chủ ngữ để tìm kiếm tài liệu (CHỈ trả về câu hỏi đã viết lại, không giải thích):\n\n"
        f"{history_text}\n"
        f"Câu hỏi mới: {query}"
    )
    try:
        rewritten = _call_gemini_with_failover(prompt, temperature=0.0)
        logger.info("[Gemini/Rewrite] '%s' -> '%s'", query, rewritten)
        return rewritten or query
    except Exception as e:
        logger.warning("[Gemini/Rewrite] Lỗi rewrite, dùng query gốc: %s", e)
        return query


def generate_rag_answer(
    query: str,
    context_chunks: List[Dict[str, Any]],
    history: Optional[List[Dict[str, str]]] = None,
) -> str:
    if not context_chunks:
        return (
            "Nội dung này chưa được đề cập trong bài giảng hoặc tài liệu phù hợp của khóa học hiện tại. "
            "Bạn hãy thử đặt câu hỏi cụ thể hơn theo nội dung bài học hoặc chuyển sang chế độ Toàn khóa nhé."
        )

    context_blocks = []
    for idx, c in enumerate(context_chunks, start=1):
        if c.get("source_type") == "video_transcript":
            label = f"Bài giảng video: {c.get('title', '')}"
        else:
            page = f" - Trang {c['page']}" if c.get("page") else ""
            label = f"Tài liệu: {c.get('title', '')}{page}"
        context_blocks.append(f"--- [{idx}. {label}] ---\n{c.get('content', '')}")

    history_block = ""
    if history:
        recent_lines = [
            f"{'Học viên' if h['role'] == 'user' else 'AI Mentor'}: {h['content'][:500]}"
            for h in history[-4:]
        ]
        history_block = "[LỊCH SỬ HỘI THOẠI GẦN ĐÂY]:\n" + "\n".join(recent_lines) + "\n\n"

    user_prompt = (
        f"{history_block}"
        f"[NGỮ CẢNH KHÓA HỌC]:\n" + "\n\n".join(context_blocks) + "\n\n"
        f"[CÂU HỎI CỦA HỌC VIÊN]:\n{query}"
    )

    return _call_gemini_with_failover(user_prompt, system_instruction=SYSTEM_PROMPT, temperature=0.2)
