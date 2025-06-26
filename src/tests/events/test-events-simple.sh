#!/bin/bash

echo "🎯 Testing Event Bus with User Operations"
echo "========================================"

# Create user
EMAIL="test$(date +%s)@example.com"
echo -e "\n1️⃣ Creating user..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Event\",
    \"lastName\": \"Test\",
    \"email\": \"$EMAIL\",
    \"phone\": \"1234567890\",
    \"password\": \"password123\"
  }")

USER_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')

if [ "$USER_ID" != "null" ]; then
  echo "✅ User created with ID: $USER_ID"
  echo "📋 Check logs for: 'Sending welcome email' and 'AUDIT LOG'"
  
  sleep 2
  
  # Update user
  echo -e "\n2️⃣ Updating user..."
  UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/v1/users/$USER_ID \
    -H "Content-Type: application/json" \
    -d '{"firstName": "Updated"}')
  
  echo "✅ User updated"
  echo "📋 Check logs for: 'User cache invalidated' and 'AUDIT LOG'"
  
  sleep 2
  
  # Delete user
  echo -e "\n3️⃣ Deleting user..."
  DELETE_RESPONSE=$(curl -s -X DELETE http://localhost:3000/api/v1/users/$USER_ID)
  
  echo "✅ User deleted"
  echo "📋 Check logs for: 'User cache invalidated' and 'AUDIT LOG'"
else
  echo "❌ Failed to create user"
  echo "$CREATE_RESPONSE" | jq
fi

echo -e "\n🎉 Test complete! Check your application logs for event processing."