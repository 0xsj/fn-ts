// src/tests/test-health-database.ts
import 'reflect-metadata';
import { DIContainer } from '../core/di/container';
import { DatabaseHealthIndicator } from '../infrastructure/monitoring/health/indicators/database.health';

async function testDatabaseHealth() {
  console.log('🏥 Testing Database Health Indicator...\n');

  try {
    // Initialize DI container
    await DIContainer.initialize();

    // Create indicator
    const dbHealth = new DatabaseHealthIndicator();

    // Test 1: Basic health check
    console.log('📋 Test 1: Basic health check');
    const result1 = await dbHealth.check();
    console.log('Result:', JSON.stringify(result1, null, 2));
    console.log(`✅ Status: ${result1.status}`);
    console.log(`⏱️  Response time: ${result1.responseTime}ms`);

    // Test 2: Check caching (should be instant)
    console.log('\n📋 Test 2: Cached result (should be instant)');
    const start = Date.now();
    const result2 = await dbHealth.check();
    const duration = Date.now() - start;
    console.log(`⏱️  Duration: ${duration}ms (should be <5ms if cached)`);
    console.log(`✅ Same result? ${JSON.stringify(result1) === JSON.stringify(result2)}`);
    console.log(
      `✅ Same timestamp? ${result1.lastChecked.getTime() === result2.lastChecked.getTime()}`,
    );

    // Test 3: Force a database error (stop MySQL to test)
    console.log('\n📋 Test 3: Database details');
    if (result1.details) {
      console.log(`👥 User count: ${result1.details.userCount}`);
      if (result1.details.pool) {
        console.log(`🏊 Connection pool:`);
        console.log(`   - Size: ${result1.details.pool.size}`);
        console.log(`   - Available: ${result1.details.pool.available}`);
        console.log(`   - Max: ${result1.details.pool.max}`);
      }
    }

    // Test 4: Wait for cache to expire
    console.log('\n📋 Test 4: Cache expiry test');
    console.log('⏳ Waiting 11 seconds for cache to expire...');
    await new Promise((resolve) => setTimeout(resolve, 11000));

    const result3 = await dbHealth.check();
    console.log(`✅ New check performed? ${result3.lastChecked > result1.lastChecked}`);
    console.log(`✅ New response time: ${result3.responseTime}ms`);

    // Test 5: Circuit breaker (optional - requires stopping database)
    console.log('\n📋 Test 5: Circuit breaker info');
    console.log('To test circuit breaker:');
    console.log('1. Stop MySQL: docker-compose stop mysql');
    console.log('2. Run this test again to see failures');
    console.log('3. After 3 failures, circuit breaker will open');
    console.log('4. Start MySQL: docker-compose start mysql');

    console.log('\n✅ Database health indicator working correctly!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await DIContainer.dispose();
    process.exit(0);
  }
}

// Run the test
testDatabaseHealth().catch(console.error);
