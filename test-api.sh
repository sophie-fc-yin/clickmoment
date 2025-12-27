#!/bin/bash
# Test the API endpoint directly
API_URL="https://thumbnail-alchemist-90067411133.us-west1.run.app/get-upload-url"
echo "Testing: $API_URL"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.mp4","content_type":"video/mp4"}' \
  -v 2>&1 | grep -E "(HTTP|CORS|Access-Control|error|Error)"
