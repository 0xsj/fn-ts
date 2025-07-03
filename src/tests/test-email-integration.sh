#!/bin/bash
# test-email-integration.sh

echo "🚀 Starting Email Integration Test with Mailhog"
echo "================================================"

# Check if Mailhog is running
if ! curl -s http://localhost:8025/api/v2/messages > /dev/null; then
  echo "❌ Mailhog is not running!"
  echo "Please start it with: docker-compose up -d mailhog"
  exit 1
fi

echo "✅ Mailhog is running"
echo ""

# Clear existing messages
echo "🧹 Clearing existing messages in Mailhog..."
curl -X DELETE http://localhost:8025/api/v2/messages

echo ""
echo "📧 Running integration tests..."
echo ""

# Run the integration test
npm test -- smtp.provider.integration.test.ts --verbose

echo ""
echo "✅ Tests complete!"
echo "📮 Check your emails at: http://localhost:8025"
echo ""
echo "Tip: The fancy HTML email is the most interesting one!"