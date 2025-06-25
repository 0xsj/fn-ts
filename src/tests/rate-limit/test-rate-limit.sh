#!/bin/bash
# test-rate-limit.sh

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚦 Testing Rate Limiting${NC}"
echo "================================"

# Test 1: Read endpoint rate limit (200 requests per 15 min)
echo -e "\n${YELLOW}1️⃣ Testing READ rate limit (GET /users)${NC}"
echo "Making 5 rapid requests..."

for i in {1..5}; do
  echo -n "Request $i: "
  response=$(curl -s -w "\nSTATUS:%{http_code}\n" http://localhost:3000/api/v1/users)
  status=$(echo "$response" | grep "STATUS:" | cut -d: -f2)
  
  # Extract rate limit headers
  headers=$(curl -s -I http://localhost:3000/api/v1/users)
  limit=$(echo "$headers" | grep -i "X-RateLimit-Limit:" | cut -d' ' -f2 | tr -d '\r')
  remaining=$(echo "$headers" | grep -i "X-RateLimit-Remaining:" | cut -d' ' -f2 | tr -d '\r')
  
  echo "Status: $status, Limit: $limit, Remaining: $remaining"
  sleep 0.1
done

# Test 2: Write endpoint rate limit (50 requests per 15 min)
echo -e "\n${YELLOW}2️⃣ Testing WRITE rate limit (POST /users)${NC}"
echo "Making rapid requests until rate limited..."

count=0
while true; do
  count=$((count + 1))
  response=$(curl -s -w "\nSTATUS:%{http_code}\n" -X POST http://localhost:3000/api/v1/users \
    -H "Content-Type: application/json" \
    -d "{
      \"firstName\": \"RateLimit\",
      \"lastName\": \"Test$count\",
      \"email\": \"ratelimit$count@example.com\",
      \"phone\": \"1234567890\",
      \"password\": \"password123\"
    }")
  
  status=$(echo "$response" | grep "STATUS:" | cut -d: -f2)
  
  if [ "$status" = "429" ]; then
    echo -e "${RED}Rate limited at request $count!${NC}"
    
    # Show rate limit error response
    body=$(echo "$response" | sed '/STATUS:/d')
    echo "Response: $body" | jq '.'
    
    # Get Retry-After header
    headers=$(curl -s -I -X POST http://localhost:3000/api/v1/users \
      -H "Content-Type: application/json" \
      -d '{"test": "data"}')
    retry_after=$(echo "$headers" | grep -i "Retry-After:" | cut -d' ' -f2 | tr -d '\r')
    echo -e "Retry-After: ${retry_after} seconds"
    
    break
  else
    echo "Request $count: Status $status ✓"
  fi
  
  # Safety break
  if [ $count -gt 60 ]; then
    echo "Reached safety limit without rate limiting"
    break
  fi
done

# Test 3: Testing different IP addresses
echo -e "\n${YELLOW}3️⃣ Testing per-IP rate limiting${NC}"
echo "Making requests with different X-Forwarded-For headers..."

for ip in "192.168.1.100" "192.168.1.101" "192.168.1.102"; do
  echo -n "IP $ip: "
  response=$(curl -s -w "\nSTATUS:%{http_code}\n" http://localhost:3000/api/v1/users \
    -H "X-Forwarded-For: $ip")
  status=$(echo "$response" | grep "STATUS:" | cut -d: -f2)
  echo "Status: $status"
done

# Test 4: Check rate limit headers
echo -e "\n${YELLOW}4️⃣ Checking rate limit headers${NC}"
headers=$(curl -s -I http://localhost:3000/api/v1/users)
echo "$headers" | grep -i "X-RateLimit"

# Test 5: Wait and retry
echo -e "\n${YELLOW}5️⃣ Testing rate limit reset${NC}"
if [ ! -z "$retry_after" ] && [ "$retry_after" -gt 0 ]; then
  echo "Waiting $retry_after seconds for rate limit to reset..."
  sleep $retry_after
  
  echo "Retrying request..."
  response=$(curl -s -w "\nSTATUS:%{http_code}\n" -X POST http://localhost:3000/api/v1/users \
    -H "Content-Type: application/json" \
    -d "{
      \"firstName\": \"AfterReset\",
      \"lastName\": \"Test\",
      \"email\": \"afterreset@example.com\",
      \"phone\": \"1234567890\",
      \"password\": \"password123\"
    }")
  
  status=$(echo "$response" | grep "STATUS:" | cut -d: -f2)
  echo "Status after reset: $status"
fi

echo -e "\n${GREEN}✅ Rate limit test complete!${NC}"