FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY server.ts ./
COPY lib/colyseus ./lib/colyseus
COPY tsconfig.json ./
COPY .tsx.config.cjs ./

# Expose port
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Start server
CMD ["npx", "tsx", "server.ts"]
