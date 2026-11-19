
import os
import sys
import numpy as np
import soundfile as sf

from dotenv import load_dotenv
from pathlib import Path

from audio_service import load_audio
from services.c03_service import C03Service


load_dotenv()

print("=" * 60)
print("C03 - VIETNAMESE ASR INFERENCE TEST")
print("=" * 60)

# ==========================================
# 1. CHECK ENVIRONMENT
# ==========================================

print("\n[1] ENVIRONMENT")

print("HF TOKEN CONFIGURED:", bool(os.getenv("HF_TOKEN")))

# ==========================================
# 2. LOAD REAL AUDIO
# ==========================================

print("\n[2] AUDIO")

AUDIO_PATH = Path(r"C:\Users\lapto\Downloads\dataset_train_AI\VietMDD\primaryschool-20260924T144018Z-1-001\primaryschool\CTT_Nam_6_S00044_1.wav")
if not AUDIO_PATH.is_file():
    raise FileNotFoundError(
        f"Audio file not found: {AUDIO_PATH.resolve()}"
    )

raw_audio, original_sr = sf.read(
    AUDIO_PATH,
    dtype="float32",
    always_2d=True
)

audio, duration = load_audio(
    AUDIO_PATH.read_bytes()
)

print("Original sample rate:", original_sr)
print("Duration:", duration)
print("Sample rate:", 16000)
print("Audio shape:", audio.shape)

assert audio.ndim == 1
assert audio.size > 0
assert np.isfinite(audio).all()

print("AUDIO: PASS")

# ==========================================
# 3. LOAD C03 MODEL
# ==========================================

print("\n[3] LOAD C03 MODEL")

service = C03Service()

service.load()

assert service.loaded
assert service.model is not None
assert service.processor is not None

print("C03 MODEL: PASS")
print("Model repository:", service.REPO)
print("Device:", service.device)
print("Architecture:", type(service.model).__name__)
print("Vocabulary size:", service.model.config.vocab_size)

# ==========================================
# 4. MODEL CONFIGURATION
# ==========================================

print("\n[4] MODEL CONFIGURATION")

print("Sample rate:", service.SAMPLE_RATE)
print("Expected vocabulary:", service.EXPECTED_VOCAB_SIZE)
print("Actual vocabulary:", service.model.config.vocab_size)

assert service.model.config.vocab_size == 110
assert not service.model.training

print("EVAL MODE: PASS")
print("CONFIGURATION: PASS")

# ==========================================
# 5. REAL AUDIO INFERENCE
# ==========================================

print("\n[5] REAL AUDIO INFERENCE")

result = service.transcribe(audio)

assert isinstance(result, dict)
assert "transcript" in result
assert "model_version" in result
assert "inference_time_ms" in result

transcript = result["transcript"]

assert isinstance(transcript, str)
assert np.isfinite(result["inference_time_ms"])
assert result["inference_time_ms"] >= 0

print("\nRESULT:")

for key, value in result.items():
    print(f"{key}: {value}")

print("\nTRANSCRIPT:")
print(transcript if transcript else "[EMPTY TRANSCRIPT]")

print("\nC03 INFERENCE: PASS")

# ==========================================
# 6. FINAL SUMMARY
# ==========================================

print("\n" + "=" * 60)
print("C03 TEST COMPLETED")
print("MODEL LOAD: PASS")
print("AUDIO VALIDATION: PASS")
print("INFERENCE: PASS")
print("TRAINING: NO")
print("WEIGHT MODIFICATION: NO")
print("=" * 60)
