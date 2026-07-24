# Backend image for Azure Container Apps.
#
#   docker build -t finance-api ./backend
#   docker run -p 8000:8000 --env-file backend/.env finance-api
#
# Owner: Person A.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Requirements first so dependency layers cache across code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Azure Container Apps injects PORT; default to 8000 for local runs.
ENV PORT=8000
EXPOSE 8000

# /api/health is unauthenticated so the platform probe can reach it.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
