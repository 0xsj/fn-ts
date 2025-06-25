#!/bin/bash
# test-rate-limit-simple.sh

echo "Testing rate limiting with 10 request limit..."

# Make 15 requests to trigger rate limit
for i in {1..15}; do
  response=$(curl -s -w "\nSTATUS:%{http_code}\n" -X POST http://localhost:3000/api/v1/users \
    -H "Content-Type: application/json" \
    -d "{
      \"firstName\": \"Test\",
      \"lastName\": \"User$i\",
      \"email\": \"test$(date +%s)$i@example.com\",
      \"phone\": \"1234567890\",
      \"password\": \"password123\"
    }")
  
  status=$(echo "$response" | grep "STATUS:" | cut -d: -f2)
  
  if [ "$status" = "429" ]; then
    echo "Rate limited at request $i!"
    body=$(echo "$response" | sed '/STATUS:/d')
    echo "$body" | jq '.'
    break
  else
    echo "Request $i: Status $status"
  fi
done