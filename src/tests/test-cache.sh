#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Extract user ID - adjust this based on your actual response format
USER_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | sed 's/"id":"//')

if [ -z "$USER_ID" ]; then
  echo -e "${RED}Failed to create user or extract ID${NC}"
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

sleep 0.5

echo -n "Second fetch (cache hit): "
TIME2=$(time_request http://localhost:3000/api/v1/users/$USER_ID)
echo $TIME2

echo -n "Third fetch (cache hit): "
TIME3=$(time_request http://localhost:3000/api/v1/users/$USER_ID)
echo $TIME3

# Test list caching
echo -e "\n${YELLOW}3. Testing list cache...${NC}"

echo -n "First fetch all users (cache miss): "
TIME_LIST1=$(time_request http://localhost:3000/api/v1/users)
echo $TIME_LIST1

echo -n "Second fetch all users (cache hit): "
TIME_LIST2=$(time_request http://localhost:3000/api/v1/users)
echo $TIME_LIST2

# Test cache invalidation
echo -e "\n${YELLOW}4. Testing cache invalidation...${NC}"

echo "Updating user..."
curl -s -X PUT http://localhost:3000/api/v1/users/$USER_ID \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Updated"}' > /dev/null

echo -n "Fetch after update (cache miss): "
TIME4=$(time_request http://localhost:3000/api/v1/users/$USER_ID)
echo $TIME4

echo -n "Fetch all users after update (cache miss due to tag invalidation): "
TIME_LIST3=$(time_request http://localhost:3000/api/v1/users)
echo $TIME_LIST3

# Clean up
echo -e "\n${YELLOW}5. Cleaning up...${NC}"
curl -s -X DELETE http://localhost:3000/api/v1/users/$USER_ID > /dev/null
echo "User deleted"

echo -e "\n${GREEN}=== Cache Test Complete ===${NC}"
echo -e "\n${YELLOW}Summary:${NC}"
echo "- Cache misses should be 20-100ms"
echo "- Cache hits should be 1-5ms"
echo "- The difference shows caching is working!"
