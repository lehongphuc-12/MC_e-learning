# MC_MentorChat - AI Mentor RAG Microservice

Dịch vụ AI Mentor RAG (Retrieval-Augmented Generation) cho hệ sinh thái E-Learning MSEEK, cô lập theo từng khóa học bằng cơ chế vector embeddings (Google Gemini) và Vector Store (Qdrant).

## Cấu trúc và Kiến trúc Tích hợp với MC_BE

```
[MC_BE (.NET Core)] 
   │
   ├─► Video Transcription Worker ──(Tự động gửi Transcript)──► POST /api/transcripts/ingest ──► [Qdrant + Gemini]
   ├─► Upload Giáo trình/PDF      ──(Upload tài liệu)────────► POST /api/documents/upload   ──► [Qdrant + Gemini]
   └─► Learner Chat Endpoint      ──(Hỏi đáp trợ lý học tập)──► POST /api/chat               ──► [Qdrant + Gemini]
```

## Các biến môi trường (.env)

- `GEMINI_API_KEY`: API Key của Google Gemini
- `GEMINI_MODEL`: `gemini-2.5-flash` (hoặc `gemini-1.5-flash`)
- `EMBEDDING_MODEL`: `text-embedding-004` (768 dimensions)
- `QDRANT_URL`: `http://localhost:6333` (hoặc Qdrant Cloud URL, để trống nếu chạy file cục bộ `./qdrant_db`)
- `QDRANT_COLLECTION`: `course_knowledge`

## Hướng dẫn khởi chạy

```bash
# 1. Kích hoạt môi trường ảo Python
cd MC_MentorChat
python -m venv .venv
.venv\Scripts\activate

# 2. Cài đặt thư viện
pip install -r requirements.txt

# 3. Chạy server FastAPI
python -m app.main
# Server lắng nghe tại http://localhost:8000
```
