# NestJS monorepo (gateway / queue-service / reservation-service / payment-service)
# 공통 멀티스테이지 Dockerfile — 빌드 시 APP 빌드아규먼트로 실행 앱을 고른다.
#   docker build --build-arg APP=gateway             -t ticketing-gateway:latest             back/
#   docker build --build-arg APP=queue-service       -t ticketing-queue-service:latest       back/
#   docker build --build-arg APP=reservation-service -t ticketing-reservation-service:latest back/
#   docker build --build-arg APP=payment-service     -t ticketing-payment-service:latest     back/
# 빌더 스테이지는 4개 이미지 공통 → 레이어 캐시 재사용.

# ---- builder: 의존성 설치 + prisma client 생성 + 해당 서비스만 빌드 ----
FROM node:20-alpine AS builder
WORKDIR /app

# 어느 서비스를 빌드할지(빌더 스테이지에서도 ARG 선언 필요)
ARG APP=gateway

# lockfile 생기면 `npm ci`로 교체 권장
COPY package.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json nest-cli.json ./
COPY apps ./apps
COPY libs ./libs
# 해당 서비스만 빌드 → 서비스별 독립 빌드 (build:gateway / build:queue-service / ...)
# (그 앱이 import한 libs는 함께 컴파일됨 = 공유 코드 변경 시에만 같이 재빌드)
RUN npm run build:${APP}
# 출력: dist/apps/<app>/main.js (+ 사용된 dist/libs)

# ---- runner: 단일 앱 실행(슬림) ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

ARG APP=gateway
ENV APP=${APP}

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 포트는 각 앱이 PORT 환경변수로 읽음(k8s containerPort가 주입). 기본값은 코드에 있음.
CMD ["sh", "-c", "node dist/apps/${APP}/main.js"]
