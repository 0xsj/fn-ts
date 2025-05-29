<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## project plan

```
src/
├── common/
│   ├── constants/
│   │   ├── error-codes.constant.ts
│   │   ├── roles.constant.ts
│   │   ├── permissions.constant.ts
│   │   ├── cache-keys.constant.ts
│   │   ├── queue-names.constant.ts
│   │   └── socket-events.constant.ts
│   ├── decorators/
│   │   ├── api-response.decorator.ts
│   │   ├── auth.decorator.ts
│   │   ├── permissions.decorator.ts
│   │   ├── roles.decorator.ts
│   │   ├── user.decorator.ts
│   │   ├── validation.decorator.ts
│   │   ├── cache.decorator.ts
│   │   └── socket-auth.decorator.ts
│   ├── dto/
│   │   ├── base-query.dto.ts
│   │   ├── pagination.dto.ts
│   │   ├── base-response.dto.ts
│   │   └── socket-response.dto.ts
│   ├── enums/
│   │   ├── user-status.enum.ts
│   │   ├── notification-type.enum.ts
│   │   ├── permission.enum.ts
│   │   ├── audit-action.enum.ts
│   │   ├── task-status.enum.ts
│   │   ├── socket-event.enum.ts
│   │   └── process-type.enum.ts
│   ├── errors/
│   │   ├── base.error.ts
│   │   ├── business.error.ts
│   │   ├── validation.error.ts
│   │   ├── not-found.error.ts
│   │   ├── unauthorized.error.ts
│   │   ├── forbidden.error.ts
│   │   ├── conflict.error.ts
│   │   ├── rate-limit.error.ts
│   │   └── external-service.error.ts
│   ├── filters/
│   │   ├── result-response.filter.ts
│   │   ├── global-error.filter.ts
│   │   └── socket-error.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   ├── permissions.guard.ts
│   │   ├── rate-limit.guard.ts
│   │   └── socket-auth.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── result-transform.interceptor.ts
│   │   ├── audit.interceptor.ts
│   │   ├── cache.interceptor.ts
│   │   └── correlation-id.interceptor.ts
│   ├── interfaces/
│   │   ├── base-entity.interface.ts
│   │   ├── paginated-response.interface.ts
│   │   ├── jwt-payload.interface.ts
│   │   ├── audit-log.interface.ts
│   │   ├── notification-payload.interface.ts
│   │   ├── task-payload.interface.ts
│   │   ├── socket-client.interface.ts
│   │   └── process-message.interface.ts
│   ├── middleware/
│   │   ├── correlation-id.middleware.ts
│   │   ├── security-headers.middleware.ts
│   │   ├── request-logging.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── pipes/
│   │   ├── validation.pipe.ts
│   │   ├── parse-uuid.pipe.ts
│   │   ├── sanitization.pipe.ts
│   │   └── result-validation.pipe.ts
│   ├── types/
│   │   ├── express.d.ts
│   │   ├── jwt.types.ts
│   │   ├── result.types.ts
│   │   ├── error.types.ts
│   │   ├── socket.types.ts
│   │   ├── task.types.ts
│   │   └── common.types.ts
│   └── utils/
│       ├── result.util.ts
│       ├── crypto.util.ts
│       ├── date.util.ts
│       ├── string.util.ts
│       ├── validation.util.ts
│       ├── retry.util.ts
│       └── process.util.ts
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── auth.config.ts
│   ├── cache.config.ts
│   ├── redis.config.ts
│   ├── queue.config.ts
│   ├── email.config.ts
│   ├── storage.config.ts
│   ├── socket.config.ts
│   ├── worker.config.ts
│   └── index.ts
├── database/
│   ├── migrations/
│   ├── seeders/
│   │   ├── user.seeder.ts
│   │   ├── role.seeder.ts
│   │   ├── permission.seeder.ts
│   │   └── organization.seeder.ts
│   ├── entities/
│   │   ├── base.entity.ts
│   │   ├── user.entity.ts
│   │   ├── role.entity.ts
│   │   ├── permission.entity.ts
│   │   ├── organization.entity.ts
│   │   ├── audit-log.entity.ts
│   │   ├── setting.entity.ts
│   │   ├── task.entity.ts
│   │   ├── notification.entity.ts
│   │   └── file.entity.ts
│   └── repositories/
│       ├── base.repository.ts
│       ├── user.repository.ts
│       ├── task.repository.ts
│       └── audit.repository.ts
├── modules/
│   ├── auth/
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   ├── refresh-token.dto.ts
│   │   │   ├── reset-password.dto.ts
│   │   │   ├── change-password.dto.ts
│   │   │   └── mfa.dto.ts
│   │   ├── guards/
│   │   │   ├── local-auth.guard.ts
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── mfa.guard.ts
│   │   ├── strategies/
│   │   │   ├── local.strategy.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   ├── interfaces/
│   │   │   ├── auth-response.interface.ts
│   │   │   └── jwt-payload.interface.ts
│   │   ├── errors/
│   │   │   ├── invalid-credentials.error.ts
│   │   │   ├── account-locked.error.ts
│   │   │   └── token-expired.error.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── user/
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   ├── update-user.dto.ts
│   │   │   ├── user-query.dto.ts
│   │   │   └── user-response.dto.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── errors/
│   │   │   ├── user-not-found.error.ts
│   │   │   ├── user-already-exists.error.ts
│   │   │   └── user-inactive.error.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── user.module.ts
│   ├── roles/
│   │   ├── dto/
│   │   │   ├── create-role.dto.ts
│   │   │   ├── update-role.dto.ts
│   │   │   └── assign-role.dto.ts
│   │   ├── entities/
│   │   │   └── role.entity.ts
│   │   ├── errors/
│   │   │   ├── role-not-found.error.ts
│   │   │   └── role-already-exists.error.ts
│   │   ├── roles.controller.ts
│   │   ├── roles.service.ts
│   │   └── roles.module.ts
│   ├── permissions/
│   │   ├── dto/
│   │   │   ├── create-permission.dto.ts
│   │   │   └── assign-permission.dto.ts
│   │   ├── entities/
│   │   │   └── permission.entity.ts
│   │   ├── errors/
│   │   │   └── permission-denied.error.ts
│   │   ├── permissions.controller.ts
│   │   ├── permissions.service.ts
│   │   └── permissions.module.ts
│   ├── organizations/
│   │   ├── dto/
│   │   │   ├── create-organization.dto.ts
│   │   │   ├── update-organization.dto.ts
│   │   │   └── organization-query.dto.ts
│   │   ├── entities/
│   │   │   └── organization.entity.ts
│   │   ├── errors/
│   │   │   ├── organization-not-found.error.ts
│   │   │   └── organization-limit-exceeded.error.ts
│   │   ├── organizations.controller.ts
│   │   ├── organizations.service.ts
│   │   └── organizations.module.ts
│   ├── audit/
│   │   ├── dto/
│   │   │   ├── audit-query.dto.ts
│   │   │   └── audit-response.dto.ts
│   │   ├── entities/
│   │   │   └── audit-log.entity.ts
│   │   ├── audit.controller.ts
│   │   ├── audit.service.ts
│   │   └── audit.module.ts
│   ├── notifications/
│   │   ├── dto/
│   │   │   ├── send-notification.dto.ts
│   │   │   ├── notification-query.dto.ts
│   │   │   └── notification-response.dto.ts
│   │   ├── providers/
│   │   │   ├── email.provider.ts
│   │   │   ├── sms.provider.ts
│   │   │   ├── push.provider.ts
│   │   │   └── websocket.provider.ts
│   │   ├── templates/
│   │   │   ├── welcome.template.ts
│   │   │   ├── password-reset.template.ts
│   │   │   └── notification.template.ts
│   │   ├── entities/
│   │   │   └── notification.entity.ts
│   │   ├── errors/
│   │   │   ├── notification-failed.error.ts
│   │   │   └── template-not-found.error.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   └── notifications.module.ts
│   ├── files/
│   │   ├── dto/
│   │   │   ├── upload-file.dto.ts
│   │   │   ├── file-query.dto.ts
│   │   │   └── file-response.dto.ts
│   │   ├── entities/
│   │   │   └── file.entity.ts
│   │   ├── interceptors/
│   │   │   └── file-upload.interceptor.ts
│   │   ├── errors/
│   │   │   ├── file-too-large.error.ts
│   │   │   ├── invalid-file-type.error.ts
│   │   │   └── file-not-found.error.ts
│   │   ├── files.controller.ts
│   │   ├── files.service.ts
│   │   └── files.module.ts
│   ├── settings/
│   │   ├── dto/
│   │   │   ├── create-setting.dto.ts
│   │   │   ├── update-setting.dto.ts
│   │   │   └── setting-query.dto.ts
│   │   ├── entities/
│   │   │   └── setting.entity.ts
│   │   ├── errors/
│   │   │   └── setting-not-found.error.ts
│   │   ├── settings.controller.ts
│   │   ├── settings.service.ts
│   │   └── settings.module.ts
│   ├── tasks/
│   │   ├── dto/
│   │   │   ├── create-task.dto.ts
│   │   │   ├── task-query.dto.ts
│   │   │   └── task-response.dto.ts
│   │   ├── entities/
│   │   │   └── task.entity.ts
│   │   ├── processors/
│   │   │   ├── email-task.processor.ts
│   │   │   ├── data-export.processor.ts
│   │   │   ├── cleanup.processor.ts
│   │   │   └── report-generation.processor.ts
│   │   ├── workers/
│   │   │   ├── cpu-intensive.worker.ts
│   │   │   ├── file-processing.worker.ts
│   │   │   └── data-migration.worker.ts
│   │   ├── errors/
│   │   │   ├── task-failed.error.ts
│   │   │   └── worker-timeout.error.ts
│   │   ├── tasks.controller.ts
│   │   ├── tasks.service.ts
│   │   └── tasks.module.ts
│   ├── websocket/
│   │   ├── dto/
│   │   │   ├── socket-message.dto.ts
│   │   │   └── room-join.dto.ts
│   │   ├── guards/
│   │   │   └── ws-auth.guard.ts
│   │   ├── gateways/
│   │   │   ├── chat.gateway.ts
│   │   │   ├── notifications.gateway.ts
│   │   │   └── real-time.gateway.ts
│   │   ├── middleware/
│   │   │   └── ws-auth.middleware.ts
│   │   ├── websocket.service.ts
│   │   └── websocket.module.ts
│   ├── monitoring/
│   │   ├── dto/
│   │   │   ├── health-check.dto.ts
│   │   │   └── metrics.dto.ts
│   │   ├── health/
│   │   │   ├── database.health.ts
│   │   │   ├── redis.health.ts
│   │   │   ├── queue.health.ts
│   │   │   └── external-service.health.ts
│   │   ├── metrics/
│   │   │   ├── api.metrics.ts
│   │   │   ├── system.metrics.ts
│   │   │   ├── business.metrics.ts
│   │   │   └── custom.metrics.ts
│   │   ├── monitoring.controller.ts
│   │   ├── monitoring.service.ts
│   │   └── monitoring.module.ts
│   └── templates/
│       ├── dto/
│       │   ├── create-template.dto.ts
│       │   ├── render-template.dto.ts
│       │   └── template-query.dto.ts
│       ├── entities/
│       │   └── template.entity.ts
│       ├── engines/
│       │   ├── handlebars.engine.ts
│       │   ├── mustache.engine.ts
│       │   └── liquid.engine.ts
│       ├── errors/
│       │   ├── template-not-found.error.ts
│       │   └── template-render.error.ts
│       ├── templates.controller.ts
│       ├── templates.service.ts
│       └── templates.module.ts
├── shared/
│   ├── logging/
│   │   ├── logging.service.ts
│   │   ├── logging.module.ts
│   │   ├── winston.config.ts
│   │   └── correlation.logger.ts
│   ├── cache/
│   │   ├── cache.service.ts
│   │   ├── cache.module.ts
│   │   ├── redis.service.ts
│   │   ├── providers/
│   │   │   ├── redis.provider.ts
│   │   │   ├── memory.provider.ts
│   │   │   └── distributed.provider.ts
│   │   └── decorators/
│   │       ├── cacheable.decorator.ts
│   │       └── cache-evict.decorator.ts
│   ├── queue/
│   │   ├── queue.service.ts
│   │   ├── queue.module.ts
│   │   ├── bull.config.ts
│   │   ├── processors/
│   │   │   ├── email.processor.ts
│   │   │   ├── notification.processor.ts
│   │   │   ├── audit.processor.ts
│   │   │   ├── file-processing.processor.ts
│   │   │   └── data-sync.processor.ts
│   │   ├── jobs/
│   │   │   ├── email.job.ts
│   │   │   ├── cleanup.job.ts
│   │   │   ├── backup.job.ts
│   │   │   └── report.job.ts
│   │   └── workers/
│   │       ├── cpu-worker.ts
│   │       ├── io-worker.ts
│   │       └── background-worker.ts
│   ├── storage/
│   │   ├── storage.service.ts
│   │   ├── storage.module.ts
│   │   └── providers/
│   │       ├── local.provider.ts
│   │       ├── s3.provider.ts
│   │       ├── gcs.provider.ts
│   │       └── azure.provider.ts
│   ├── email/
│   │   ├── email.service.ts
│   │   ├── email.module.ts
│   │   └── providers/
│   │       ├── smtp.provider.ts
│   │       ├── sendgrid.provider.ts
│   │       ├── ses.provider.ts
│   │       └── mailgun.provider.ts
│   ├── scheduler/
│   │   ├── scheduler.service.ts
│   │   ├── scheduler.module.ts
│   │   └── tasks/
│   │       ├── cleanup.task.ts
│   │       ├── backup.task.ts
│   │       ├── health-check.task.ts
│   │       └── maintenance.task.ts
│   ├── events/
│   │   ├── event-emitter.service.ts
│   │   ├── event-emitter.module.ts
│   │   ├── handlers/
│   │   │   ├── user-created.handler.ts
│   │   │   ├── password-reset.handler.ts
│   │   │   └── audit-log.handler.ts
│   │   └── events/
│   │       ├── user.events.ts
│   │       ├── auth.events.ts
│   │       └── system.events.ts
│   ├── external/
│   │   ├── http.service.ts
│   │   ├── http.module.ts
│   │   └── clients/
│   │       ├── payment.client.ts
│   │       ├── sms.client.ts
│   │       └── analytics.client.ts
│   └── process/
│       ├── process-manager.service.ts
│       ├── process-manager.module.ts
│       ├── worker-pool.service.ts
│       ├── cluster.service.ts
│       └── ipc/
│           ├── message-broker.ts
│           └── worker-communication.ts
├── workers/
│   ├── main.worker.ts
│   ├── cpu-intensive.worker.ts
│   ├── file-processing.worker.ts
│   ├── data-export.worker.ts
│   └── email-batch.worker.ts
├── app.controller.ts
├── app.service.ts
├── app.module.ts
└── main.ts

test/
├── unit/
│   ├── common/
│   ├── modules/
│   └── shared/
├── integration/
│   ├── auth/
│   ├── user/
│   └── tasks/
├── e2e/
│   ├── auth.e2e-spec.ts
│   ├── user.e2e-spec.ts
│   └── websocket.e2e-spec.ts
├── fixtures/
│   ├── users.fixture.ts
│   ├── roles.fixture.ts
│   └── organizations.fixture.ts
└── helpers/
    ├── test-database.helper.ts
    ├── auth.helper.ts
    └── result.helper.ts

docs/
├── api/
│   ├── swagger.json
│   └── postman/
├── architecture/
│   ├── result-types.md
│   ├── error-handling.md
│   ├── caching-strategy.md
│   ├── queue-processing.md
│   └── websocket-design.md
└── deployment/
    ├── docker/
    ├── kubernetes/
    └── monitoring/

scripts/
├── build.sh
├── deploy.sh
├── seed.sh
├── worker.sh
└── migrate.sh

docker/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
└── workers/
    └── Dockerfile.worker
```
