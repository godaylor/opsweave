FROM node:22.23.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY apps/dashboard/standalone ./apps/dashboard/standalone
COPY apps/dashboard/src/components/opsweave-standalone ./apps/dashboard/src/components/opsweave-standalone
RUN npm run build
RUN npm sbom --omit=dev --sbom-format=spdx > SBOM.runtime.spdx.json && npm prune --omit=dev --ignore-scripts --no-audit --no-fund
COPY apps/api/standalone/notices.mjs ./apps/api/standalone/notices.mjs
RUN node apps/api/standalone/notices.mjs

FROM node:22.23.0-bookworm-slim
# Apply available Debian security fixes and omit package managers from runtime.
RUN apt-get update && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
ENV NODE_ENV=production HOST=0.0.0.0 PORT=32320
WORKDIR /app
COPY --from=build /app/dist/opsweave-public ./dist/opsweave-public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/THIRD-PARTY-RUNTIME.txt /app/SBOM.runtime.spdx.json ./
COPY apps/api/standalone/server.mjs apps/api/standalone/store.mjs apps/api/standalone/engine.mjs apps/api/standalone/schema.sql ./apps/api/standalone/
COPY LICENSE THIRD-PARTY.md ./
USER node
EXPOSE 32320
CMD ["node", "apps/api/standalone/server.mjs"]
