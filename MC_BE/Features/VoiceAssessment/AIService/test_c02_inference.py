
import numpy as np
from dotenv import load_dotenv
load_dotenv()
from model_service import V4BModelService
from audio_service import load_audio
from services.c02_service import C02Service

AUDIO_PATH = r"C:\Users\lapto\Downloads\dataset_train_AI\VietMDD\primaryschool-20260924T144018Z-1-001\primaryschool\CTT_Nam_6_S00044_1.wav"

print("=" * 60)
print("C02 - SPEECH CLARITY INFERENCE TEST")
print("=" * 60)

# Load audio using shared preprocessing
with open(AUDIO_PATH, "rb") as f:
    audio, duration = load_audio(f.read())
import os

token = os.getenv("HF_TOKEN")

print("HF TOKEN CONFIGURED:", bool(token))

if not token:
    raise RuntimeError(
        "Chưa tìm thấy HF_TOKEN. Kiểm tra file .env"
    )
print("\n[1] AUDIO")

print("Duration:", duration)
print("Sample rate:", 16000)
print("Shape:", audio.shape)

assert audio.ndim == 1
assert np.isfinite(audio).all()

print("AUDIO: PASS")

# Load C02
print("\n[2] LOAD C02 MODEL")

service = C02Service()
service.load()

assert service.loaded
assert service.encoder is not None
assert service.extractor is not None
assert service.pipeline is not None

print("C02 MODEL: PASS")
print("Device:", service.device)

# Metadata
print("\n[3] MODEL METADATA")

print("Version:", service.metadata["model_version"])
print("Model type:", service.metadata["model_type"])
print("Embedding dimension:", service.metadata["embedding_dimension"])
print("Training samples:", service.metadata["training_samples"])

assert service.metadata["embedding_dimension"] == 1536

print("METADATA: PASS")

# Inference
print("\n[4] PREDICTION")

result = service.predict(audio)

for key, value in result.items():
    print(f"{key}: {value}")

assert 1.0 <= result["score"] <= 5.0
assert np.isfinite(result["raw_score"])

print("C02 INFERENCE: PASS")

print("\n" + "=" * 60)
print("C02 TEST COMPLETED")
print("=" * 60)
