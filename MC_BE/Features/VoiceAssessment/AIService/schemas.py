from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


class ModelInfoResponse(BaseModel):
    model_version: str
    base_model: str
    checkpoint_repository: str
    checkpoint_filename: str
    checkpoint_epoch: int | None
    checkpoint_sha256: str | None
    labels: list[str]
    sample_rate: int
    projector_size: int
    device: str
    loaded: bool


class PredictionResponse(BaseModel):
    model_version: str
    checkpoint_epoch: int
    sample_rate: int
    duration_seconds: float
    inference_time_ms: float
    predictions: dict[str, float] = Field(
        description="Xác suất sigmoid cho bốn nhãn phát âm."
    )
