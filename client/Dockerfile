# Giai đoạn 1: Build mã nguồn React (Vite)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Giai đoạn 2: Chạy trên Nginx
FROM nginx:alpine
# Copy mã nguồn đã build từ thư mục dist sang thư mục chạy web của Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy file cấu hình nginx.conf vào để đè lên cấu hình mặc định
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]