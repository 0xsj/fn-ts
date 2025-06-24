#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Cache Testing Script ===${NC}"

# Create a user and capture the response
echo -e "\n${YELLOW}1. Creating new user...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Cache",
    "lastName": "Test",
    "email": "cache.test.'$(date +%s)'@example.com",
    "phone": "1234567890",
    "password": "password123"
  }')

echo $RESPONSE

# Extract user ID using grep and sed (adjust based on your response format)
USER_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | sed 's/"id":"//')

if [ -z "$USER_ID" ]; then
  echo "Failed to create user or extract ID"
  exit 1
fi

echo -e "\n${GREEN}User created with ID: $USER_ID${NC}"

# Function to time a curl request
time_request() {
  local start=$(date +%s%N)
  curl -s "$@" > /dev/null
  local end=$(date +%s%N)
  local duration=$((($end - $start) / 1000000))
  echo "${duration}ms"
}

# Test cache hit/miss
echo -e "\n${YELLOW}2. Testing cache behavior...${NC}"

echo -n "First fetch (cache miss): "
TIME1=$(time_request http://localhost:3000/api/v1/users/$USER_ID)
echo $TIME1

echo -n "Second fetch (cache hit): "
TIME2=$(time_request http://localhost:3000/api/v1/users/$USER_ID)
echo $TIME2

echo -n "Third fetch (cache hit): "
TIME3=$(time_request http://localhost:3000/api/v1/users/$USER_ID)
echo $TIME3

# Test cache invalidation
echo -e "\n${YELLOW}3. Testing cache invalidation...${NC}"

echo "Updating user..."
curl -s -X PUT http://localhost:3000/api/v1/users/$USER_ID \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Updated"}' > /dev/null

echo -n "Fetch after update (cache miss): "
TIME4=$(time_request http://localhost:3000/api/v1/users/$USER_ID)
echo $TIME4

# Clean up
echo -e "\n${YELLOW}4. Cleaning up...${NC}"
curl -s -X DELETE http://localhost:3000/api/v1/users/$USER_ID > /dev/null
echo "User deleted"

echo -e "\n${GREEN}=== Cache Test Complete ===${NC}"