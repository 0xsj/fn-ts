ARG NODE_VERSION=20.15.0
ARG APP_NAME
FROM sjtommylee/conduit:nx-base AS deps

RUN yarn add ts-node
RUN yarn add tslib

CMD ["node", "./dist/apps/auth/main.js"]