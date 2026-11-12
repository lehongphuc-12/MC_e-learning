# 🎤 MSEEK – AI-Powered MC Training & E-Learning Platform

<p align="center">
  <img src="https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&auto=format&fit=crop&q=80" alt="MSEEK Banner" width="100%" style="border-radius: 12px; max-height: 380px; object-fit: cover;" />
</p>

<p align="center">
  <strong>Nền tảng đào tạo người dẫn chương trình (MC) trực tuyến thông minh tích hợp Trí Tuệ Nhân Tạo (AI)</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet&logoColor=white" alt=".NET 9" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/FastAPI-Python_3.10+-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Vector_DB-Qdrant-DC2626" alt="Qdrant" />
  <img src="https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Storage-Cloudflare_R2-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare R2" />
  <img src="https://img.shields.io/badge/Payments-PayOS%20%7C%20VNPay-0088FF" alt="Payments" />
</p>

---

## 📑 Mục Lục
1. [Tổng Quan Hệ Sinh Thái Dự Án (Ecosystem Overview)](#1-tổng-quan-hệ-sinh-thái-dự-án-ecosystem-overview)
2. [Bảng Ngăn Xếp Công Nghệ (Tech Stack)](#2-bảng-ngăn-xếp-công-nghệ-tech-stack)
3. [Hướng Dẫn Khởi Chạy Từng Phân Hệ (Step-by-step Quick Start)](#3-hướng-dẫn-khởi-chạy-từng-phân-hệ-step-by-step-quick-start)

---

## 1. 🌟 Tổng Quan Hệ Sinh Thái Dự Án (Ecosystem Overview)

**MSEEK** là nền tảng đào tạo người dẫn chương trình (MC) trực tuyến chuyên nghiệp ứng dụng công nghệ Trí Tuệ Nhân Tạo (AI) hiện đại:

* 🎙️ **AI Teleprompter & Speaking Studio:** Studio luyện nói với máy nhắc chữ đa cấp độ (`BASIC`, `STANDARD`, `ADVANCED`), hỗ trợ chèn nhạc nền biểu cảm sân khấu (**Background Music**), ghi âm/ghi hình trực tiếp trên trình duyệt và tự động nộp bài đánh giá (`SpeakingSubmission`).
* 🤖 **Trợ lý ảo AI Mentor RAG Microservice:** Hỏi đáp, phân tích nội dung khóa học thông minh cô lập theo từng bài giảng dựa trên công nghệ **Google Gemini** và **Qdrant Vector DB**.
* ⚡ **Tự động bóc băng phụ đề video:** Trích xuất âm thanh từ video bài giảng và chuyển đổi thành văn bản, phụ đề tự động qua hàng đợi nền với **Groq Whisper-large-v3**.
* 💬 **Hệ thống giao tiếp thời gian thực:** Nhắn tin trực tiếp qua **SignalR Chat** và hỗ trợ gọi video 1-1 qua **WebRTC Video Call** giữa Giảng viên và Học viên.
* 💳 **Thanh toán & Chứng chỉ số:** Tích hợp cổng thanh toán trực tuyến **PayOS** (VietQR) và **VNPay Sandbox**, cùng hệ thống cấp chứng chỉ điện tử có trang xác thực công khai qua mã định danh.

---

## 2. 🛠️ Bảng Ngăn Xếp Công Nghệ (Tech Stack)

| Phân Hệ | Công Nghệ & Thư Viện Chính |
| :--- | :--- |
| **Frontend (`MC_FE`)** | React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4, Zustand 5, TanStack Query v5, Motion (Framer Motion v12), SignalR Client, WebRTC |
| **Backend (`MC_BE`)** | ASP.NET Core 9.0 Web API (C# 13), Feature-Driven Architecture (Vertical Slice), Entity Framework Core 9, Npgsql (PostgreSQL), Rate Limiting, JWT Auth, Google OAuth, SignalR Hubs |
| **AI Microservice (`MC_MentorChat`)** | FastAPI (Python 3.10+), Google Gemini 2.5 Flash, `text-embedding-004`, Qdrant Vector Database |
| **Kiểm Thử (Unit Tests)** | xUnit, Moq, FluentAssertions (`MC_BE.Tests`) |
| **Lưu Trữ & Đa Phương Tiện** | Cloudflare R2 (S3-Compatible API lưu trữ Video lớn), Cloudinary (Hình ảnh, Avatar), Gmail SMTP |
| **Cổng Thanh Toán** | PayOS SDK (VietQR), VNPay Gateway Sandbox |

---

## 3. 🚀 Hướng Dẫn Khởi Chạy Từng Phân Hệ (Step-by-step Quick Start)

### 3.1. Backend (`MC_BE`)

```bash
# 1. Di chuyển vào thư mục backend
cd MC_BE

# 2. Khôi phục các gói NuGet
dotnet restore

# 3. Cài đặt công cụ EF Core CLI (nếu máy chưa cài)
dotnet tool install --global dotnet-ef

# 4. Cập nhật Database (Áp dụng các migration vào PostgreSQL)
dotnet ef database update

# 5. Khởi chạy server ở chế độ Hot-Reload
dotnet watch
# hoặc chạy bình thường: dotnet run
```
* **Swagger API UI:** `https://localhost:7051/swagger` (hoặc cổng HTTP hiển thị tại console).
* **SignalR Hubs:** `/hubs/chat` và `/hubs/call`.

---

### 3.2. Frontend (`MC_FE`)

```bash
# 1. Di chuyển vào thư mục frontend
cd MC_FE

# 2. Cài đặt các thư viện dependencies
npm install

# 3. Khởi chạy giao diện ở chế độ Development
npm run dev
```
* **Ứng dụng Web:** Hoạt động tại `http://localhost:3000`.

---

### 3.3. AI Mentor Microservice (`MC_MentorChat`)

```bash
# 1. Di chuyển vào thư mục AI microservice
cd MC_MentorChat

# 2. Khởi tạo và kích hoạt môi trường ảo Python
# Trên Windows:
python -m venv .venv
.venv\Scripts\activate

# Trên macOS / Linux:
# python3 -m venv .venv
# source .venv/bin/activate

# 3. Cài đặt các thư viện phụ thuộc
pip install -r requirements.txt

# 4. Khởi chạy server FastAPI
python -m app.main
```
* **Server AI:** Lắng nghe tại `http://localhost:8000`.
* **Tài liệu Swagger API của AI Service:** `http://localhost:8000/docs`.

---

### 3.4. Kiểm Thử Tự Động (`MC_BE.Tests`)

```bash
# Lệnh chạy toàn bộ bài test
dotnet test MC_BE.Tests

# Chạy test với log chi tiết
dotnet test MC_BE.Tests --logger "console;verbosity=detailed"
```

---

<p align="center">
  Được phát triển với niềm đam mê công nghệ và nghệ thuật dẫn chương trình ❤️ 
  <br />
  <strong>MSEEK Team © 2026</strong>
</p>
