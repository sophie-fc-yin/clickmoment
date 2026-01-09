#!/bin/bash
# Test the thumbnail generation endpoint to diagnose CORS/network issues

API_BASE="https://thumbnail-alchemist-90067411133.us-west1.run.app"
ENDPOINT="${API_BASE}/thumbnails/generate"

echo "=========================================="
echo "Testing Thumbnail Generation Endpoint"
echo "=========================================="
echo "Endpoint: $ENDPOINT"
echo ""

# Test 1: Check if endpoint exists (OPTIONS preflight)
echo "1. Testing OPTIONS (CORS preflight)..."
curl -X OPTIONS "$ENDPOINT" \
  -H "Origin: https://clickmoment.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v 2>&1 | grep -E "(HTTP|CORS|Access-Control|error|Error|200|404|405)"
echo ""
echo ""

# Test 2: Try actual POST request
echo "2. Testing POST request..."
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Origin: https://clickmoment.vercel.app" \
  -d '{"test": "data"}' \
  -v 2>&1 | head -30
echo ""
echo ""

# Test 3: Check docs endpoint
echo "3. Verifying API docs are accessible..."
curl -s "$API_BASE/docs" | head -5
echo ""



