#!/bin/bash

# Save Docker Image Locally
# Usage: ./save-image.sh

set -e

IMAGE_NAME="yieldium-backend"
TAG="latest"
OUTPUT_FILE="${IMAGE_NAME}.tar.gz"

echo "🔨 Building Docker image for linux/amd64..."
docker build --platform linux/amd64 -t ${IMAGE_NAME}:${TAG} .

echo ""
echo "💾 Saving image to ${OUTPUT_FILE}..."
docker save ${IMAGE_NAME}:${TAG} | gzip > ${OUTPUT_FILE}

# Get file size
FILE_SIZE=$(du -h ${OUTPUT_FILE} | cut -f1)

echo ""
echo "✅ Image saved successfully!"
echo "   File: ${OUTPUT_FILE}"
echo "   Size: ${FILE_SIZE}"
echo ""
echo "📤 To transfer to VPS:"
echo "   scp ${OUTPUT_FILE} user@your-vps-ip:~/"
echo ""
echo "📥 On VPS, load it:"
echo "   docker load < ${OUTPUT_FILE}"
echo "   docker network create yieldium-network 2>/dev/null || true"
echo "   docker run -d --name yieldium-backend --network yieldium-network -p 8080:8080 -v \$(pwd)/data:/app/data --env-file .env ${IMAGE_NAME}:${TAG}"

