FROM python:3.12-slim

WORKDIR /app

# Dependências do sistema para Docling (OCR, PDF rendering)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Railway injeta PORT via env var
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
