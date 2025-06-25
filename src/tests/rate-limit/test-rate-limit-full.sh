#!/bin/bash
# test-rate-limit-full.sh

echo "🚦 Comprehensive Rate Limit Test"
echo "================================"

# First, let's check what's in Redis
echo -e "\n1️⃣ Checking current rate limit status..."
curl -I -s http://localhost:3000/api/v1/users | grep -i "x-ratelimit"

# Clear rate limit for clean test
echo -e "\n2️⃣ Clearing rate limit keys in Redis..."
docker exec fn-redis redis-cli --scan --pattern "ratelimit:*" | xargs -I {} docker exec fn-redis redis-cli DEL {} > /dev/null 2>&1
echo "Rate limit keys cleared"

# Now test with exactly 5 requests (the limit)
echo -e "\n3️⃣ Testing with limit of 5 requests..."
for i in {1..6}; do
  echo -n "Request $i: "
  
  response=$(curl -s -w "\nSTATUS:%{http_code}\nHEADERS:\n" -D - -X POST http://localhost:3000/api/v1/users \
    -H "Content-Type: application/json" \
    -d "{
      \"firstName\": \"RateTest\",
      \"lastName\": \"User$i\",
      \"email\": \"ratetest$(date +%s)$i@example.com\",
      \"phone\": \"1234567890\",
      \"password\": \"password123\"
    }" 2>/dev/null)
  
  status=$(echo "$response" | grep "STATUS:" | cut -d: -f2)
  
  # Extract rate limit headers
  limit=$(echo "$response" | grep -i "x-ratelimit-limit:" | awk '{print $2}' | tr -d '\r')
  remaining=$(echo "$response" | grep -i "x-ratelimit-remaining:" | awk '{print $2}' | tr -d '\r')
  
  echo "Status: $status | Limit: $limit | Remaining: $remaining"
  
  if [ "$status" = "429" ]; then
    echo -e "\n🚫 Rate limited!"
    retry=$(echo "$response" | grep -i "retry-after:" | awk '{print $2}' | tr -d '\r')
    echo "Retry-After: $retry seconds"
    
    # Show the error response
    body=$(echo "$response" | sed -n '/^{/,/^}/p')
    echo "Response body:"
    echo "$body" | jq '.'
    break
  fi
  
  sleep 0.2
done

# Test with different IPs
echo -e "\n4️⃣ Testing per-IP rate limiting..."
for ip in "10.0.0.1" "10.0.0.2"; do
  echo -n "Testing IP $ip: "
  
  response=$(curl -s -w "STATUS:%{http_code}" -X POST http://localhost:3000/api/v1/users \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: $ip" \
    -d "{
      \"firstName\": \"IPTest\",
      \"lastName\": \"User\",
      \"email\": \"iptest$(date +%s)@example.com\",
      \"phone\": \"1234567890\",
      \"password\": \"password123\"
    }")
  
  status=$(echo "$response" | grep -o "STATUS:[0-9]*" | cut -d: -f2)
  echo "Status: $status"
done

# Check GET endpoint (different limit)
echo -e "\n5️⃣ Testing GET endpoint (100 req limit)..."
headers=$(curl -I -s http://localhost:3000/api/v1/users)
echo "$headers" | grep -i "x-ratelimit"

echo -e "\n✅ Rate limit test complete!"