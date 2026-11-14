import logging
from typing import Any, Dict, List, Optional
from app.core.config import settings

logger = logging.getLogger("mentorchat.portal")

SYSTEM_PROMPT = """Bạn là Trợ Lý Cố Vấn Học Tập (AI Mentor) cho khóa học trực tuyến.
Nhiệm vụ của bạn là hỗ trợ học viên giải đáp thắc mắc dựa trên tài liệu bài giảng và video bài học của khóa học.

Quy tắc bắt buộc:
1. Chỉ sử dụng thông tin có trong phần [NGỮ CẢNH KHÓA HỌC] bên dưới để trả lời. Không tự suy diễn kiến thức ngoài khóa học.
2. Nếu ngữ cảnh không chứa thông tin để trả lời, hãy lịch sự thông báo: "Nội dung này chưa được đề cập trong bài giảng hoặc tài liệu của khóa học hiện tại." và khuyên học viên trao đổi thêm với giảng viên.
3. Trích dẫn nguồn ngắn gọn ở cuối câu trả lời (chỉ liệt kê nguồn thực sự đã dùng):
   - Từ video bài giảng: "Theo bài giảng: [Tên bài học]"
   - Từ tài liệu: "Theo tài liệu: [Tên tài liệu]" (kèm "Trang X" nếu có)
4. Giữ giọng văn thân thiện, rõ ràng, sư phạm và khích lệ người học."""


def _call_via_openai_sdk(
    messages: List[Dict[str, str]],
    model: str,
    max_tokens: int,
    temperature: float,
) -> str:
    from openai import OpenAI
    import httpx

    # connect=5s: nếu không kết nối được trong 5s → lỗi ngay (tránh chờ DNS/TCP treo)
    # read=12s:   nếu model không trả lời trong 12s → lỗi, fallback Gemini
    _timeout = httpx.Timeout(connect=5.0, read=12.0, write=5.0, pool=5.0)

    client = OpenAI(
        base_url=settings.PORTAL_BASE_URL,
        api_key=settings.PORTAL_API_KEY,
        timeout=_timeout,
    )
    response = client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=messages,  # type: ignore
    )
    if not response.choices:
        raise ValueError("AI Portal trả về danh sách choices rỗng.")
    content = response.choices[0].message.content or ""
    return content.strip()


def _call_via_httpx(
    messages: List[Dict[str, str]],
    model: str,
    max_tokens: int,
    temperature: float,
) -> str:
    import httpx

    base_url = settings.PORTAL_BASE_URL.rstrip("/")
    endpoint = base_url if base_url.endswith("/chat/completions") else f"{base_url}/chat/completions"

    headers = {
        "Authorization": f"Bearer {settings.PORTAL_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": messages,
    }

    with httpx.Client(timeout=httpx.Timeout(connect=5.0, read=20.0, write=5.0, pool=5.0)) as client:
        resp = client.post(endpoint, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            raise ValueError(f"AI Portal trả về định dạng không hợp lệ: {data}")
        msg = choices[0].get("message", {})
        content = msg.get("content", "")
        return (content or "").strip()


def call_portal_llm(
    prompt: str,
    system_instruction: Optional[str] = None,
    max_tokens: Optional[int] = None,
    temperature: float = 0.2,
) -> str:
    """
    Gọi endpoint AI Portal (OpenAI-compatible) với model Claude-Opus-4.5.
    Tự động dùng thư viện `openai` nếu đã cài đặt, hoặc fallback sang `httpx` trực tiếp.
    """
    if not settings.PORTAL_API_KEY:
        raise ValueError(
            "PORTAL_API_KEY chưa được cấu hình trong file .env. Vui lòng thêm PORTAL_API_KEY để sử dụng Claude/AI Portal."
        )

    model = settings.PORTAL_MODEL
    tokens = max_tokens or settings.PORTAL_MAX_TOKENS

    messages: List[Dict[str, str]] = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    logger.info(
        "[AI Portal] Đang gọi model='%s' tại '%s' (max_tokens=%d)...",
        model, settings.PORTAL_BASE_URL, tokens,
    )

    try:
        try:
            return _call_via_openai_sdk(messages, model=model, max_tokens=tokens, temperature=temperature)
        except ImportError:
            logger.debug("[AI Portal] Chưa cài gói 'openai', chuyển sang gọi trực tiếp bằng httpx...")
            return _call_via_httpx(messages, model=model, max_tokens=tokens, temperature=temperature)
    except Exception as e:
        logger.error("[AI Portal] Lỗi khi gọi model '%s': %s", model, e, exc_info=True)
        raise RuntimeError(f"AI Portal ({model}) lỗi: {e}") from e


def rewrite_query_with_history(query: str, history: List[Dict[str, str]]) -> str:
    """Viết lại câu hỏi nối tiếp sử dụng model Claude-Opus-4.5 của AI Portal."""
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
        rewritten = call_portal_llm(prompt=prompt, max_tokens=150, temperature=0.0)
        logger.info("[AI Portal/Rewrite] '%s' -> '%s'", query, rewritten)
        return rewritten or query
    except Exception as e:
        logger.warning("[AI Portal/Rewrite] Không thể rewrite query, dùng query gốc: %s", e)
        return query


def generate_rag_answer(
    query: str,
    context_chunks: List[Dict[str, Any]],
    history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """Ghép ngữ cảnh và gửi tới AI Portal (Claude-Opus-4.5) để sinh câu trả lời RAG."""
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
            p_num = c.get("page_number") or c.get("page")
            page_part = f" - Trang {p_num}" if p_num else ""
            label = f"Tài liệu: {c.get('title', '')}{page_part}"
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

    return call_portal_llm(
        prompt=user_prompt,
        system_instruction=SYSTEM_PROMPT,
        temperature=0.2,
    )
