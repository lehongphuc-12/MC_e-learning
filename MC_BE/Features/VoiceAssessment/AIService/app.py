import os
import hmac
import time

from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from audio_service import AudioValidationError, load_audio
from model_service import V4BModelService
from schemas import HealthResponse, ModelInfoResponse, PredictionResponse

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
API_KEY = os.getenv("AI_SERVICE_API_KEY", "").strip()


def verify_api_key(x_api_key: str | None) -> None:
    # Local development may leave AI_SERVICE_API_KEY empty.
    # Set it in Hugging Face Space and in MC_BE production configuration.
    if API_KEY and not hmac.compare_digest(x_api_key or "", API_KEY):
        raise HTTPException(status_code=401, detail="API key không hợp lệ.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    service = V4BModelService()
    service.load()
    app.state.model_service = service
    yield


app = FastAPI(
    title="MSEEK V4-B AI Service",
    description="Dịch vụ suy luận phát âm sử dụng checkpoint V4-B.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/", include_in_schema=False)
def root():
    return {"service": "MSEEK V4-B AI Service", "docs": "/docs", "health": "/health"}


@app.get("/health", response_model=HealthResponse)
def health():
    service = getattr(app.state, "model_service", None)
    return HealthResponse(
        status="healthy" if service and service.is_loaded else "not_ready",
        model_loaded=bool(service and service.is_loaded),
    )


@app.get("/model-info", response_model=ModelInfoResponse)
def model_info():
    service: V4BModelService = app.state.model_service
    return service.get_info()


@app.post("/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    verify_api_key(x_api_key)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Thiếu tên tệp âm thanh.")

    content_type = (file.content_type or "").lower()
    allowed_types = {
        "audio/wav", "audio/x-wav", "audio/wave",
        "audio/flac", "audio/x-flac", "application/octet-stream",
    }
    if content_type and content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail="Định dạng chưa được hỗ trợ. Vui lòng gửi WAV hoặc FLAC.",
        )

    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if not raw:
        raise HTTPException(status_code=400, detail="Tệp âm thanh rỗng.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Tệp âm thanh vượt quá giới hạn cho phép.")

    try:
        audio, duration = load_audio(raw)
    except AudioValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        await file.close()

    service: V4BModelService = app.state.model_service
    started = time.perf_counter()
    try:
        result = service.predict(audio)
    except Exception as exc:
        # Do not expose internal stack traces or checkpoint details to API clients.
        raise HTTPException(status_code=500, detail="Không thể phân tích âm thanh.") from exc

    return PredictionResponse(
        model_version="V4-B",
        checkpoint_epoch=service.checkpoint_epoch,
        sample_rate=16000,
        duration_seconds=round(duration, 4),
        inference_time_ms=round((time.perf_counter() - started) * 1000, 2),
        predictions=result,
    )
