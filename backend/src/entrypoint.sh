#!/bin/sh
set -e

# Ensure data directory exists and has correct permissions
if [ ! -d "/app/data" ]; then
    mkdir -p /app/data
fi

# Fix permissions for data directory (run as root, then switch to bunuser)
chown -R bunuser:bunuser /app/data
chmod -R 755 /app/data

# Switch to bunuser and run the app
exec su-exec bunuser "$@"

