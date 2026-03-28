# Chat — Express + Socket.io
FROM node:20-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

RUN mkdir -p db && chown -R appuser:appgroup /app
USER appuser

EXPOSE 3011

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3011}/health || exit 1

CMD ["node", "src/server.js"]
