# ML Service Dockerfile
FROM python:3.11-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
FROM base AS deps
COPY apps/ml-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production image
FROM base AS runner
WORKDIR /app

COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

COPY apps/ml-service/src ./src
COPY apps/ml-service/requirements.txt .

# Create non-root user
RUN adduser --disabled-password --gecos "" appuser
USER appuser

# Model directory
RUN mkdir -p /models

EXPOSE 8000

ENV PYTHONPATH=/app
ENV PORT=8000

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]