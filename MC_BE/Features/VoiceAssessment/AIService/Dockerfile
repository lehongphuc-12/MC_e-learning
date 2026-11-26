
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    HF_HOME=/tmp/huggingface \
    TOKENIZERS_PARALLELISM=false \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libsndfile1 \
        libgomp1 \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install CUDA 12.8 PyTorch
RUN python -m pip install \
    --index-url https://download.pytorch.org/whl/cu128 \
    torch==2.11.0

# Install remaining dependencies
COPY requirements.txt .

RUN python -m pip install \
    -r requirements.txt

# Verify dependencies
RUN python -c "\
import torch, transformers, huggingface_hub; \
import numpy, scipy, sklearn, joblib, soundfile; \
print('Torch:', torch.__version__); \
print('CUDA build:', torch.version.cuda); \
print('Transformers:', transformers.__version__); \
print('HF Hub:', huggingface_hub.__version__); \
print('NumPy:', numpy.__version__); \
print('SciPy:', scipy.__version__); \
print('Scikit-learn:', sklearn.__version__); \
print('Joblib:', joblib.__version__)"

# Copy application source
COPY . .

EXPOSE 7860

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
