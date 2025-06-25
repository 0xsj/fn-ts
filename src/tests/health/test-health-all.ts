// src/tests/test-health-all.ts
import 'reflect-metadata';
import { DIContainer } from '../../core/di/container';
import { DatabaseHealthIndicator,MemoryHealthIndicator, RedisHealthIndicator, DiskHealthIndicator } from '../../infrastructure/monitoring/health/indicators';

async function testAllHealthIndicators() {
  console.log('🏥 Testing All Health Indicators\n');

  try {
    await DIContainer.initialize();
    
    const indicators = [
      new DatabaseHealthIndicator(),
      new RedisHealthIndicator(),
      new DiskHealthIndicator(),
      new MemoryHealthIndicator(),
    ];
    
    for (const indicator of indicators) {
      console.log(`\n📋 Checking ${indicator.name.toUpperCase()} Health`);
      console.log('─'.repeat(40));
      
      try {
        const result = await indicator.check();
        console.log(`Status: ${result.status === 'healthy' ? '✅' : result.status === 'degraded' ? '⚠️' : '❌'} ${result.status}`);
        console.log(`Response Time: ${result.responseTime}ms`);
        
        if (result.details) {
          console.log('Details:');
          Object.entries(result.details).forEach(([key, value]) => {
            if (typeof value === 'object') {
              console.log(`  ${key}:`);
              Object.entries(value).forEach(([k, v]) => {
                console.log(`    ${k}: ${v}`);
              });
            } else {
              console.log(`  ${key}: ${value}`);
            }
          });
        }
        
        if (result.error) {
          console.log(`Error: ${result.error}`);
        }
      } catch (error) {
        console.error(`❌ Failed to check ${indicator.name}:`, error);
      }
    }
    
    console.log('\n✅ All health checks completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await DIContainer.dispose();
    process.exit(0);
  }
}

testAllHealthIndicators();