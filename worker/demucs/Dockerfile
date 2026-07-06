# Worker Demucs (CPU) — separação de stems da BLACK BELT 360.
FROM python:3.11-slim

# ffmpeg é obrigatório pro Demucs ler/gravar áudio.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# torch CPU primeiro (evita puxar a versão CUDA, que é enorme e desnecessária).
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pré-baixa o modelo htdemucs na imagem (evita o download na 1ª separação).
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')" || true

COPY main.py .

# Railway injeta $PORT.
ENV PORT=8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
