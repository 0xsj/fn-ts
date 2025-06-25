#!/bin/bash

echo "🚀 Testing Queue System"
echo "======================"

# 1. Check queue metrics
echo -e "\n1️⃣ Checking Queue Metrics"
curl -s http://localhost:3000/api/v1/test/queues/metrics | jq

# 2. Test email queue
echo -e "\n2️⃣ Testing Email Queue"
curl -s -X POST http://localhost:3000/api/v1/test/queues/test/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email from Queue",
    "message": "This is a test message"
  }' | jq

sleep 2

# 3. Test notification queue
echo -e "\n3️⃣ Testing Notification Queue"
curl -s -X POST http://localhost:3000/api/v1/test/queues/test/notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "type": "email",
    "title": "Test Notification",
    "message": "This is a test notification"
  }' | jq

sleep 2

# 4. Check metrics again
echo -e "\n4️⃣ Checking Queue Metrics After Jobs"
curl -s http://localhost:3000/api/v1/test/queues/metrics | jq

# 5. Create a user to test event -> queue flow
echo -e "\n5️⃣ Creating User (should queue welcome email)"
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Queue",
    "lastName": "Test",
    "email": "queue.test'$(date +%s)'@example.com",
    "phone": "1234567890",
    "password": "password123"
  }' | jq '.data.id'

sleep 2

# 6. Final metrics check
echo -e "\n6️⃣ Final Queue Metrics"
curl -s http://localhost:3000/api/v1/test/queues/metrics | jq

echo -e "\n✅ Queue test complete! Check logs for processing details."