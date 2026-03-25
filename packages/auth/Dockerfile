# Auth server — Express + better-sqlite3
FROM node:20-alpine

WORKDIR /app

# better-sqlite3 потребує build tools
RUN apk add --no-cache python3 make g++

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3012

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3012/health || exit 1

CMD ["node", "src/authServer.js"]
