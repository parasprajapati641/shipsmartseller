FROM mcr.microsoft.com/playwright:v1.51.0-jammy

WORKDIR /app

# Copy package manifests and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy application source files
COPY . .

# Build application assets
RUN npm run build

# Expose HTTP automation microservice port
EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

# Start standalone automation HTTP microservice
CMD ["npx", "tsx", "automation/server.ts"]
