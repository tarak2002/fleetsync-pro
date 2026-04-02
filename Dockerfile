FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json ./
COPY server/package.json server/
COPY client/package.json client/

# Environment variables for build
ENV VITE_API_URL=/

# Install dependencies (ignoring scripts)
RUN cd client && npm install --include=dev --ignore-scripts

# Copy source code
COPY . .

# Build the client
RUN npm run build:client

# Production stage - Nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start command
CMD ["nginx", "-g", "daemon off;"]
