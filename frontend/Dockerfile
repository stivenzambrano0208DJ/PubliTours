# Frontend de PubliTours: se compila con Vite y lo sirve nginx, que además reenvía /api y /uploads al backend
# (así navegador, frontend y API comparten origen y no hace falta configurar CORS).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vacío = el navegador llama a la misma dirección desde la que cargó la página (la que reenvía nginx).
ARG VITE_API_ORIGIN=""
ENV VITE_API_ORIGIN=$VITE_API_ORIGIN
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-seguridad.conf /etc/nginx/snippets/nginx-seguridad.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
