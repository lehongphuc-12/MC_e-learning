# =======================================================
# Python FastAPI Microservice (MC_MentorChat)
# =======================================================
FROM python:3.11-slim

WORKDIR /app

# Cai dat cac thu vien he thong can thiet
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Cai dat Python dependencies truoc de toi uu Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toan bo source code
COPY . .

# Set bien moi truong cho Python
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

# Chay FastAPI server voi Uvicorn tren port 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
