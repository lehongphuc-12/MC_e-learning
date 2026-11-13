"""
llm_service.py — Dispatcher LLM trung tâm.

Quyết định dùng provider nào dựa theo thứ tự ưu tiên:
  1. provider truyền vào request (nếu có)
  2. settings.LLM_PROVIDER trong .env
  3. fallback về "gemini" nếu không config gì

Provider hỗ trợ:
  - "aiportalapi" | "portal"  → Claude-Opus-4.5 qua aiportalapi.stu-platform.live
  - "gemini"                  → Gemini 2.5 Flash, 2 Key xoay vòng & failover
  - "hybrid"                  → thử aiportalapi trước, nếu lỗi fallback sang gemini
"""

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger("mentorchat.llm_service")

# Các alias hợp lệ cho từng provider
_PORTAL_ALIASES = {"aiportalapi", "portal", "claude"}
_GEMINI_ALIASES = {"gemini", "google"}
_HYBRID_ALIASES = {"hybrid", "auto"}


def _resolve_provider(provider: Optional[str]) -> str:
    """Chuẩn hóa tên provider về 'aiportalapi', 'gemini', hoặc 'hybrid'."""
    raw = (provider or settings.LLM_PROVIDER or "gemini").strip().lower()
    if raw in _PORTAL_ALIASES:
        return "aiportalapi"
    if raw in _GEMINI_ALIASES:
        return "gemini"
    if raw in _HYBRID_ALIASES:
        return "hybrid"
    logger.warning("[LLMService] Provider không nhận diện được: '%s'. Dùng mặc định từ config: '%s'.", raw, settings.LLM_PROVIDER)
    return _resolve_provider(settings.LLM_PROVIDER)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_rag_answer(
    query: str,
    context_chunks: List[Dict[str, Any]],
    provider: Optional[str] = None,
) -> str:
    """
    Sinh câu trả lời RAG từ provider được chọn.

    Args:
        query:          Câu hỏi của học viên (đã được rewrite nếu cần).
        context_chunks: Danh sách chunk từ Qdrant (mỗi chunk là dict có key 'content', 'title', ...).
        provider:       Ghi đè provider cho request này. None → dùng settings.LLM_PROVIDER.

    Returns:
        Chuỗi câu trả lời từ AI Mentor.
    """
    resolved = _resolve_provider(provider)
    logger.info("[LLMService/RAG] provider='%s' (request=%s, config=%s)", resolved, provider, settings.LLM_PROVIDER)

    if resolved == "gemini":
        return _rag_via_gemini(query, context_chunks)

    # aiportalapi / portal / hybrid: thử portal trước, nếu lỗi fallback sang gemini
    # (bao gồm cả trường hợp thiếu key, timeout, quota...)
    try:
        return _rag_via_portal(query, context_chunks)
    except Exception as portal_err:
        logger.warning(
            "[LLMService/RAG] Portal thất bại (provider='%s'): %s — Tự động fallback sang Gemini...",
            resolved, portal_err,
        )
        return _rag_via_gemini(query, context_chunks)


def rewrite_query_with_history(
    query: str,
    history: List[Dict[str, str]],
    provider: Optional[str] = None,
) -> str:
    """
    Viết lại câu hỏi nối tiếp thành câu hỏi độc lập, dùng provider được chọn.
    Nếu không có history thì trả về query gốc ngay.
    """
    if not history:
        return query

    resolved = _resolve_provider(provider)

    if resolved == "gemini":
        from app.services.gemini_service import rewrite_query_with_history as _gemini_rewrite
        return _gemini_rewrite(query, history)

    # aiportalapi / portal / hybrid: thử portal, fallback gemini
    try:
        from app.services.portal_service import rewrite_query_with_history as _portal_rewrite
        return _portal_rewrite(query, history)
    except Exception as portal_err:
        logger.warning(
            "[LLMService/Rewrite] Portal thất bại (provider='%s'): %s — Tự động fallback sang Gemini...",
            resolved, portal_err,
        )
        from app.services.gemini_service import rewrite_query_with_history as _gemini_rewrite
        return _gemini_rewrite(query, history)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _rag_via_portal(query: str, context_chunks: List[Dict[str, Any]]) -> str:
    from app.services.portal_service import generate_rag_answer as _portal_rag
    return _portal_rag(query=query, context_chunks=context_chunks)


def _rag_via_gemini(query: str, context_chunks: List[Dict[str, Any]]) -> str:
    from app.services.gemini_service import generate_rag_answer as _gemini_rag
    return _gemini_rag(query=query, context_chunks=context_chunks)
