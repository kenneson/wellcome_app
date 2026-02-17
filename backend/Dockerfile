FROM node:20-slim

# Install OpenSSL required for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/

# Install dependencies (ignoring local lockfile to avoid platform mismatches)
# Also using --unsafe-perm to ensure postinstall scripts run correctly
RUN npm install --unsafe-perm

COPY . .

# Generate Prisma Client explicitly
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
