# Build stage
FROM node:20-slim AS builder

# Install OpenSSL required for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-slim AS runner

# Install OpenSSL required for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm install --only=production

# Regenerate prisma client for production environment
RUN npx prisma generate

# Copy built artifacts
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
