FROM node:22-alpine

# Prisma necesita OpenSSL para su query engine; Alpine no lo trae por defecto.
# Sin esto el proceso falla al arrancar (y todas las peticiones del frontend
# ven "no se pudo conectar con el servidor" porque el backend nunca llega a escuchar).
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:migrate:admin && npm run start:prod"]
