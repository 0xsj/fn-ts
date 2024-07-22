ARG NODE_VERSION=20.15.0-alpine
ARG APP_NAME
FROM sjtommylee/conduit:nx-base AS deps
ARG PULSAR_SERVICE_URL=pulsar://localhost:6650
ARG AUTH_SERVICE=host.docker.internal
ARG AUTH_SERVICE_PORT=3010
ARG GATEWAY_PORT=3333
ARG CONDUIT_GATEWAY=host.docker.internal



CMD ["node", "./dist/apps/conduit/main.js"]