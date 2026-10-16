# syntax=docker/dockerfile:1

# ——— Build (Vite) ———
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Variáveis públicas embutidas no bundle (Coolify → Build Args).
# VITE_IPTV_PROXY=1: browser → mesma origem; container busca o IPTV (sem CORS/mixed content).
ARG VITE_APP_NAME=StreamHub IPTV
ARG VITE_DEFAULT_SERVER_URL=
ARG VITE_IPTV_PROXY=1
ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_DEFAULT_SERVER_URL=$VITE_DEFAULT_SERVER_URL \
    VITE_IPTV_PROXY=$VITE_IPTV_PROXY

RUN npm run build

# ——— Runtime (static + IPTV proxy) ———
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=80 \
    STATIC_ROOT=/app/publicar

COPY --from=build /app/publicar /app/publicar
COPY docker/server.mjs /app/server.mjs

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||80)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
