# ==========================================
# The Royal Knot - Production Multi-Stage Dockerfile
# ==========================================

# 1. Base Stage
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# 2. Dependencies Stage
FROM base AS dependencies
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci

# 3. Build Stage
FROM dependencies AS builder
COPY . .
# Generate Prisma Client
RUN npm run prisma:generate
# Build all workspaces: shared, server, client
RUN npm run build

# 4. Production Runner Stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000
ENV SERVE_CLIENT=true

WORKDIR /app

# Copy built node_modules and dist artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000

CMD ["node", "server/dist/server.js"]
