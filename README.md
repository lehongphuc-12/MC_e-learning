# 🎤 MSEEK – AI MC Training Platform

Hệ thống đào tạo MC trực tuyến ứng dụng AI, bao gồm Frontend (React + Vite), Backend (ASP.NET Core 9 + PostgreSQL) và AI Speech Service.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend:** React 19, Vite, TypeScript, TailwindCSS, Zustand
- **Backend:** ASP.NET Core Web API (.NET 9), Entity Framework Core (EF Core), Npgsql (PostgreSQL), JWT, Cloudinary
- **Database:** PostgreSQL

---

## 🚀 Hướng Dẫn Khởi Chạy (Quick Start)

### 1. Yêu cầu môi trường
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/)

---

### 2. Khởi chạy Backend (`MC_BE`)

```bash
# Di chuyển vào thư mục backend
cd MC_BE

# 1. Khôi phục các gói NuGet
dotnet restore

# 2. Cập nhật cấu hình Database (nếu cần)
# Chỉnh sửa chuỗi kết nối trong appsettings.json (ConnectionStrings: DefaultConnection)

# 3. Chạy dự án Backend
dotnet run
```
*API Swagger sẽ mặc định khởi chạy tại `https://localhost:7000/swagger` hoặc `http://localhost:5000/swagger` (tùy cấu hình).*

---

### 3. Khởi chạy Frontend (`MC_FE`)

```bash
# Di chuyển vào thư mục frontend
cd MC_FE

# 1. Cài đặt các thư mục dependencies
npm install

# 2. Khởi chạy giao diện ở chế độ Development
npm run dev
```
*Ứng dụng Web sẽ chạy tại: `http://localhost:3000`*

---

## ⚡ Các Lệnh Cần Thiết Khi Lập Trình (Developer Cheatsheet)

### 🗄️ Quản lý Database & EF Core (`MC_BE`)

*Lưu ý: Mở terminal tại thư mục `MC_BE`. Nếu chưa cài đặt tool EF Core, hãy chạy lệnh:*
```bash
dotnet tool install --global dotnet-ef
```


* **Cập nhật Database** (áp dụng các Migration vào PostgreSQL):
  ```bash
  dotnet ef database update
  ```

