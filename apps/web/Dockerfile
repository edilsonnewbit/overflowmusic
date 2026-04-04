# Build context: monorepo root (packages/* must be accessible)
FROM node:20-alpine AS deps
WORKDIR /app
# Copy workspace manifests only (for layer caching)
COPY package.json package-lock.json* ./
COPY packages/types/package.json ./packages/types/package.json
COPY apps/web/package.json ./apps/web/package.json
# npm workspaces installs deps and symlinks @overflow/types automatically
RUN npm install --workspace=apps/web --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy sources needed for Next.js build
COPY packages/types ./packages/types
COPY apps/web ./apps/web
COPY package.json ./
WORKDIR /app/apps/web
RUN mkdir -p public
# NEXT_PUBLIC_* vars are baked in at build time — pass them via --build-arg
ARG NEXT_PUBLIC_API_URL=https://music.overflowmvmt.com/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
