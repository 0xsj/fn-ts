// src/tests/logger-test.ts
import { ConsoleTransport } from '../infrastructure/monitoring/logging/transports/console.transport';
import { LogEntry } from '../infrastructure/monitoring/logging/types';

async function testConsoleTransport() {
  console.log('=== Testing Console Transport ===\n');

  const transport = new ConsoleTransport('debug');

  // Test different log levels
  const testEntries: LogEntry[] = [
    {
      level: 'info',
      message: 'Application started successfully',
      timestamp: new Date(),
      context: {
        service: 'test-app',
        module: 'bootstrap',
        correlationId: '123e4567-e89b-12d3-a456-426614174000',
      },
      data: { port: 3000, env: 'development' },
    },
    {
      level: 'error',
      message: 'Database connection failed',
      timestamp: new Date(),
      context: {
        service: 'test-app',
        module: 'database',
        correlationId: '123e4567-e89b-12d3-a456-426614174001',
      },
      error: new Error('Connection timeout after 30s'),
    },
    {
      level: 'debug',
      message: 'Cache hit for user data',
      timestamp: new Date(),
      context: {
        userId: 'user-123',
        method: 'getUserById',
        duration: 2,
      },
      data: { cacheKey: 'user:123', ttl: 3600 },
    },
  ];

  // Log each entry
  for (const entry of testEntries) {
    await transport.log(entry);
    console.log(''); // Add spacing
  }

  // Test that debug level filters out trace
  const traceEntry: LogEntry = {
    level: 'trace',
    message: 'This should not appear with debug level',
    timestamp: new Date(),
    context: {},
  };

  console.log('Testing level filtering (trace should not appear):');
  await transport.log(traceEntry);

  // Close transport
  await transport.close();
  console.log('\n=== Test Complete ===');
}

// Run the test
testConsoleTransport().catch(console.error);