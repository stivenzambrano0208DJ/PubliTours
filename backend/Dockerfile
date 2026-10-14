# API de PubliTours. Imagen de producción: solo dependencias de ejecución (sequelize-cli va incluido para aplicar las migraciones).
FROM node:24-alpine

# TZ: las fechas de negocio (reservas, "hoy", recordatorios) son de Colombia; sin esto el contenedor usaría UTC y cambiaría de día a las 7 p. m.
ENV NODE_ENV=production \
    TZ=America/Bogota
RUN apk add --no-cache tzdata
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .
# Las fotos que suben los prestadores viven en public/uploads: en producción es un volumen (ver docker-compose.yml).
RUN mkdir -p public/uploads && chown -R node:node /app
USER node

EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/salud || exit 1

# Aplica las migraciones pendientes y arranca; `exec` hace que las señales (docker stop) lleguen a Node para el cierre ordenado.
CMD ["sh", "-c", "npm run migrate && exec node src/server.js"]
