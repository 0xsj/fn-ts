#!/bin/bash

# User IDs
USER1="3a598209-8d10-4869-8bb0-9c535ab4a62f"
USER2="53f2de6f-3158-4737-a5d4-610ce14a1d42"
USER3="8f9557f5-bf51-40c8-bf24-c3a8c8d039b9"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to time requests
time_request() {
  local start=$(date +%s%N)
  curl -s "$@" > /dev/null
  local end=$(date +%s%N)
  local duration=$((($end - $start) / 1000000))
  echo "${duration}ms"
}

echo -e "${GREEN}=== Cache Test with Existing Users ===${NC}"

# Clear cache first
echo -e "\n${YELLOW}Clearing cache...${NC}"
docker exec fn-redis redis-cli FLUSHDB > /dev/null
echo "Cache cleared. Keys in DB: $(docker exec fn-redis redis-cli DBSIZE)"

# Test each user
for USER_ID in $USER1 $USER2 $USER3; do
  echo -e "\n${YELLOW}Testing User: $USER_ID${NC}"
  
  echo -n "  First request (miss): "
  time_request http://localhost:3000/api/v1/users/$USER_ID
  
  echo -n "  Second request (hit): "
  time_request http://localhost:3000/api/v1/users/$USER_ID
  
  echo -n "  Third request (hit): "
  time_request http://localhost:3000/api/v1/users/$USER_ID
done

# Show cache contents
echo -e "\n${YELLOW}Cache contents:${NC}"
docker exec fn-redis redis-cli KEYS 'fn:cache:*' | sort

# Test invalidation
echo -e "\n${YELLOW}Testing cache invalidation...${NC}"
echo "Updating user $USER1..."
curl -s -X PUT http://localhost:3000/api/v1/users/$USER1 \
  -H "Content-Type: application/json" \
  -d '{"firstName": "CacheTest"}' > /dev/null

echo -n "Fetch after update (miss): "
time_request http://localhost:3000/api/v1/users/$USER1

echo -e "\n${GREEN}Test complete!${NC}"
