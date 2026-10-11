# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY impl/package.json ./
RUN npm install
COPY impl/ ./
RUN npx tsc

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY impl/package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
