FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY scripts ./scripts/
RUN npm ci

# Build production application configured for PostgreSQL
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:use:postgres && npx prisma generate && npm run build

# Production runner
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next ./.next
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npm start"]
