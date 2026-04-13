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

# Compile TypeScript (needs devDependencies: @types/*)
RUN cd apps/plaid-server && npx tsc

# Stage 3: Runner (standalone, no workspace context)
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 plaid

# Copy compiled output and prisma schema
COPY --from=builder /app/apps/plaid-server/dist ./dist
COPY --from=builder /app/apps/plaid-server/prisma ./prisma

# Install production deps standalone (not as workspace — avoids hoisting)
COPY apps/plaid-server/package.json ./
RUN npm install --omit=dev && npx prisma generate

RUN mkdir -p /var/log && touch /var/log/plaid-server.log && chown plaid:nodejs /var/log/plaid-server.log

USER plaid
EXPOSE 3001
ENV PORT=3001
CMD ["sh", "-c", "node dist/index.js 2>&1 | tee -a /var/log/plaid-server.log"]
