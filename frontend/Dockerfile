# ─────────────────────────────────────────────────────────────────
#  NFL Analytics Frontend — Dockerfile de PRODUÇÃO
#  Stage 1: Build React com Vite
#  Stage 2: Serve estáticos com Nginx Alpine
# ─────────────────────────────────────────────────────────────────

# Stage 1 — Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY . .

# Build de produção (minificado, tree-shaken)
RUN npm run build

# Stage 2 — Serve
FROM nginx:alpine

# Config customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os estáticos gerados pelo Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
