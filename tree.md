# target

fn-ts/
├── src/
│ ├── api/
│ │ └── v1/
│ │ ├── controllers/
│ │ │ ├── user.controller.ts
│ │ │ ├── incident.controller.ts
│ │ │ ├── notification.controller.ts
│ │ │ └── search.controller.ts
│ │ ├── routes/
│ │ │ ├── index.ts
│ │ │ ├── user.routes.ts
│ │ │ ├── incident.routes.ts
│ │ │ ├── notification.routes.ts
│ │ │ └── search.routes.ts
│ │ └── middleware/
│ │ ├── auth.middleware.ts
│ │ ├── rate-limit.middleware.ts
│ │ └── validation.middleware.ts
│ │
│ ├── core/
│ │ ├── di/
│ │ │ ├── container.ts
│ │ │ ├── tokens.ts
│ │ │ └── modules/
│ │ │ ├── cache.module.ts
│ │ │ ├── database.module.ts
│ │ │ ├── queue.module.ts
│ │ │ └── search.module.ts
│ │ └── config/
│ │ ├── index.ts
│ │ ├── app.config.ts
│ │ ├── database.config.ts
│ │ ├── redis.config.ts
│ │ ├── elasticsearch.config.ts
│ │ └── queue.config.ts
│ │
│ ├── domain/
│ │ ├── entities/
│ │ │ └── schemas/
│ │ │ ├── index.ts
│ │ │ ├── user.schema.ts
│ │ │ ├── incident.schema.ts
│ │ │ ├── notification.schema.ts
│ │ │ ├── location.schema.ts
│ │ │ ├── chat.schema.ts
│ │ │ └── entity.schema.ts
│ │ ├── repositories/
│ │ │ ├── user.repository.interface.ts
│ │ │ ├── incident.repository.interface.ts
│ │ │ └── notification.repository.interface.ts
│ │ ├── services/
│ │ │ ├── user.service.ts
│ │ │ ├── incident.service.ts
│ │ │ ├── notification.service.ts
│ │ │ └── analytics.service.ts
│ │ └── events/
│ │ ├── incident.events.ts
│ │ ├── notification.events.ts
│ │ └── event-bus.interface.ts
│ │
│ ├── infrastructure/
│ │ ├── database/
│ │ │ ├── connection.ts
│ │ │ ├── migrator.ts
│ │ │ ├── types.ts
│ │ │ ├── migrations/
│ │ │ │ ├── 001_create_users_table.ts
│ │ │ │ ├── 002_create_incidents_table.ts
│ │ │ │ ├── 003_create_notifications_table.ts
│ │ │ │ └── 004_add_search_indexes.ts
│ │ │ └── repositories/
│ │ │ ├── user.repository.ts
│ │ │ ├── incident.repository.ts
│ │ │ └── notification.repository.ts
│ │ │
│ │ ├── cache/
│ │ │ ├── redis.client.ts
│ │ │ ├── cache.manager.ts
│ │ │ ├── cache.service.ts
│ │ │ ├── decorators/
│ │ │ │ ├── cacheable.decorator.ts
│ │ │ │ ├── cache-invalidate.decorator.ts
│ │ │ │ └── cache-update.decorator.ts
│ │ │ └── strategies/
│ │ │ ├── cache-strategy.interface.ts
│ │ │ ├── ttl.strategy.ts
│ │ │ └── lru.strategy.ts
│ │ │
│ │ ├── search/
│ │ │ ├── elasticsearch.client.ts
│ │ │ ├── search.service.ts
│ │ │ ├── indexers/
│ │ │ │ ├── incident.indexer.ts
│ │ │ │ ├── user.indexer.ts
│ │ │ │ └── base.indexer.ts
│ │ │ ├── mappings/
│ │ │ │ ├── incident.mapping.ts
│ │ │ │ └── user.mapping.ts
│ │ │ └── queries/
│ │ │ ├── query.builder.ts
│ │ │ └── aggregation.builder.ts
│ │ │
│ │ ├── queue/
│ │ │ ├── queue.manager.ts
│ │ │ ├── bull.client.ts
│ │ │ ├── queues/
│ │ │ │ ├── notification.queue.ts
│ │ │ │ ├── email.queue.ts
│ │ │ │ ├── sms.queue.ts
│ │ │ │ └── analytics.queue.ts
│ │ │ ├── processors/
│ │ │ │ ├── notification.processor.ts
│ │ │ │ ├── email.processor.ts
│ │ │ │ ├── sms.processor.ts
│ │ │ │ └── analytics.processor.ts
│ │ │ └── jobs/
│ │ │ ├── base.job.ts
│ │ │ ├── notification.job.ts
│ │ │ └── types.ts
│ │ │
│ │ ├── storage/
│ │ │ ├── s3.client.ts
│ │ │ ├── storage.service.ts
│ │ │ └── providers/
│ │ │ ├── minio.provider.ts
│ │ │ └── s3.provider.ts
│ │ │
│ │ ├── websocket/
│ │ │ ├── socket.server.ts
│ │ │ ├── socket.service.ts
│ │ │ ├── adapters/
│ │ │ │ └── redis.adapter.ts
│ │ │ ├── handlers/
│ │ │ │ ├── incident.handler.ts
│ │ │ │ └── notification.handler.ts
│ │ │ └── middleware/
│ │ │ └── socket-auth.middleware.ts
│ │ │
│ │ ├── monitoring/
│ │ │ ├── health/
│ │ │ │ ├── health-check.service.ts
│ │ │ │ ├── indicators/
│ │ │ │ │ ├── database.health.ts
│ │ │ │ │ ├── redis.health.ts
│ │ │ │ │ └── elasticsearch.health.ts
│ │ │ │ └── health.controller.ts
│ │ │ ├── metrics/
│ │ │ │ ├── metrics.service.ts
│ │ │ │ ├── collectors/
│ │ │ │ │ ├── http.collector.ts
│ │ │ │ │ ├── queue.collector.ts
│ │ │ │ │ └── business.collector.ts
│ │ │ │ └── metrics.controller.ts
│ │ │ └── logging/
│ │ │ ├── logger.factory.ts
│ │ │ └── transports/
│ │ │ ├── elasticsearch.transport.ts
│ │ │ └── file.transport.ts
│ │ │
│ │ └── integrations/
│ │ ├── email/
│ │ │ ├── email.service.ts
│ │ │ └── providers/
│ │ │ ├── sendgrid.provider.ts
│ │ │ └── smtp.provider.ts
│ │ ├── sms/
│ │ │ ├── sms.service.ts
│ │ │ └── providers/
│ │ │ └── twilio.provider.ts
│ │ └── push/
│ │ ├── push.service.ts
│ │ └── providers/
│ │ └── fcm.provider.ts
│ │
│ ├── shared/
│ │ ├── context/
│ │ │ ├── index.ts
│ │ │ └── request-context.ts
│ │ ├── middleware/
│ │ │ ├── index.ts
│ │ │ ├── context.middleware.ts
│ │ │ ├── error-handler.middleware.ts
│ │ │ ├── response-logger.middleware.ts
│ │ │ └── async-handler.middleware.ts
│ │ ├── response/
│ │ │ ├── index.ts
│ │ │ ├── base-response.ts
│ │ │ ├── error-response.ts
│ │ │ ├── success-response.ts
│ │ │ ├── common-error.ts
│ │ │ ├── http-error.ts
│ │ │ ├── types.ts
│ │ │ └── result-helper.ts
│ │ ├── utils/
│ │ │ ├── index.ts
│ │ │ ├── crypto.ts
│ │ │ ├── logger.ts
│ │ │ ├── error-serializer.ts
│ │ │ ├── response-helper.ts
│ │ │ ├── date.utils.ts
│ │ │ ├── validation.utils.ts
│ │ │ └── retry.utils.ts
│ │ ├── decorators/
│ │ │ ├── auth.decorator.ts
│ │ │ ├── validate.decorator.ts
│ │ │ └── rate-limit.decorator.ts
│ │ └── types/
│ │ ├── pagination.types.ts
│ │ ├── filter.types.ts
│ │ └── common.types.ts
│ │
│ ├── workers/
│ │ ├── index.ts
│ │ ├── worker.bootstrap.ts
│ │ └── scheduled/
│ │ ├── cleanup.worker.ts
│ │ ├── analytics.worker.ts
│ │ └── health-check.worker.ts
│ │
│ ├── scripts/
│ │ ├── migrate.ts
│ │ ├── seed.ts
│ │ ├── create-indexes.ts
│ │ └── setup-elasticsearch.ts
│ │
│ ├── app.ts
│ └── server.ts
│
├── docker/
│ ├── mysql/
│ │ ├── conf.d/
│ │ │ └── custom.cnf
│ │ └── init/
│ │ └── 01-init.sql
│ ├── redis/
│ │ └── redis.conf
│ ├── nginx/
│ │ └── nginx.conf
│ └── elasticsearch/
│ └── elasticsearch.yml
│
├── tests/
│ ├── unit/
│ │ ├── services/
│ │ ├── repositories/
│ │ └── utils/
│ ├── integration/
│ │ ├── api/
│ │ └── infrastructure/
│ ├── e2e/
│ │ └── scenarios/
│ └── fixtures/
│ └── data/
│
├── .github/
│ └── workflows/
│ ├── ci.yml
│ ├── deploy.yml
│ └── codeql.yml
│
├── docs/
│ ├── api/
│ │ └── openapi.yml
│ ├── architecture/
│ │ ├── overview.md
│ │ └── decisions/
│ └── deployment/
│ └── README.md
│
├── k8s/
│ ├── base/
│ │ ├── deployment.yaml
│ │ ├── service.yaml
│ │ └── configmap.yaml
│ └── overlays/
│ ├── development/
│ └── production/
│
├── .env.example
├── .dockerignore
├── .eslintignore
├── .eslintrc.json
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── ecosystem.config.js # PM2 config
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
