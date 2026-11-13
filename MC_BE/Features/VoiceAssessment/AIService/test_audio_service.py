
import io
import numpy as np
import soundfile as sf

from audio_service import load_audio, AudioValidationError


def create_wav(sample_rate=16000, duration=2, channels=1):
    samples = np.zeros(
        (sample_rate * duration, channels),
        dtype=np.float32,
    )

    # Original test signal.
    t = np.arange(sample_rate * duration) / sample_rate
    signal = 0.2 * np.sin(2 * np.pi * 440 * t)

    samples[:, :] = signal.reshape(-1, 1)

    buffer = io.BytesIO()

    sf.write(
        buffer,
        samples,
        sample_rate,
        format="WAV",
    )

    return buffer.getvalue()


# Test 1: Mono 16 kHz
audio, duration = load_audio(create_wav())

assert audio.dtype == np.float32
assert audio.ndim == 1
assert len(audio) == 32000
assert abs(duration - 2.0) < 0.001

print("TEST 1 — MONO 16KHZ: PASS")


# Test 2: Stereo
audio, duration = load_audio(
    create_wav(channels=2)
)

assert audio.ndim == 1
assert len(audio) == 32000

print("TEST 2 — STEREO TO MONO: PASS")


# Test 3: Resampling 44.1 kHz
audio, duration = load_audio(
    create_wav(sample_rate=44100)
)

assert len(audio) == 32000
assert abs(duration - 2.0) < 0.001

print("TEST 3 — RESAMPLING: PASS")


# Test 4: Empty audio
try:
    load_audio(b"")
    raise AssertionError("Empty audio was accepted")
except AudioValidationError:
    print("TEST 4 — EMPTY AUDIO: PASS")


# Test 5: Invalid audio
try:
    load_audio(b"invalid audio")
    raise AssertionError("Invalid audio was accepted")
except AudioValidationError:
    print("TEST 5 — INVALID AUDIO: PASS")


print("=" * 50)
print("AUDIO SERVICE TESTS: PASS")
print("MODEL: NOT USED")
print("TRAINING: NO")
print("=" * 50)
