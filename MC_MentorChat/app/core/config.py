import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Tìm file .env trong thư mục MC_MentorChat hoặc thư mục hiện tại
_current_dir = Path(__file__).resolve().parent.parent.parent
_env_file = _current_dir / ".env"
if _env_file.exists():
    load_dotenv(dotenv_path=_env_file, override=True)
else:
    load_dotenv(override=True)


def _parse_list(raw: str) -> List[str]:
    return [x.strip() for x in (raw or "").split(",") if x.strip()]


class Settings:
    # --- LLM Provider Selection ---
    # "aiportalapi" (Claude-Opus-4.5) | "gemini" (Google Gemini) | "hybrid" (thử aiportalapi, fallback gemini)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "aiportalapi").lower()

    # --- 1. AI Portal (OpenAI-compatible, e.g. Claude-Opus-4.5) ---
    PORTAL_BASE_URL: str = os.getenv("PORTAL_BASE_URL", "https://aiportalapi.stu-platform.live/jpe")
    PORTAL_API_KEY: str = os.getenv("PORTAL_API_KEY", "")
    PORTAL_MODEL: str = os.getenv("PORTAL_MODEL", "Claude-Opus-4.5")
    PORTAL_MAX_TOKENS: int = int(os.getenv("PORTAL_MAX_TOKENS", "1024"))

    # --- 2. Google Gemini (Hỗ trợ 2 Key xoay vòng & failover) ---
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_API_KEY_2: str = os.getenv("GEMINI_API_KEY_2", "")
    GEMINI_API_KEYS: List[str] = list(
        dict.fromkeys(
            [
                k
                for k in [
                    os.getenv("GEMINI_API_KEY", "").strip(),
                    os.getenv("GEMINI_API_KEY_2", "").strip(),
                    *_parse_list(os.getenv("GEMINI_API_KEYS", "")),
                ]
                if k
            ]
        )
    )
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_FALLBACK_MODELS: List[str] = [
        m.strip()
        for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-2.5-flash,gemini-2.0-flash,gemini-flash-latest").split(",")
        if m.strip()
    ]
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")

    # --- Qdrant Vector Store ---
    QDRANT_URL: str = os.getenv("QDRANT_URL", "")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")
    QDRANT_COLLECTION: str = os.getenv("QDRANT_COLLECTION", "course_knowledge")
    VECTOR_SIZE: int = int(os.getenv("VECTOR_SIZE", "768"))

    # --- RAG Tuning ---
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "900"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "150"))
    MIN_RELEVANCE_SCORE: float = float(os.getenv("MIN_RELEVANCE_SCORE", "0.45"))
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "25")) * 1024 * 1024

    # --- Security & CORS ---
    INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "")
    ALLOWED_ORIGINS: List[str] = _parse_list(
        os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://localhost:5173,http://localhost:7187,https://localhost:7187",
        )
    ) or ["http://localhost:3000", "http://localhost:5173", "http://localhost:7187", "https://localhost:7187"]


settings = Settings()
