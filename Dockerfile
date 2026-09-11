FROM node:22.23.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY apps/dashboard/standalone ./apps/dashboard/standalone
COPY apps/dashboard/src/components/opsweave-standalone ./apps/dashboard/src/components/opsweave-standalone
RUN npm run build

FROM node:22.23.0-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=32320 DATABASE_PATH=/data/opsweave.sqlite
WORKDIR /app
COPY --from=build /app/dist/opsweave-public ./dist/opsweave-public
COPY apps/api/standalone/server.mjs apps/api/standalone/store.mjs apps/api/standalone/engine.mjs apps/api/standalone/backup.mjs ./apps/api/standalone/
COPY LICENSE THIRD-PARTY.md ./
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 32320
CMD ["node", "apps/api/standalone/server.mjs"]
