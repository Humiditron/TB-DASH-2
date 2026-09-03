# ==========================================
# Stage 1: Build Phase
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for Docker cache optimization
COPY package*.json ./
RUN npm install

# Copy application source and user src_lib
COPY . .

# Build production bundle
RUN npm run build

# ==========================================
# Stage 2: Production Nginx Server
# ==========================================
FROM nginx:1.27-alpine AS runner

# Remove default nginx configs
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script for dynamic environment variable injection
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose standard web ports
EXPOSE 5000

# Healthcheck configuration
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/healthz || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
