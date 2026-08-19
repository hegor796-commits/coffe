# Zero-dependency Node-сервис. Нужен Node 22.5+ (встроенная node:sqlite).
FROM node:22-slim
WORKDIR /app

COPY package.json ./
COPY src ./src

# Данные (SQLite) — на смонтированный Volume. На Railway смонтируйте Volume на /data.
ENV NODE_ENV=production
ENV DATA_DIR=/data
# PORT задаётся Railway через env (обычно 8080), EXPOSE не нужен.
EXPOSE 8080

CMD ["node", "src/server.js"]
