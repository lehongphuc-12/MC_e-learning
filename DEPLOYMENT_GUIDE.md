# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG MSEEK E-LEARNING LÊN VPS

Tài liệu này hướng dẫn chi tiết từng bước để triển khai hệ thống **MC E-Learning** lên máy chủ ảo (VPS) sử dụng **Docker** và **Docker Compose**.

---

## 🏛️ KIẾN TRÚC HỆ THỐNG TRÊN DOCKER

Hệ thống được đóng gói thành các container độc lập và kết nối qua mạng nội bộ Docker (`mc-network`):

```
       [ Client / Browser ]
                │
                ▼ (Port 80 / 443)
┌────────────────────────────────────────────────────────┐
│  frontend (Nginx Alpine + React Vite SPA)              │
│  - Phục vụ giao diện tĩnh (HTML/CSS/JS)                │
│  - Nén Gzip tối ưu tốc độ                              │
│  - Reverse Proxy:                                      │
│    • /api/    ──► backend:8080 (ASP.NET Core 9)        │
│    • /hubs/   ──► backend:8080 (SignalR WebSocket)    │
│    • /swagger ──► backend:8080                         │
│  - Max body size: 500MB (Upload Video/Audio)           │
└───────────────┬────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────┐
│  backend (ASP.NET Core 9 Web API + FFmpeg Runtime)     │
│  - Xử lý nghiệp vụ, thanh toán, xác thực, học tập      │
│  - Cài đặt sẵn FFmpeg trích xuất âm thanh từ video     │
│  - Giao tiếp MentorChat qua http://mentorchat:8000     │
└───────────────┬────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────┐
│  mentorchat (Python 3.11 FastAPI RAG Service)          │
│  - AI Chatbot, xử lý RAG, Vector Search               │
│  - Kết nối LLM (Gemini, AI Portal / Claude)            │
│  - Kết nối Vector Store (Qdrant)                      │
└────────────────────────────────────────────────────────┘
```

---

## 1. YÊU CẦU CẤU HÌNH VPS KHUYẾN NGHỊ

- **Hệ điều hành**: Ubuntu 22.04 LTS hoặc 24.04 LTS (khuyên dùng).
- **CPU**: Tối thiểu 2 vCPU.
- **RAM**: Tối thiểu 2 GB (khuyên dùng 4 GB để build Docker mượt mà).
- **Ổ cứng**: Tối thiểu 25 GB SSD.
- **Mở port Firewall (UFW / Security Group)**:
  - `22` (SSH)
  - `80` (HTTP)
  - `443` (HTTPS)
  - `5239` (Backend API - chỉ mở nếu muốn test trực tiếp không qua Nginx)

---

## 2. CHUẨN BỊ MÔI TRƯỜNG TRÊN VPS

Đăng nhập SSH vào VPS:

```bash
ssh root@<IP_CUA_BAN>
```

Cập nhật hệ thống và cài đặt Docker + Docker Compose tự động:

```bash
# 1. Update hệ thống
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt Docker
curl -fsSL https://get.docker.com | sh

# 3. Phân quyền cho user hiện tại (nếu dùng non-root user)
sudo usermod -aG docker $USER

# 4. Kiểm tra Docker
docker --version
docker compose version
```

---

## 3. TẢI SOURCE CODE LÊN VPS

Bạn có thể clone repository từ Git:

```bash
cd /var/www  # hoặc thư mục mong muốn
git clone <URL_GIT_REPO_CUA_BAN> MC_e-learning
cd MC_e-learning
```

*(Hoặc dùng `scp` / `rsync` / FileZilla để upload thư mục dự án lên VPS).*

---

## 4. CẤU HÌNH BIẾN MÔI TRƯỜNG (.env)

Tạo file `.env` từ file mẫu `.env.example`:

```bash
cp .env.example .env
nano .env
```

### Các thông số quan trọng cần lưu ý:

1. **Domain hoặc IP VPS**:
   ```env
   # Nếu có tên miền:
   CLIENT_URL=https://yourdomain.com
   # Nếu dùng IP:
   CLIENT_URL=http://<IP_VPS>
   ```

2. **Frontend gọi API**:
   - Mặc định để `VITE_API_BASE_URL=/api`.
   - Với thiết lập này, trình duyệt sẽ tự động gọi API cùng domain qua Nginx reverse proxy, **tránh 100% lỗi CORS** và không cần sửa code khi đổi IP/Domain.

3. **Cơ sở dữ liệu (PostgreSQL)**:
   - Dự án mặc định kết nối với Supabase Cloud qua:
     ```env
     DATABASE_CONNECTION_STRING=Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=5432;Database=postgres;...
     ```
   - *Nếu bạn muốn tự chạy PostgreSQL cục bộ trên VPS*: Chạy lệnh khởi động với profile `local-db` (xem mục 8).

4. **URL Callback thanh toán (PayOS / VNPay)**:
   - Đổi `localhost` thành domain hoặc IP VPS của bạn:
     ```env
     PAYOS_RETURN_URL=https://yourdomain.com/payment-result
     PAYOS_CANCEL_URL=https://yourdomain.com/payment-result
     VNPAY_RETURN_URL=https://yourdomain.com/api/v1/payments/vnpay-return
     VNPAY_FRONTEND_RESULT_URL=https://yourdomain.com/payment-result
     ```

Lưu file bằng cách bấm `Ctrl + O` -> `Enter`, thoát bằng `Ctrl + X`.

---

## 5. KHỞI CHẠY HỆ THỐNG

### Cách 1: Sử dụng script tự động
```bash
chmod +x deploy.sh
./deploy.sh
```

### Cách 2: Sử dụng lệnh Docker Compose thủ công
```bash
# Build và chạy ngầm tất cả container
docker compose up -d --build
```

Kiểm tra trạng thái các container:
```bash
docker compose ps
```
Nếu cả 3 container `mc_fe`, `mc_be`, `mc_mentorchat` đều ở trạng thái `Up` là thành công!

---

## 6. KIỂM TRA HỆ THỐNG

Mở trình duyệt và truy cập:
- **Giao diện Web**: `http://<IP_VPS>`
- **API Swagger (nếu bật Development)**: `http://<IP_VPS>/swagger`
- **MentorChat Docs**: `http://<IP_VPS>:8000/docs` (nếu mở port 8000)

---

## 7. CẤU HÌNH TÊN MIỀN & SSL / HTTPS (MIỄN PHÍ)

### Phương án A: Dùng Cloudflare (Nhanh nhất & Đơn giản nhất)
1. Thêm domain vào Cloudflare và trỏ bản ghi `A` về IP của VPS.
2. Bật đám mây cam (Proxy status: **Proxied**).
3. Trong tab **SSL/TLS** của Cloudflare, chọn chế độ **Flexible** hoặc **Full**.
4. Website của bạn sẽ tự động có HTTPS mà không cần cài đặt chứng chỉ trên VPS!

### Phương án B: Cài đặt Certbot (Let's Encrypt) trực tiếp trên VPS
Nếu muốn cài SSL trực tiếp trên VPS:
```bash
sudo apt install certbot python3-certbot-nginx -y
# Cấp chứng chỉ SSL cho domain
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```
Sau đó mount chứng chỉ vào `frontend` container hoặc dùng Nginx ngoài VPS làm reverse proxy.

---

## 8. CÁC LỆNH QUẢN TRỊ THƯỜNG DÙNG

### 1. Xem logs theo thời gian thực:
```bash
# Xem toàn bộ
docker compose logs -f

# Xem riêng backend (.NET)
docker compose logs -f backend

# Xem riêng frontend (Nginx access/error log)
docker compose logs -f frontend

# Xem riêng mentorchat (FastAPI)
docker compose logs -f mentorchat
```

### 2. Dừng và khởi động lại:
```bash
# Khởi động lại toàn bộ
docker compose restart

# Dừng hệ thống
docker compose down
```

### 3. Cập nhật code mới khi có thay đổi trên Git:
```bash
git pull origin main
docker compose up -d --build
```

### 4. Dọn dẹp dung lượng ổ cứng VPS:
Docker có thể lưu trữ các image cũ sau nhiều lần build gây đầy ổ cứng:
```bash
docker system prune -f
```

---

## 9. TÙY CHỌN: CHẠY POSTGRESQL HOẶC QDRANT NỘI BỘ TRÊN VPS

Nếu bạn không muốn phụ thuộc vào cloud (Supabase / Qdrant Cloud) mà muốn tự host toàn bộ trên VPS:

```bash
# Chạy kèm PostgreSQL cục bộ:
docker compose --profile local-db up -d --build

# Chạy kèm Qdrant cục bộ:
docker compose --profile local-qdrant up -d --build

# Chạy kèm cả hai:
docker compose --profile local-db --profile local-qdrant up -d --build
```
Dữ liệu sẽ được lưu an toàn trong Docker Named Volumes (`postgres_data`, `qdrant_data`), không bị mất khi restart container.

---

## 10. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

1. **Lỗi `502 Bad Gateway` khi gọi `/api/`:**
   - Kiểm tra xem container `mc_be` có bị crash không: `docker compose logs backend`.
   - Kiểm tra kết nối database: chuỗi kết nối trong `.env` có đúng không, IP VPS có bị chặn bởi Supabase không.

2. **Lỗi không upload được video lớn:**
   - Cấu hình Nginx trong `MC_FE/nginx.conf` và Kestrel trong `MC_BE/Program.cs` đã được đặt giới hạn là **500MB**.
   - Nếu bạn dùng Cloudflare free, giới hạn upload qua proxy là **100MB** (nếu video lớn hơn 100MB, cần upload trực tiếp từ client lên Cloudflare R2 / Cloudinary sử dụng Presigned URL).

3. **Lỗi trùng Port:**
   - Nếu cổng 80 bị chiếm bởi service Nginx hoặc Apache có sẵn trên VPS:
     ```bash
     sudo systemctl stop nginx
     sudo systemctl disable nginx
     ```
   - Hoặc chỉnh `FRONTEND_PORT=8080` trong `.env` để map ra cổng khác.
