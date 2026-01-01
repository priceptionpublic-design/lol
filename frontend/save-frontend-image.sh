#!/bin/bash

# Save Docker image for frontend
# Usage: ./save-frontend-image.sh

set -e

IMAGE_NAME="yieldium-frontend"
TAG="latest"
OUTPUT_FILE="${IMAGE_NAME}.tar.gz"
PLATFORM="linux/amd64"

echo "🔨 Building Docker image for ${PLATFORM}..."
docker build --platform ${PLATFORM} -t ${IMAGE_NAME}:${TAG} .

echo ""
echo "💾 Saving image to ${OUTPUT_FILE}..."
docker save ${IMAGE_NAME}:${TAG} | gzip > ${OUTPUT_FILE}

# Get file size
FILE_SIZE=$(du -h ${OUTPUT_FILE} | cut -f1)

echo ""
echo "ℹ️ NEXT_PUBLIC_* envs are baked at build time. Set them before running this script, e.g.:"
echo "   NEXT_PUBLIC_API_URL=http://your-backend:8080 \\"
echo "   NEXT_PUBLIC_USE_TESTNET=false \\"
echo "   NEXT_PUBLIC_APP_DOWNLOAD_URL=https://your-app-download \\"
echo "   ./save-frontend-image.sh"
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
echo ""
echo "   Option 1: Host network mode (recommended for external access):"
echo "   docker run -d --name yieldium-frontend --network host \\"
echo "     -e NEXT_PUBLIC_API_URL=http://your-backend:8080 \\"
echo "     -e NEXT_PUBLIC_USE_TESTNET=false \\"
echo "     -e NEXT_PUBLIC_APP_DOWNLOAD_URL=https://your-app-download \\"
echo "     ${IMAGE_NAME}:${TAG}"
echo ""
echo "   Option 2: Bridge network mode:"
echo "   docker network create yieldium-network 2>/dev/null || true"
echo "   docker run -d --name yieldium-frontend --network yieldium-network -p 3000:3000 \\"
echo "     -e NEXT_PUBLIC_API_URL=http://your-backend:8080 \\"
echo "     -e NEXT_PUBLIC_USE_TESTNET=false \\"
echo "     -e NEXT_PUBLIC_APP_DOWNLOAD_URL=https://your-app-download \\"
echo "     ${IMAGE_NAME}:${TAG}"

