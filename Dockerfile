# ============================
# Stage 1: Builder
# ============================
FROM node:22-alpine AS builder

# Instala o pnpm
RUN npm install -g pnpm@9.15.4

WORKDIR /app

# Copia arquivos de dependência e patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instala todas as dependências (incluindo devDependencies para o build)
RUN pnpm install

# Copia todo o código fonte
COPY . .

# --- INJEÇÃO DE VARIÁVEIS PARA O FRONTEND ---
# Estas variáveis precisam existir durante o build para serem "assadas" no Javascript
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_APP_ID

ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
ENV VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
ENV VITE_APP_ID=$VITE_APP_ID
# --------------------------------------------

# Constrói o site (Vite Build)
RUN pnpm build

# ============================
# Stage 2: Production (Runner)
# ============================
FROM node:22-alpine

# Instala o pnpm
RUN npm install -g pnpm@9.15.4

WORKDIR /app

# Copia arquivos essenciais
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instala as dependências.
# Usamos NODE_ENV=development temporariamente para garantir que pacotes como 'vite'
# sejam instalados, pois seu servidor parece depender deles em tempo de execução.
RUN NODE_ENV=development pnpm install

# Copia os arquivos construídos na etapa anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# Cria a pasta de armazenamento para uploads
RUN mkdir -p storage

# Expõe a porta
EXPOSE 3000

# Define ambiente de produção para rodar otimizado
ENV NODE_ENV=production

# Inicia o servidor
CMD ["pnpm", "start"]
