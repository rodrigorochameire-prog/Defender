# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9.15.4

WORKDIR /app

# Copia arquivos
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instala tudo para o build
RUN pnpm install

# Copia codigo
COPY . .

# Importa variaveis para o build
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID

ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
ENV VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID

# Constroi o site
RUN pnpm build

# Production stage
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm@9.15.4

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# --- MUDANÇA CRUCIAL AQUI ---
# Forçamos o modo desenvolvimento temporariamente para instalar o Vite
RUN NODE_ENV=development pnpm install
# ----------------------------

# Copia arquivos finais
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

RUN mkdir -p storage

EXPOSE 3000
# Define produção novamente para o site rodar otimizado
ENV NODE_ENV=production

CMD ["pnpm", "start"]
