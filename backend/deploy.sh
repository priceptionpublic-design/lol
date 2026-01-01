#!/bin/bash

# VPS Deployment Script for Yieldium Backend
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env from template..."
    cat > .env << EOF
DATABASE_URL=file:/app/data/database.sqlite
JWT_SECRET=$(openssl rand -base64 32)
PORT=8080
NODE_ENV=production
WEBSITE_URL=https://yourdomain.com
EOF
    echo "✅ .env created. Please edit it with your values!"
    echo "   nano .env"
    exit 1
fi

# Create data directory
mkdir -p data
chmod 755 data

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t yieldium-backend .

# Stop existing container if running
echo "🛑 Stopping existing container..."
docker-compose down || true

# Start container
echo "▶️  Starting container..."
docker-compose up -d

# Wait for container to be ready
echo "⏳ Waiting for container to start..."
sleep 5

# Check health
echo "🏥 Checking health..."
for i in {1..10}; do
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Container is healthy!"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ Container failed to start. Check logs:"
        docker logs yieldium-backend
        exit 1
    fi
    sleep 2
done

# Show status
echo ""
echo "📊 Container Status:"
docker ps | grep yieldium-backend

echo ""
echo "📋 Logs (last 20 lines):"
docker logs --tail 20 yieldium-backend

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 API is available at:"
echo "   http://$(hostname -I | awk '{print $1}'):8080"
echo "   or"
echo "   http://localhost:8080"
echo ""
echo "🔍 Check logs: docker logs -f yieldium-backend"
echo "🛑 Stop: docker-compose down"
echo "🔄 Restart: docker-compose restart"

