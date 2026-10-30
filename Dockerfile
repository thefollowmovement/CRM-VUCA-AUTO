# =====================================================================
#  Image de l'application VUCA AUTO CRM
# =====================================================================
FROM node:22-bookworm-slim AS construction
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Dépendances (mises en cache tant que package-lock.json ne change pas)
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# 2. Code source + construction
COPY . .
RUN npm run build

# ---------------------------------------------------------------------
FROM node:22-bookworm-slim AS execution
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    STORAGE_DIR=/app/storage

# pdftoppm : aperçus des avis de contravention scannés (PDF → image)
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils && rm -rf /var/lib/apt/lists/*

COPY --from=construction --chown=node:node /app ./
RUN mkdir -p /app/storage && chown node:node /app/storage && chmod +x scripts/*.sh

USER node
EXPOSE 3000
ENTRYPOINT ["./scripts/demarrage.sh"]
