# front (React + Vite) — 정적 빌드 후 nginx 서빙
#   docker build -t ticketing-front:latest front/

# ---- builder: vite 정적 빌드 ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
# API는 k8s ingress를 통해 호출(/api → gateway). 필요 시 빌드 때 덮어쓰기.
# (.env.example과 동일한 변수명 사용)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build
# 출력: dist/

# ---- runner: nginx 정적 서빙 + SPA fallback ----
FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
