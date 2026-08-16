FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/tma/package.json apps/tma/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @coffee/shared build
RUN pnpm --filter @coffee/tma build
RUN cd apps/api && npx prisma generate && pnpm build

# Копируем всё дерево целиком (с сгенерированным Prisma-клиентом и симлинками pnpm)
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
# На старте: синхронизируем схему БД и запускаем сервер.
# Сев демо-данных выполняется идемпотентно внутри приложения (SeedService),
# в том же процессе и с тем же Prisma-клиентом — надёжнее, чем внешний tsx-шаг.
CMD ["sh", "-c", "cd apps/api && (npx prisma db push --accept-data-loss --skip-generate || echo '[startup] db push failed'); node dist/main.js"]
