FROM node:18-alpine AS builder

WORKDIR /app

# 필요한 파일 복사
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/

# 의존성 설치 및 빌드
RUN npm ci
RUN npm run build

FROM node:18-alpine AS release

WORKDIR /app

# 필요한 파일만 복사
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# 런타임 의존성만 설치
ENV NODE_ENV=production
RUN npm ci --omit=dev

# 볼륨 설정
VOLUME ["/data"]

# 환경 변수 설정
ENV NCBI_API_KEY=""
ENV IMPACT_FACTOR_PATH="/data/impact_factor_data.json"
ENV OUTPUT_DIR="/data/output"

ENTRYPOINT ["node", "/app/dist/index.js"]