# Kastrel Dashboard Docker Image
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build React frontend
RUN npm run build

# Python runtime stage
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install kastrel-api from git (or change to your source)
# Option 1: From git
# RUN pip install git+https://github.com/YOUR_ORG/kastrel-api.git@main

# Option 2: Copy from local (if building from monorepo or with kastrel-api available)
# COPY kastrel-api/ /tmp/kastrel-api/
# RUN pip install /tmp/kastrel-api/

# For now, assume kastrel-api is in requirements or installed separately
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy dashboard application
COPY app/ ./app/
COPY config/ ./config/

# Copy built React frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create data directories
RUN mkdir -p /var/lib/kastrel/data /var/lib/kastrel/demo_data

# Expose port
EXPOSE 8080

# Set environment
ENV KASTREL_ENV=production

# Run dashboard
CMD ["python", "-m", "app.main", "--host", "0.0.0.0", "--port", "8080"]
