# Dockerfile otimizado para Next.js 15 Standalone + Railway / Render / Dokku

# 1. Estágio de Dependências
FROM node:20-alpine AS deps
RUN apk add --no-libc-dev libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# 2. Estágio de Compilação (Builder)
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gerar o cliente Prisma
RUN npx prisma generate

# Desabilitar telemetria durante o build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compilar aplicação Next.js Standalone
RUN npm run build

# 3. Estágio de Execução em Produção (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos públicos e build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# Executar migração leve do banco e iniciar servidor standalone
CMD ["sh", "-c", "npx prisma db push --skip-generate || true && node server.js"]
