# Stage 1: Build the React + Vite frontend bundle
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Cloudflare Wrangler local emulator runtime (1:1 with Workers + Assets)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install Wrangler CLI for local Cloudflare Worker & Assets emulation
RUN npm install -g wrangler@latest

COPY wrangler.jsonc ./
COPY worker/ ./worker/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8788

CMD ["wrangler", "dev", "--ip", "0.0.0.0", "--port", "8788"]
