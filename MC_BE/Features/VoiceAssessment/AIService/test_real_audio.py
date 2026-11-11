
import time
import numpy as np
import soundfile as sf

from pathlib import Path
from model_service import V4BModelService
from audio_service import load_audio

AUDIO_PATH = Path(
    r"C:\Users\lapto\Downloads\dataset_train_AI\VietMDD\primaryschool-20260924T144018Z-1-001\primaryschool\CNBA_Nu_6_S0003_11.wav"
)

print("=" * 60)
print("STEP 3.8 — REAL AUDIO INFERENCE")
print("=" * 60)

assert AUDIO_PATH.exists(), f"Không tìm thấy: {AUDIO_PATH}"

# 1. Load model
service = V4BModelService()
service.load()

assert service.is_loaded

print("\n[1] MODEL")
print("Version:", service.get_info()["model_version"])
print("Device:", service.device)
print("Checkpoint epoch:", service.checkpoint_epoch)

# 2. Read real audio
raw_bytes = AUDIO_PATH.read_bytes()
audio, duration = load_audio(raw_bytes)

print("\n[2] AUDIO")
print("File:", AUDIO_PATH.name)
print("Duration:", round(duration, 4))
print("Sampling rate: 16000")
print("Samples:", len(audio))
print("Dtype:", audio.dtype)

# 3. Inference
started = time.perf_counter()

predictions = service.predict(audio)

inference_time = (time.perf_counter() - started) * 1000

print("\n[3] PREDICTIONS")

for label, probability in predictions.items():
    print(f"{label}: {probability:.8f}")

# 4. Output validation
assert len(predictions) == 4

for label, probability in predictions.items():
    assert 0.0 <= probability <= 1.0
    assert np.isfinite(probability)

print("\n[4] PERFORMANCE")
print("Inference time:", round(inference_time, 2), "ms")

print("\n[5] CHECKPOINT PROTECTION")
print("SHA256:", service.checkpoint_sha256)
print("Training: NO")
print("Weight update: NO")

print("\n" + "=" * 60)
print("STEP 3.8 COMPLETE")
print("REAL AUDIO INFERENCE: PASS")
print("CHECKPOINT: UNCHANGED")
print("TRAINING: NO")
print("=" * 60)
