
/**
 * MSEEK Academy — AI Voice Practice
 * Audio Processing Utility
 *
 * Chuyển âm thanh ghi từ MediaRecorder sang:
 * - WAV PCM 16-bit
 * - Sample rate: 16,000 Hz
 * - Mono: 1 channel
 *
 * Sử dụng cho AIPracticeRecorder.
 */

const TARGET_SAMPLE_RATE = 16000;
const CHANNEL_COUNT = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
const WAV_HEADER_SIZE = 44;

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function encodeWav(samples: Float32Array): ArrayBuffer {
  const dataSize = samples.length * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(WAV_HEADER_SIZE + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // PCM format
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, CHANNEL_COUNT, true);
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(
    28,
    TARGET_SAMPLE_RATE * CHANNEL_COUNT * BYTES_PER_SAMPLE,
    true
  );
  view.setUint16(32, CHANNEL_COUNT * BYTES_PER_SAMPLE, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // Audio data
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const value = Number.isFinite(samples[i])
      ? Math.max(-1, Math.min(1, samples[i]))
      : 0;

    const pcm = value < 0
      ? Math.round(value * 32768)
      : Math.round(value * 32767);

    view.setInt16(
      WAV_HEADER_SIZE + i * BYTES_PER_SAMPLE,
      pcm,
      true
    );
  }

  return buffer;
}

function convertToMono(
  context: BaseAudioContext,
  input: AudioBuffer
): AudioBuffer {
  const mono = context.createBuffer(
    CHANNEL_COUNT,
    input.length,
    input.sampleRate
  );

  const output = mono.getChannelData(0);

  for (let channel = 0; channel < input.numberOfChannels; channel++) {
    const source = input.getChannelData(channel);

    for (let i = 0; i < input.length; i++) {
      output[i] += source[i] / input.numberOfChannels;
    }
  }

  return mono;
}

/**
 * Chuyển Blob âm thanh thành WAV 16 kHz.
 *
 * @param blob - Blob được tạo bởi MediaRecorder
 * @returns File WAV sẵn sàng gửi tới backend
 */
export async function toWav16k(blob: Blob): Promise<File> {
  if (!blob || blob.size === 0) {
    throw new Error('Bản ghi âm không có dữ liệu.');
  }

  const AudioContextClass =
    window.AudioContext;

  if (!AudioContextClass) {
    throw new Error(
      'Trình duyệt không hỗ trợ xử lý âm thanh.'
    );
  }

  const audioContext = new AudioContextClass();

  try {
    // Decode bản ghi từ MediaRecorder.
    const audioData = await blob.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(audioData);

    if (decoded.length === 0 || decoded.duration <= 0) {
      throw new Error('Không thể đọc dữ liệu âm thanh.');
    }

    // Tính số mẫu tại sample rate 16 kHz.
    const targetLength = Math.max(
      1,
      Math.ceil(decoded.duration * TARGET_SAMPLE_RATE)
    );

    // Resample và chuyển thành mono.
    const offlineContext = new OfflineAudioContext(
      CHANNEL_COUNT,
      targetLength,
      TARGET_SAMPLE_RATE
    );

    const monoBuffer = convertToMono(offlineContext, decoded);

    const source = offlineContext.createBufferSource();
    source.buffer = monoBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    const rendered = await offlineContext.startRendering();
    const samples = rendered.getChannelData(0);

    // Encode PCM 16-bit WAV.
    const wavBuffer = encodeWav(samples);

    return new File(
      [wavBuffer],
      'ai-practice.wav',
      {
        type: 'audio/wav',
        lastModified: Date.now(),
      }
    );
  } catch (error) {
    console.error('[MSEEK Audio] WAV conversion failed:', error);
    throw error;
  } finally {
    await audioContext.close();
  }
}
