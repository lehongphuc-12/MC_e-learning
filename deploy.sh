#!/usr/bin/env bash
# ==============================================================================
# Script Trien Khai & Cap Nhat MSEEK E-Learning tren VPS
# Cach su dung:
#   chmod +x deploy.sh
#   ./deploy.sh
# ==============================================================================

set -e

echo "🚀 [1/5] Kiem tra moi truong Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker chua duoc cai dat. Vui long cai dat Docker truoc:"
    echo "   curl -fsSL https://get.docker.com | sh"
    exit 1
fi

echo "📋 [2/5] Kiem tra file cau hinh .env..."
if [ ! -f .env ]; then
    echo "⚠️  Khong tim thay file .env! Dang tao file .env tu .env.example..."
    cp .env.example .env
    echo "👉 Vui long kiem tra va chinh sua cac thong tin can thiet trong .env roi chay lai script!"
    exit 1
fi

echo "🛑 [3/5] Dung cac container cu neu dang chay..."
docker compose down --remove-orphans || true

echo "🔨 [4/5] Build va khoi chay toan bo he thong..."
docker compose up -d --build

echo "🔍 [5/5] Kiem tra trang thai cac container..."
sleep 3
docker compose ps

echo "=================================================================="
echo "🎉 TRIEN KHAI THANH CONG!"
echo "👉 Truy cap Frontend tai: http://<IP_VPS> (hoac domain cua ban)"
echo "👉 Xem logs toan he thong: docker compose logs -f"
echo "👉 Xem logs tung service: docker compose logs -f backend | frontend | mentorchat"
echo "=================================================================="
