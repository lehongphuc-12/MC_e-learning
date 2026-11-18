
import os
import hmac
import time
import asyncio
import threading

from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, File, Header, HTTPException, UploadFile

from audio_service import AudioValidationError, load_audio
from model_service import V4BModelService
from schemas import HealthResponse, ModelInfoResponse, PredictionResponse

from services.c02_service import C02Service
from services.c03_service import C03Service


MAX_UPLOAD_BYTES = int(
    os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024))
)

API_KEY = os.getenv("AI_SERVICE_API_KEY", "").strip()


def verify_api_key(x_api_key: str | None) -> None:
    if API_KEY and not hmac.compare_digest(
        x_api_key or "", API_KEY
    ):
        raise HTTPException(
            status_code=401,
            detail="API key không hợp lệ."
        )


def run_lazy_inference(service, lock, method_name, audio):
    """
    Load model on first request and serialize inference
    for each service to reduce concurrent GPU memory usage.
    """
    with lock:
        if not service.loaded:
            service.load()

        inference = getattr(service, method_name)

        return inference(audio)


@asynccontextmanager
async def lifespan(app: FastAPI):

    # ======================================
    # C01 - PRONUNCIATION
    # Preserve existing startup behavior.
    # ======================================

    service = V4BModelService()
    service.load()

    app.state.model_service = service

    # ======================================
    # C02 AND C03 - LAZY LOADING
    # ======================================

    app.state.c02_service = C02Service()
    app.state.c03_service = C03Service()

    app.state.c02_lock = threading.Lock()
    app.state.c03_lock = threading.Lock()

    yield



app = FastAPI(
    title="MSEEK AI Voice Service",
    description=(
        "Unified AI service: "
        "C01 Pronunciation, "
        "C02 Speech Clarity, "
        "C03 Vietnamese ASR."
    ),
    version="2.0.0",
    lifespan=lifespan,
)



@app.get("/", include_in_schema=False)
def root():
    return {
        "service": "MSEEK AI Voice Service",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health",
        "models": ["C01", "C02", "C03"]
    }


# ==========================================
# HEALTH
# ==========================================

@app.get("/health", response_model=HealthResponse)
def health():

    service = getattr(
        app.state,
        "model_service",
        None
    )

    return HealthResponse(
        status=(
            "healthy"
            if service and service.is_loaded
            else "not_ready"
        ),
        model_loaded=bool(
            service and service.is_loaded
        ),
    )


@app.get("/health/models")
def models_health():

    c01 = getattr(
        app.state, "model_service", None
    )

    c02 = getattr(
        app.state, "c02_service", None
    )

    c03 = getattr(
        app.state, "c03_service", None
    )

    return {
        "C01": {
            "loaded": bool(c01 and c01.is_loaded),
            "status": (
                "ready"
                if c01 and c01.is_loaded
                else "not_ready"
            )
        },
        "C02": {
            "loaded": bool(c02 and c02.loaded),
            "status": (
                "ready"
                if c02 and c02.loaded
                else "not_loaded"
            )
        },
        "C03": {
            "loaded": bool(c03 and c03.loaded),
            "status": (
                "ready"
                if c03 and c03.loaded
                else "not_loaded"
            )
        }
    }


# ==========================================
# C01 - PRONUNCIATION
# ==========================================

@app.get(
    "/model-info",
    response_model=ModelInfoResponse
)
def model_info():

    service: V4BModelService = (
        app.state.model_service
    )

    return service.get_info()


@app.post(
    "/predict",
    response_model=PredictionResponse
)
async def predict(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(
        default=None,
        alias="X-API-Key"
    ),
):

    verify_api_key(x_api_key)

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Thiếu tên tệp âm thanh."
        )

    content_type = (
        file.content_type or ""
    ).lower()

    allowed_types = {
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/flac",
        "audio/x-flac",
        "application/octet-stream",
    }

    if content_type and content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail="Vui lòng gửi WAV hoặc FLAC."
        )

    raw = await file.read(
        MAX_UPLOAD_BYTES + 1
    )

    try:
        if not raw:
            raise HTTPException(
                status_code=400,
                detail="Tệp âm thanh rỗng."
            )

        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Tệp âm thanh vượt quá giới hạn."
            )

        try:
            audio, duration = load_audio(raw)

        except AudioValidationError as exc:
            raise HTTPException(
                status_code=422,
                detail=str(exc)
            ) from exc

    finally:
        await file.close()

    service: V4BModelService = (
        app.state.model_service
    )

    started = time.perf_counter()

    try:
        result = await asyncio.to_thread(
            service.predict,
            audio
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Không thể phân tích âm thanh."
        ) from exc

    return PredictionResponse(
        model_version="V4-B",
        checkpoint_epoch=service.checkpoint_epoch,
        sample_rate=16000,
        duration_seconds=round(
            duration, 4
        ),
        inference_time_ms=round(
            (time.perf_counter() - started) * 1000,
            2
        ),
        predictions=result,
    )


# ==========================================
# SHARED AUDIO UPLOAD
# ==========================================

async def receive_audio(file: UploadFile):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Thiếu tên tệp âm thanh."
        )

    content_type = (
        file.content_type or ""
    ).lower()

    allowed_types = {
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/flac",
        "audio/x-flac",
        "application/octet-stream",
    }

    if content_type and content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail="Chỉ hỗ trợ WAV hoặc FLAC."
        )

    try:
        raw = await file.read(
            MAX_UPLOAD_BYTES + 1
        )

        if not raw:
            raise HTTPException(
                status_code=400,
                detail="Tệp âm thanh rỗng."
            )

        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Tệp âm thanh vượt quá giới hạn."
            )

        try:
            return load_audio(raw)

        except AudioValidationError as exc:
            raise HTTPException(
                status_code=422,
                detail=str(exc)
            ) from exc

    finally:
        await file.close()


# ==========================================
# C02 - SPEECH CLARITY
# ==========================================

@app.post("/api/c02/predict")
async def predict_c02(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(
        default=None,
        alias="X-API-Key"
    ),
):

    verify_api_key(x_api_key)

    audio, duration = await receive_audio(file)

    service: C02Service = (
        app.state.c02_service
    )

    lock = app.state.c02_lock

    started = time.perf_counter()

    try:
        result = await asyncio.to_thread(
            run_lazy_inference,
            service,
            lock,
            "predict",
            audio
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Không thể đánh giá Speech Clarity."
        ) from exc

    result["sample_rate"] = 16000

    result["duration_seconds"] = round(
        duration, 4
    )

    result["inference_time_ms"] = round(
        (time.perf_counter() - started) * 1000,
        2
    )

    return result


# ==========================================
# C03 - VIETNAMESE ASR
# ==========================================

@app.post("/api/c03/transcribe")
async def transcribe_c03(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(
        default=None,
        alias="X-API-Key"
    ),
):

    verify_api_key(x_api_key)

    audio, duration = await receive_audio(file)

    service: C03Service = (
        app.state.c03_service
    )

    lock = app.state.c03_lock

    started = time.perf_counter()

    try:
        result = await asyncio.to_thread(
            run_lazy_inference,
            service,
            lock,
            "transcribe",
            audio
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Không thể nhận dạng giọng nói."
        ) from exc

    result["duration_seconds"] = round(
        duration, 4
    )

    result["sample_rate"] = 16000

    result["total_inference_time_ms"] = round(
        (time.perf_counter() - started) * 1000,
        2
    )

    return result
