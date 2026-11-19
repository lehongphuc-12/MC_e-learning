
import numpy as np
import soundfile as sf

from model_service import V4BModelService
from audio_service import load_audio

AUDIO_PATH = r"C:\Users\lapto\Downloads\dataset_train_AI\VietMDD\primaryschool-20260924T144018Z-1-001\primaryschool\CTT_Nam_6_S00044_1.wav"

print("=" * 60)
print("C01 - REAL AUDIO INFERENCE TEST")
print("=" * 60)

service = V4BModelService()
service.load()

with open(AUDIO_PATH, "rb") as f:
    audio, duration = load_audio(f.read())

print("Duration:", duration)
print("Sample rate:", 16000)
print("Audio shape:", audio.shape)

assert audio.ndim == 1
assert np.isfinite(audio).all()

result = service.predict(audio)

print("\nPREDICTIONS:")

for label, probability in result.items():
    print(f"{label}: {probability}")

assert len(result) == 4
assert all(
    0.0 <= value <= 1.0
    for value in result.values()
)

print("\nC01 INFERENCE: PASS")
