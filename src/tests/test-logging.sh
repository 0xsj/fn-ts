#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 Testing Logger Implementation${NC}"
echo "================================"

# Create a user with unique email
echo -e "\n${YELLOW}1️⃣ Creating user...${NC}"
EMAIL="test$(date +%s)@example.com"
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: create-user-$(date +%s)" \
  -d '{
    "firstName": "Logger",
    "lastName": "Test",
    "email": "'$EMAIL'",
    "phone": "1234567890",
    "password": "password123"
  }')

echo "Response: $CREATE_RESPONSE" | jq '.'

# Extract user ID and correlation ID
USER_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')
CORRELATION_ID=$(echo $CREATE_RESPONSE | jq -r '.meta.correlationId')

echo -e "Created User ID: ${GREEN}$USER_ID${NC}"
echo -e "Correlation ID: ${GREEN}$CORRELATION_ID${NC}"

sleep 1

# Fetch the created user
echo -e "\n${YELLOW}2️⃣ Fetching user by ID...${NC}"
curl -s http://localhost:3000/api/v1/users/$USER_ID \
  -H "X-Correlation-ID: fetch-user-$(date +%s)" | jq '.'

sleep 1

# List all users
echo -e "\n${YELLOW}3️⃣ Listing all users...${NC}"
curl -s http://localhost:3000/api/v1/users \
  -H "X-Correlation-ID: list-users-$(date +%s)" | jq '.data | length as $count | "Found \($count) users"'

sleep 1

# Try to fetch non-existent user (404 error)
echo -e "\n${YELLOW}4️⃣ Testing 404 error (non-existent user)...${NC}"
curl -s http://localhost:3000/api/v1/users/00000000-0000-0000-0000-000000000000 \
  -H "X-Correlation-ID: fetch-404-$(date +%s)" | jq '.'

sleep 1

# Test validation error
echo -e "\n${YELLOW}5️⃣ Testing validation error (missing fields)...${NC}"
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: validation-error-$(date +%s)" \
  -d '{"firstName": "OnlyFirstName"}' | jq '.'

sleep 1

# Test duplicate email (conflict error)
echo -e "\n${YELLOW}6️⃣ Testing conflict error (duplicate email)...${NC}"
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: conflict-error-$(date +%s)" \
  -d '{
    "firstName": "Duplicate",
    "lastName": "User",
    "email": "'$EMAIL'",
    "phone": "9876543210",
    "password": "password123"
  }' | jq '.'

sleep 1

# Update user
echo -e "\n${YELLOW}7️⃣ Updating user...${NC}"
curl -s -X PUT http://localhost:3000/api/v1/users/$USER_ID \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: update-user-$(date +%s)" \
  -d '{"firstName": "UpdatedLogger"}' | jq '.'

sleep 1

# Test invalid update (non-existent user)
echo -e "\n${YELLOW}8️⃣ Testing update on non-existent user...${NC}"
curl -s -X PUT http://localhost:3000/api/v1/users/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: update-404-$(date +%s)" \
  -d '{"firstName": "WontWork"}' | jq '.'

sleep 1

# Delete user
echo -e "\n${YELLOW}9️⃣ Deleting user...${NC}"
curl -s -X DELETE http://localhost:3000/api/v1/users/$USER_ID \
  -H "X-Correlation-ID: delete-user-$(date +%s)" | jq '.'

sleep 1

# Test delete on already deleted user
echo -e "\n${YELLOW}🔟 Testing delete on non-existent user...${NC}"
curl -s -X DELETE http://localhost:3000/api/v1/users/$USER_ID \
  -H "X-Correlation-ID: delete-404-$(date +%s)" | jq '.'

sleep 1

# Test non-existent route (404)
echo -e "\n${YELLOW}1️⃣1️⃣ Testing non-existent route...${NC}"
curl -s http://localhost:3000/api/v1/nonexistent \
  -H "X-Correlation-ID: route-404-$(date +%s)" | jq '.'

echo -e "\n${GREEN}✅ Test complete!${NC}"
echo -e "${YELLOW}Check your console for colored logs with:${NC}"
echo "- Request/response pairs with correlation IDs"
echo "- Different log levels (INFO for success, ERROR for failures)"
echo "- Request duration measurements"
echo "- Proper error serialization"