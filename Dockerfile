# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9.15.4

WORKDIR /app

# Copia arquivos de dependencias e patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instala dependencias
RUN pnpm install

# Copia todo o codigo fonte
COPY . .

# Constroi o site
RUN pnpm build

# Production stage (Fase final)
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm@9.15.4

WORKDIR /app

# Copia arquivos essenciais
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instala apenas dependencias de producao
RUN pnpm install --prod

# --- COPIA ARQUIVOS FINAIS ---

# Copia a pasta dist
COPY --from=builder /app/dist ./dist

# Copia pastas do backend
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# EM VEZ DE COPIAR, CRIA A PASTA STORAGE VAZIA
RUN mkdir -p storage

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start application
CMD ["pnpm", "start"]
