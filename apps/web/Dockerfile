# Stage 1: Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/plaid-server/package.json ./apps/plaid-server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/hooks/package.json ./packages/hooks/
RUN npm ci --ignore-scripts

# Stage 2: Build the application
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm ci

RUN cd apps/web && DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["npm", "start"]
