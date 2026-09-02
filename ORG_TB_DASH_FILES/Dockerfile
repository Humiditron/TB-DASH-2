# Multi-stage Dockerfile for HUMID1 OS Dashboard
# Stage 1: Build static assets with Node.js
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

RUN npm run build

# Stage 2: Serve static files with lightweight NGINX Alpine image
FROM nginx:alpine

# Copy built application assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy runtime environment entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# SPA routing configuration (redirect all unmatched paths to index.html and disable caching for env-config.js)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location = /env-config.js { \
        expires -1; \
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"; \
    } \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webmanifest)$ { \
        expires 6M; \
        access_log off; \
        add_header Cache-Control "public"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
