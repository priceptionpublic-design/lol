# Multi-stage build for optimized production image
# Platform is specified in build command: --platform linux/amd64
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./
COPY tsconfig.json ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src ./src

# Production stage
FROM oven/bun:1-alpine

WORKDIR /app

# Install wget for healthcheck and su-exec for user switching
RUN apk add --no-cache wget su-exec

# Copy package files
COPY package.json bun.lockb* ./

# Install only production dependencies
RUN bun install --frozen-lockfile --production

# Copy source code (Bun can run TypeScript directly)
COPY src ./src
COPY tsconfig.json ./

# Copy entrypoint script
COPY src/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create data directory for SQLite database
RUN mkdir -p /app/data && \
    chmod 755 /app/data

# Create non-root user for security
RUN addgroup -g 1001 -S bunuser && \
    adduser -S bunuser -u 1001

# Don't switch user here - entrypoint will handle it
# USER bunuser

# Create volume for database persistence
VOLUME ["/app/data"]

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application (Bun runs TypeScript directly)
# Admin user will be initialized automatically on startup
# Entrypoint ensures data directory permissions are correct
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bun", "run", "src/index.ts"]

