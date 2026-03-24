# Backend - Python FastAPI
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including espeak-ng for TTS)
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app ./app

# Expose port
EXPOSE 3000

# Set environment variables (can be overridden)
ENV PORT=3000 \
    MONGODB_URI=mongodb://mongo:27017 \
    MONGODB_DB_NAME=vox \
    FRONTEND_URL=http://localhost:4100 \
    JWT_SECRET=vox-docker-dev-secret-change-this

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application (no --reload in production)
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]
