
import io
from math import gcd

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

TARGET_SAMPLE_RATE = 16000

MIN_DURATION_SECONDS = 0.1
MAX_DURATION_SECONDS = 120.0


class AudioValidationError(ValueError):
    pass


def load_audio(raw_bytes: bytes):
    if not raw_bytes:
        raise AudioValidationError("Tệp âm thanh rỗng.")

    try:
        audio, sample_rate = sf.read(
            io.BytesIO(raw_bytes),
            dtype="float32",
            always_2d=True,
        )
    except Exception as exc:
        raise AudioValidationError(
            "Không đọc được tệp âm thanh. Vui lòng gửi WAV hoặc FLAC hợp lệ."
        ) from exc

    if audio.size == 0 or sample_rate <= 0:
        raise AudioValidationError(
            "Tệp âm thanh không có dữ liệu hợp lệ."
        )

    if not np.isfinite(audio).all():
        raise AudioValidationError(
            "Âm thanh chứa giá trị không hợp lệ."
        )

    # Validate duration before resampling.
    original_duration = audio.shape[0] / sample_rate

    if original_duration < MIN_DURATION_SECONDS:
        raise AudioValidationError(
            "Âm thanh quá ngắn để phân tích."
        )

    if original_duration > MAX_DURATION_SECONDS:
        raise AudioValidationError(
            f"Âm thanh vượt quá giới hạn {MAX_DURATION_SECONDS:.0f} giây."
        )

    # Convert multi-channel audio to mono.
    audio = np.mean(audio, axis=1, dtype=np.float32)

    if not np.isfinite(audio).all():
        raise AudioValidationError(
            "Không thể chuyển đổi âm thanh sang mono."
        )

    # Resample to 16 kHz.
    if sample_rate != TARGET_SAMPLE_RATE:
        divisor = gcd(int(sample_rate), TARGET_SAMPLE_RATE)

        up = TARGET_SAMPLE_RATE // divisor
        down = int(sample_rate) // divisor

        audio = resample_poly(
            audio,
            up,
            down,
        ).astype(np.float32)

    # Final validation.
    if audio.size < int(MIN_DURATION_SECONDS * TARGET_SAMPLE_RATE):
        raise AudioValidationError(
            "Âm thanh sau chuyển đổi quá ngắn."
        )

    if not np.isfinite(audio).all():
        raise AudioValidationError(
            "Âm thanh sau chuyển đổi chứa giá trị không hợp lệ."
        )

    duration_seconds = len(audio) / TARGET_SAMPLE_RATE

    return (
        np.ascontiguousarray(audio, dtype=np.float32),
        duration_seconds,
    )
