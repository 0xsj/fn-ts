// src/tests/test-redis.ts
import { RedisClient } from '../infrastructure/cache/redis.client';

async function testRedis() {
  console.log('Testing Redis connection...');

  try {
    const redis = RedisClient.getInstance();
    await redis.connect();

    const client = redis.getClient();

    // Test basic operations
    console.log('Setting test key...');
    await client.set('test:key', 'test-value');

    console.log('Getting test key...');
    const value = await client.get('test:key');
    console.log('Value:', value);

    // Test sorted set operations (used by sliding window)
    console.log('\nTesting sorted set operations...');
    const key = 'test:zset';

    await client.zAdd(key, { score: 1, value: 'one' });
    await client.zAdd(key, { score: 2, value: 'two' });
    await client.zAdd(key, { score: 3, value: 'three' });

    const count = await client.zCount(key, '0', '+inf');
    console.log('Count:', count);

    // Cleanup
    await client.del(['test:key', key]);

    console.log('\n✅ Redis is working correctly!');
  } catch (error) {
    console.error('❌ Redis test failed:', error);
  }
}

testRedis();
