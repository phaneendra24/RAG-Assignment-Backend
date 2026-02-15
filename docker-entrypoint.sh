#!/bin/sh
set -e

# Ensure migrations directory exists in the volume
echo "Setting up migrations..."
mkdir -p /app/prisma/migrations

# Copy fresh migrations from image (outside volume) to volume path
# This ensures new migrations are always available
cp -r /migrations/* /app/prisma/migrations/ 2>/dev/null || true

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting application..."
exec "$@"
