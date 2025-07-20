#!/bin/bash

# AutoRide EDA API Testing Script

set -e

API_BASE="http://localhost:3000"
RIDE_API="http://localhost:3001"

echo "🧪 Testing AutoRide EDA APIs..."

# Test health endpoints
echo "🔍 Testing health endpoints..."
curl -f "$API_BASE/health" | jq '.'
curl -f "$RIDE_API/health" | jq '.'

# Test ride request
echo "🚗 Testing ride request..."
RIDE_RESPONSE=$(curl -s -X POST "$RIDE_API/ride-request" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "pickup": {"lat": 40.7589, "lng": -73.9851},
    "dropoff": {"lat": 40.7614, "lng": -73.9776}
  }')

echo "Ride request response:"
echo $RIDE_RESPONSE | jq '.'

RIDE_ID=$(echo $RIDE_RESPONSE | jq -r '.rideId')

# Wait for assignment
echo "⏳ Waiting for ride assignment..."
sleep 5

# Check ride status
echo "📋 Checking ride status..."
curl -f "$RIDE_API/rides/$RIDE_ID" | jq '.'

# Test other endpoints
echo "🚕 Testing taxi locations..."
curl -f "$API_BASE/taxis/locations" | jq '.taxis | length'

echo "💰 Testing pricing..."
curl -f "$API_BASE/pricing/current" | jq '.'

echo "📊 Testing metrics..."
curl -f "$API_BASE/metrics" | jq '.'

echo "✅ All API tests completed!"
