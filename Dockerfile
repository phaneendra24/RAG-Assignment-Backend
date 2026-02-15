# Stage 1: Build
FROM node:22.15.0-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (Python, build tools, OpenSSL)
RUN apk add --no-cache python3 make g++ openssl

# Copy package files and prisma schema (needed for postinstall)
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy remaining source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:22.15.0-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies:
# - OpenSSL, curl, Python for chroma embeddings
# - Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
  openssl \
  curl \
  python3 \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  udev \
  dbus

# Tell Puppeteer to use system Chrome instead of downloading its own
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy built application and node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Copy migrations OUTSIDE the volume path so they're always available
# Volume is mounted at /app/prisma, so we store backup elsewhere
COPY --from=builder /app/prisma/migrations /migrations

# Copy start script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose app port
EXPOSE 5001

# Start the application with migrations
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
