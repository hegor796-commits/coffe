FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/tma/package.json apps/tma/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @coffee/tma build
RUN cd apps/api && npx prisma generate && pnpm build

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/tma/dist apps/tma/dist
COPY --from=build /app/packages/shared/src packages/shared/src
COPY --from=build /app/packages/shared/package.json packages/shared/package.json

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
