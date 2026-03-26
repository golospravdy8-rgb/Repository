# ====== STAGE 1: Build ======
FROM node:20-alpine AS builder
WORKDIR /app

# Копіюємо package files і prisma схему
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps

COPY . .

# Генеруємо Prisma client і білдимо Next.js
RUN npx prisma generate
RUN NODE_OPTIONS="--max-old-space-size=1024" npm run build

# ====== STAGE 2: Run ======
FROM node:20-alpine AS runner
WORKDIR /app

# Встановлюємо OpenSSL для Prisma engine
RUN apk add --no-cache openssl

# Безпека: запускаємо НЕ від root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Копіюємо standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Копіюємо prisma CLI для migrate deploy
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Скрипт запуску з міграцією
COPY --from=builder /app/start.sh ./start.sh
RUN chmod +x ./start.sh && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=10s --retries=5 --start-period=60s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["./start.sh"]
