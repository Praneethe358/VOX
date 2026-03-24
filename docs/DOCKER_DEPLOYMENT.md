# Docker Deployment Guide

## Overview

This project is containerized using Docker and Docker Compose for easy local development, staging, and production deployment.

## Architecture

The containerized application consists of:

1. **Frontend** - React/TypeScript/Vite SPA served with Node.js
2. **Backend** - Python FastAPI with MongoDB driver
3. **Database** - MongoDB 7 Alpine (optional local instance)
4. **LLM** - Ollama service for local AI models (optional)

## Prerequisites

- **Docker Desktop** 4.10+
- **Docker Compose** 2.0+
- For Windows: WSL2 backend recommended for best performance

## Quick Start

### 1. Build and Start All Services

```bash
# Navigate to project root
cd d:\mindkraft

# Build and start all containers
docker-compose up --build

# Services will be available at:
# - Frontend: http://localhost:4100
# - Backend API: http://localhost:4000
# - MongoDB: localhost:4200
```

### 2. Start Services (without rebuild)

```bash
docker-compose up
```

### 3. Run in Background

```bash
docker-compose up -d
```

### 4. Stop Services

```bash
docker-compose down
```

### 5. Remove All Data (including MongoDB volumes)

```bash
docker-compose down -v
```

## Configuration

### Environment Variables

Create a `.env` file in the project root to override defaults:

```env
JWT_SECRET=your-secure-secret-key-here
MONGODB_URI=mongodb://mongo:27017
MONGODB_DB_NAME=vox
FRONTEND_URL=http://localhost:4100
OLLAMA_BASE_URL=http://ollama:11434
```

### Database Initialization

MongoDB will automatically create the `vox` database. To initialize with seed data:

```bash
# Access MongoDB shell in running container
docker-compose exec mongo mongosh

# Or run from host:
mongosh "mongodb://localhost:4200/vox"
```

### Optional: Enable Ollama Service

Uncomment the `ollama` service in `docker-compose.yml`:

```yaml
ollama:
  image: ollama/ollama:latest
  ports:
    - "11434:11434"
  volumes:
    - ollama-data:/root/.ollama
  networks:
    - mindkraft-network
  restart: unless-stopped
```

Then pull a model:

```bash
docker-compose exec ollama ollama pull llama2
```

## Building Individual Images

### Frontend Image

```bash
cd Team-A-Frontend/Team-A-Frontend
docker build -t mindkraft-frontend:latest .
docker run -p 4100:5173 mindkraft-frontend:latest
```

### Backend Image

```bash
cd Team-A-Frontend/Team-A-Backend/Team-A-Backend
docker build -t mindkraft-backend:latest .
docker run -p 4000:3000 -e MONGODB_URI=mongodb://host.docker.internal:4200 mindkraft-backend:latest
```

## Debugging

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongo
```

### Access Container Shell

```bash
# Frontend
docker-compose exec frontend sh

# Backend
docker-compose exec backend bash

# MongoDB
docker-compose exec mongo sh
```

### Run One-Off Commands

```bash
# Install additional Python packages
docker-compose exec backend pip install new-package

# Check Node version
docker-compose exec frontend node --version
```

## Health Checks

All services include health checks:

```bash
# View health status
docker-compose ps

# Manual health check
curl http://localhost:4100    # Frontend
curl http://localhost:4000    # Backend
```

## Performance Tips

1. **Use .dockerignore** - Already configured to exclude unnecessary files
2. **Multi-stage builds** - Frontend uses multi-stage build to optimize image size
3. **Alpine images** - Smaller base images for faster startup
4. **Bind mounts for development** - Backend has `app/` directory mounted for hot-reload

## Production Deployment

### To Azure Container Registry (ACR)

```bash
# Login to ACR
az acr login --name your-acr-name

# Tag images
docker tag mindkraft-frontend:latest your-acr.azurecr.io/mindkraft-frontend:v1.0
docker tag mindkraft-backend:latest your-acr.azurecr.io/mindkraft-backend:v1.0

# Push to ACR
docker push your-acr.azurecr.io/mindkraft-frontend:v1.0
docker push your-acr.azurecr.io/mindkraft-backend:v1.0
```

### To Azure Container Instances

```bash
az container create \
  --name mindkraft-app \
  --resource-group your-rg \
  --image compose.yaml \
  --registry-login-server your-acr.azurecr.io \
  --registry-username <username> \
  --registry-password <password>
```

### Docker Compose in Production

Use override file for production:

**docker-compose.prod.yml**
```yaml
version: '3.8'
services:
  frontend:
    environment:
      VITE_API_BASE_URL: https://api.yourdomain.com
  backend:
    environment:
      MONGODB_URI: ${PROD_MONGODB_URI}
      JWT_SECRET: ${PROD_JWT_SECRET}
    restart: always
    healthcheck:
      retries: 5
```

Deploy with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 4100 (frontend)
netstr -ano | findstr :4100
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
```

### MongoDB Connection Failed

```bash
# Verify MongoDB is running
docker-compose ps mongo

# Check logs
docker-compose logs mongo

# Ensure MONGODB_URI matches: mongodb://mongo:4200
```

### Frontend Can't Reach Backend

- Verify backend is running: `docker-compose ps`
- Check `VITE_API_BASE_URL` environment variable
- Ensure both services are on same network: `docker network ls`

### Memory Issues

```bash
# Increase Docker Desktop memory allocation via settings
# Or run with memory limits:
docker-compose down
docker-compose up -d --memory 2g
```

## Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Full cleanup (be careful!)
docker system prune -a --volumes
```

## Next Steps

- Monitor application logs in production
- Set up CI/CD pipeline with GitHub Actions to build and push to ACR
- Implement load balancing for scaling
- Configure SSL/TLS for HTTPS
- Set up centralized logging with ELK or Azure Monitor

