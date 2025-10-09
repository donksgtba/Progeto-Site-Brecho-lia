# Fly.io Dockerfile for Node app
# You can use 22-alpine to match your local Node version
FROM node:22-alpine

# Create app directory
WORKDIR /app

# Install deps first (leverage Docker layer cache)
COPY package*.json ./
RUN npm ci --only=production || npm install --only=production

# Copy source
COPY . .

# Env
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data

# Ensure runtime dir exists (will be persisted by Fly volume mount)
RUN mkdir -p /data

EXPOSE 3000

# Start
CMD ["node", "server.js"]
