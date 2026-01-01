#!/bin/bash

# Load Docker Image and Run on VPS
# Usage: ./load-and-run.sh [image-file.tar.gz]

set -e

IMAGE_FILE=${1:-"yieldium-backend.tar.gz"}
IMAGE_NAME="yieldium-backend:latest"

if [ ! -f "$IMAGE_FILE" ]; then
    echo "❌ Image file not found: $IMAGE_FILE"
    echo "📥 Make sure you've transferred the image file to VPS first"
    exit 1
fi

echo "📥 Loading Docker image from $IMAGE_FILE..."
docker load < "$IMAGE_FILE"

echo ""
echo "📝 Creating .env file..."
if [ ! -f .env ]; then
    cat > .env << EOF
DATABASE_URL=file:/app/data/database.sqlite
JWT_SECRET=$(openssl rand -base64 32)
PORT=8080
NODE_ENV=production
WEBSITE_URL=https://yourdomain.com
EOF
    echo "✅ .env created"
else
    echo "⚠️  .env already exists, skipping..."
fi

echo ""
echo "📁 Creating data directory..."
mkdir -p data

echo ""
echo "🌐 Creating network (if not exists)..."
docker network create yieldium-network 2>/dev/null || echo "Network already exists"

echo ""
echo "🛑 Stopping existing container (if any)..."
docker stop yieldium-backend 2>/dev/null || true
docker rm yieldium-backend 2>/dev/null || true

echo ""
echo "▶️  Starting container..."
docker run -d \
  --name yieldium-backend \
  --network yieldium-network \
  -p 8080:8080 \
  --restart unless-stopped \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  $IMAGE_NAME

echo ""
echo "⏳ Waiting for container to start..."
sleep 5

# Check health
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Container is healthy!"
else
    echo "⚠️  Container started but health check failed. Check logs:"
    echo "   docker logs yieldium-backend"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 API is available at:"
echo "   http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "🔍 Check logs: docker logs -f yieldium-backend"
echo "🛑 Stop: docker stop yieldium-backend"

