# Imagem da API (Fastify) — build a partir da RAIZ do monorepo:
#   docker build -f apps/api/Dockerfile -t sylocrm-api:latest .
#
# Os pacotes internos (@sylocrm/*) são consumidos direto do código TypeScript
# (exports apontam pra src/), então a API roda com tsx, como em dev — por
# isso instala também as devDependencies da API (tsx, tsconfig compartilhado).

FROM node:22-slim

# HUSKY=0: o "prepare" da raiz instala os hooks do git, que não existem aqui.
ENV HUSKY=0
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Só os manifests primeiro — o install fica em cache enquanto as dependências
# não mudarem.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/application/package.json packages/application/
COPY packages/domain/package.json packages/domain/
COPY packages/infrastructure/package.json packages/infrastructure/
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/

RUN pnpm install --frozen-lockfile --filter "@sylocrm/api..."

COPY packages/application packages/application
COPY packages/domain packages/domain
COPY packages/infrastructure packages/infrastructure
COPY packages/shared packages/shared
COPY packages/config packages/config
COPY apps/api apps/api

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001

WORKDIR /app/apps/api
EXPOSE 3001

# Chamando o tsx direto (sem pnpm no meio) o processo recebe o SIGTERM do
# Docker e encerra limpo nos deploys.
CMD ["node_modules/.bin/tsx", "src/main.ts"]
