# Configuration Module

Type-safe configuration system with Zod validation and Factory pattern for NestJS applications.

## Overview

This module provides:

- **Type-safe configuration** with Zod schema validation
- **Factory pattern** for creating environment-specific configs
- **Environment file generation** and validation
- **NestJS integration** with ConfigService wrapper
- **Security features** like secret sanitization

## Quick Start

### 1. Setup in your NestJS module

```typescript
// app.module.ts
import { ConfigModule } from '@nestjs/config';
import { loadConfiguration, ConfigurationService } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [loadConfiguration],
      isGlobal: true,
      validate: (config) => configurationSchema.parse(config),
    }),
  ],
  providers: [ConfigurationService],
})
export class AppModule {}
```

### 2. Use in your services

```typescript
// some.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigurationService } from '../config';

@Injectable()
export class SomeService {
  constructor(private readonly config: ConfigurationService) {}

  someMethod() {
    const dbUrl = this.config.databaseUrl; // Type-safe!
    const isProduction = this.config.isProduction; // Boolean
    const jwtSecret = this.config.jwt.secret; // String
  }
}
```

## Configuration Files

### Environment File Hierarchy (highest to lowest priority)

1. `.env.local` _(ignored by git, highest priority)_
2. `.env.{NODE_ENV}` _(environment specific)_
3. `.env` _(default, lowest priority)_

### Generate Environment Files

```bash
# Generate all environment files
npm run config:generate

# Or programmatically
import { ConfigurationGenerator } from './config';

// Generate .env.example
ConfigurationGenerator.generateExample();

// Generate for specific environment
ConfigurationGenerator.generateDevelopment();
ConfigurationGenerator.generateTest();
ConfigurationGenerator.generateProductionTemplate();

// Generate all files
const files = ConfigurationGenerator.generateAll();
```

## Configuration Sections

### App Configuration

```typescript
const config = new ConfigurationService();

config.app.name; // string
config.app.environment; // 'development' | 'staging' | 'production' | 'test'
config.app.port; // number
config.app.cors; // { enabled: boolean, origins: string[], ... }
config.app.rateLimit; // { enabled: boolean, windowMs: number, ... }
```

### Database Configuration

```typescript
config.database.type; // 'postgres' | 'mysql' | 'sqlite'
config.database.host; // string
config.database.port; // number
config.databaseUrl; // Generated connection string
```

### Security Configuration

```typescript
config.security.jwt; // { secret: string, expiresIn: string, ... }
config.security.bcrypt; // { rounds: number }
config.security.session; // { secret: string, maxAge: number }
```

### Services Configuration

```typescript
config.services.redis; // { enabled: boolean, host: string, ... }
config.services.email; // { enabled: boolean, provider: string, ... }
config.services.storage; // { provider: string, local?: {...}, s3?: {...} }
```

## Environment Variables

### Required Variables

```bash
# Database (required)
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=myapp

# Security (required)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters
```

### Optional Variables (with defaults)

```bash
# App
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432

# Services
REDIS_ENABLED=false
EMAIL_ENABLED=false
```

## Factory Usage

### Environment-Specific Configurations

```typescript
import { ConfigurationFactory } from './config';

// Create for specific environment
const devConfig = ConfigurationFactory.createDevelopmentConfig();
const testConfig = ConfigurationFactory.createTestConfig();
const prodConfig = ConfigurationFactory.createProductionConfig();

// Create for any environment
const stagingConfig = ConfigurationFactory.createForEnvironment('staging');
```

### Custom Configurations

```typescript
// Create from partial data (useful for testing)
const customConfig = ConfigurationFactory.createFromData({
  app: { port: 4000 },
  database: { host: 'custom-db' },
});

// Validation only
const result = ConfigurationFactory.validate(someData);
if (!result.success) {
  console.error('Validation errors:', result.errors);
}
```

## Development Workflow

### 1. Initial Setup

```bash
# Generate .env.example and environment files
npm run config:generate

# Copy example to start your local config
cp .env.example .env

# Edit .env with your actual values
vim .env
```

### 2. Adding New Configuration

```typescript
// 1. Update schema in configuration.schema.ts
const newConfigSchema = z.object({
  newFeature: z.object({
    enabled: z.boolean().default(false),
    apiKey: z.string().optional(),
  }),
});

// 2. Add to main schema
export const configurationSchema = z.object({
  // ... existing config
  newFeature: newConfigSchema,
});

// 3. Add environment mapping
export const environmentMapping = {
  // ... existing mappings
  'NEW_FEATURE_ENABLED': 'newFeature.enabled',
  'NEW_FEATURE_API_KEY': 'newFeature.apiKey',
};

// 4. Update service getter
get newFeature() {
  return this.configService.get('newFeature', { infer: true });
}

// 5. Regenerate environment files
ConfigurationGenerator.generateExample();
```

### 3. Testing Configuration

```typescript
// In your tests
import { ConfigurationFactory } from '../config';

describe('SomeService', () => {
  let service: SomeService;

  beforeEach(() => {
    // Use test configuration
    const testConfig = ConfigurationFactory.createTestConfig();

    // Or create custom test config
    const customTestConfig = ConfigurationFactory.createFromData({
      database: { database: 'test_db' },
      logging: { level: 'error' },
    });
  });
});
```

## Validation

### Startup Validation

Configuration is automatically validated on application startup. If validation fails, the app will not start and will show detailed error messages.

### Manual Validation

```typescript
// Validate existing .env file
const result = ConfigurationGenerator.validateEnvFile('.env');
if (!result.valid) {
  console.error('Configuration errors:', result.errors);
}

// Validate data object
const validationResult = ConfigurationFactory.validate(configData);
```

## Security Best Practices

### 1. Environment Files

- **Never commit** `.env` or `.env.local` to version control
- **Do commit** `.env.example` as documentation
- **Use** `.env.production.template` for production deployment guides

### 2. Secrets Management

```typescript
// Get sanitized config (safe for logging)
const safeConfig = config.getSanitized();
logger.info('App started with config:', safeConfig);

// Sensitive values are automatically redacted:
// { jwt: { secret: '[REDACTED]' }, database: { password: '[REDACTED]' } }
```

### 3. Production Validation

The factory includes additional production-specific validations:

- Ensures `synchronize: false` for database
- Validates required secrets are present
- Confirms environment is set to 'production'

## TypeScript Integration

All configuration is fully typed:

```typescript
// Types are automatically inferred from Zod schema
type AppConfig = z.infer<typeof appConfigSchema>; // ✅ Automatic

// IntelliSense works everywhere
config.database.  // ← Shows: type, host, port, username, etc.
config.app.      // ← Shows: name, environment, port, cors, etc.
```

## Troubleshooting

### Common Issues

1. **Validation Error on Startup**

   ```bash
   # Check which variables are missing or invalid
   npm run config:validate

   # Compare your .env with .env.example
   diff .env .env.example
   ```

2. **TypeScript Errors**

   ```typescript
   // Make sure you're importing the types
   import type { AppConfiguration } from './config';

   // Use the service for type-safe access
   constructor(private readonly config: ConfigurationService) {}
   ```

3. **Environment Not Loading**
   ```typescript
   // Check file exists and has correct name
   // Verify NODE_ENV matches your file: .env.development, .env.test, etc.
   console.log('NODE_ENV:', process.env.NODE_ENV);
   ```

## Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "config:generate": "tsx scripts/generate-env.ts",
    "config:validate": "tsx scripts/validate-env.ts"
  }
}
```

Create `scripts/generate-env.ts`:

```typescript
import { ConfigurationGenerator } from '../src/config';

const files = ConfigurationGenerator.generateAll();
console.log('✅ Generated files:', files);
```

Create `scripts/validate-env.ts`:

```typescript
import { ConfigurationGenerator } from '../src/config';

const result = ConfigurationGenerator.validateEnvFile('.env');
if (result.valid) {
  console.log('✅ Configuration is valid');
} else {
  console.error('❌ Configuration errors:', result.errors);
  process.exit(1);
}
```
