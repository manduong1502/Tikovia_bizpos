# Stage 1: Build React
FROM node:20-alpine AS builder

WORKDIR /app

# Khai báo biến môi trường cho quá trình build (để kết nối đúng với Backend)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve với Nginx
FROM nginx:alpine

# Xóa cấu hình mặc định của Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copy file cấu hình Nginx chuẩn dành cho SPA (React) vào
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy code React đã build vào thư mục của Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
