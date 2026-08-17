# Zero-dependency Node-сервис. Нужен Node 22.5+ (встроенная node:sqlite).
FROM node:22-slim
WORKDIR /app

COPY package.json ./
COPY src ./src

# Данные (SQLite) — на смонтированный Volume. На Railway смонтируйте Volume на /data.
ENV NODE_ENV=production
ENV DATA_DIR=/data
EXPOSE 3000

CMD ["node", "src/server.js"]
