# MSEEK V4-B AI Service

Python service này chỉ đảm nhiệm:
- Đọc và chuẩn hóa audio về mono, 16 kHz.
- Nạp đúng checkpoint V4-B từ Hugging Face.
- Chạy inference và trả xác suất sigmoid của 4 nhãn.
- Không quản lý người dùng, khóa học, quyền AI, database, roadmap hoặc nghiệp vụ .NET.

## Checkpoint bất biến

- Repository: `nozero23061311/mseek-pronunciation-v4-b`
- File: `best_checkpoint.pt`
- Epoch: 3
- SHA256: `7878654f1c49e5d4ed87299e9b0960a41cb1c8082f4cbdddbc463e9a1ce89a97`

Repository hiện là PRIVATE nên cần Hugging Face READ token trong biến môi trường `HF_TOKEN`.
Không đưa token vào source code, Git hoặc Docker image.

## Chạy local

Python 3.11 được khuyến nghị.

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Linux/macOS:

```bash
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Nạp biến môi trường từ `.env` bằng công cụ quản lý môi trường của IDE hoặc export chúng trong terminal. Không commit `.env`.

```bash
uvicorn app:app --host 127.0.0.1 --port 8000
```

Khi khởi động, service sẽ tải checkpoint, kiểm tra SHA256 và khôi phục state dict với `strict=True`.
Lần đầu tải model có thể mất thời gian và cần dung lượng RAM/VRAM phù hợp. Có thể chạy CPU để kiểm tra API nhưng inference sẽ chậm.

## API

- `GET /health`
- `GET /model-info`
- `POST /predict` với multipart field `file`.

Ví dụ:

```bash
curl -X POST "http://127.0.0.1:8000/predict" \
  -F "file=@sample.wav"
```

Nếu cấu hình `AI_SERVICE_API_KEY`, gửi thêm header `X-API-Key`.

Response mẫu (giá trị chỉ minh họa cấu trúc, không phải kết quả thực tế):

```json
{
  "model_version": "V4-B",
  "checkpoint_epoch": 3,
  "sample_rate": 16000,
  "duration_seconds": 4.67,
  "inference_time_ms": 123.4,
  "predictions": {
    "PRON_INITIAL": 0.4392,
    "PRON_VOWEL": 0.0131,
    "PRON_FINAL": 0.0030,
    "PRON_TONE": 0.0125
  }
}
```

Các giá trị xác suất không tự động là điểm năng lực hay kết luận chắc chắn. Ngưỡng phân loại và phản hồi học tập sẽ do nghiệp vụ MC_BE quyết định.

## Docker

```bash
docker build -t mseek-v4b-ai .
docker run --rm -p 8000:7860 \
  -e HF_TOKEN="$HF_TOKEN" \
  -e AI_SERVICE_API_KEY="$AI_SERVICE_API_KEY" \
  mseek-v4b-ai
```

## Lưu ý

- Chỉ hỗ trợ WAV/FLAC có thể đọc bởi libsndfile ở phiên bản hiện tại.
- Checkpoint được kiểm tra SHA256 trước khi nạp.
- Không dùng validation/test để huấn luyện.
- Không thay đổi checkpoint.
- Dockerfile là cấu hình khởi đầu; cần kiểm thử tương thích PyTorch/CUDA với phần cứng Space trước khi triển khai GPU.
