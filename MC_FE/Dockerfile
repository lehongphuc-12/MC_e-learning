# =======================================================
# 1. Build Stage (Node.js)
# =======================================================
FROM node:20-alpine AS build
WORKDIR /app

# Copy package manifests de tan dung Docker cache layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build arguments cho phep override bien moi truong khi build
ARG VITE_API_BASE_URL=/api
ARG VITE_GOOGLE_CLIENT_ID=""

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build static bundle ra thu muc dist
RUN npm run build

# =======================================================
# 2. Production Stage (Nginx)
# =======================================================
FROM nginx:alpine AS final

# Xoa file mac dinh cua Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copy artifacts tu build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy cau hinh Nginx da toi uu
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
