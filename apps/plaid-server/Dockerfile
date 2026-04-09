# Stage 1: Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/plaid-server/package.json ./apps/plaid-server/
RUN npm ci --workspace=apps/plaid-server --ignore-scripts

# Stage 2: Build the application
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/plaid-server ./apps/plaid-server
COPY package.json package-lock.json ./
RUN npm ci --workspace=apps/plaid-server

# Generate Prisma client
RUN cd apps/plaid-server && npx prisma generate

# Compile TypeScript
RUN cd apps/plaid-server && npx tsc

# Stage 3: Runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 plaid

# Copy necessary files from builder
COPY --from=builder /app/apps/plaid-server/dist ./dist
COPY --from=builder /app/apps/plaid-server/prisma ./prisma
COPY --from=builder /app/apps/plaid-server/package.json ./package.json
COPY --from=builder /app/apps/plaid-server/node_modules ./node_modules

USER plaid
EXPOSE 3001
ENV PORT=3001

CMD ["node", "dist/index.js"]
