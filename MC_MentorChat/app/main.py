import sys
import io
import logging

# Đảm bảo UTF-8 cho stdout/stderr trên môi trường Windows PowerShell
if sys.platform == "win32":
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "buffer"):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Cấu hình logging tập trung cho toàn bộ service MentorChat
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mentorchat.startup")

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.chat import router as api_router
from app.rag.qdrant_service import init_qdrant
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo Qdrant collection và Indexes khi server khởi động
    logger.info("[Startup] Đang khởi tạo MC_MentorChat service...")
    try:
        init_qdrant()
        logger.info("[Qdrant] Khởi tạo Vector Store & Payload Indexes thành công!")
    except Exception as e:
        logger.error("[Qdrant] KHỞI TẠO THẤT BẠI — service vẫn chạy nhưng RAG sẽ không hoạt động: %s", e, exc_info=True)
    logger.info("[Startup] MC_MentorChat sẵn sàng nhận request tại cổng 8000.")
    yield
    logger.info("[Shutdown] MC_MentorChat đang tắt.")

app = FastAPI(
    title="MC E-learning AI Mentor Chat Service",
    description="Microservice RAG cô lập theo khóa học (PDF + Video Transcripts)",
    version="1.0.0",
    lifespan=lifespan   
)

# Cho phép gọi CORS từ web FE (tắt wildcard với credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global Exception Handler — bắt mọi lỗi chưa được xử lý, trả JSON đồng nhất
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "[UnhandledError] %s %s — %s: %s",
        request.method,
        request.url.path,
        type(exc).__name__,
        exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "Đã xảy ra lỗi nội bộ trong MentorChat service. Vui lòng thử lại hoặc liên hệ quản trị viên.",
            "detail": str(exc),
        },
    )

app.include_router(api_router)

@app.get("/")
def health_check():
    return {"status": "ok", "service": "MC_MentorChat is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
