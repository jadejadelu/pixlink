#!/bin/bash

echo "Testing PixLink API endpoints with CORRECT paths..."

# First, let's try to login with the provided credentials
echo "Attempting login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"172296329@qq.com", "password":"123456"}')

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Exiting."
  exit 1
fi

echo "Got token: ${TOKEN:0:20}..."

# Set authorization header
AUTH_HEADER="Authorization: Bearer $TOKEN"

# Get user profile to confirm login worked
echo "Getting user profile..."
USER_PROFILE=$(curl -s -X GET http://localhost:3000/api/auth/profile \
  -H "$AUTH_HEADER")

# Get existing rooms (get the first room)
echo "Getting existing rooms..."
ROOMS=$(curl -s -X GET http://localhost:3000/api/rooms \
  -H "$AUTH_HEADER")

# Extract the first room ID
ROOM_ID=$(echo $ROOMS | grep -o '"id":"[^"]*"' | head -n1 | cut -d'"' -f4)

if [ -z "$ROOM_ID" ]; then
  echo "Failed to get room ID. Creating a new room..."
  ROOM_NAME="API Test Room $(date +%s)"
  CREATE_ROOM=$(curl -s -X POST http://localhost:3000/api/rooms \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d "{\"name\":\"$ROOM_NAME\",\"visibility\":\"PRIVATE\"}")
  
  ROOM_ID=$(echo $CREATE_ROOM | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$ROOM_ID" ]; then
  echo "Failed to get room ID. Exiting."
  exit 1
fi

echo "Using room ID: $ROOM_ID"

# Test getting existing game shares
echo "Getting existing game shares in room..."
GET_GAME_SHARES=$(curl -s -X GET http://localhost:3000/api/rooms/$ROOM_ID/shares \
  -H "$AUTH_HEADER")

echo "Existing game shares:"
echo $GET_GAME_SHARES
echo ""

# Create a game share in the room (USING CORRECT ROUTE: /shares not /game-shares)
echo "Creating game share in room (using correct route /shares)..."
CREATE_GAME_SHARE=$(curl -s -X POST http://localhost:3000/api/rooms/$ROOM_ID/shares \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"title":"API Test Game Share","proto":"TCP","port":8080,"templateKey":"custom","hostHint":"127.0.0.1"}')

echo "Create game share response:"
echo $CREATE_GAME_SHARE
echo ""

# Extract game share ID
GAME_SHARE_ID=$(echo $CREATE_GAME_SHARE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$GAME_SHARE_ID" ]; then
  echo "Created game share with ID: $GAME_SHARE_ID"
  
  # Test pause endpoint (USING CORRECT ROUTE: /shares/:id/pause)
  echo "Testing pause game share (using correct route /shares/:id/pause)..."
  PAUSE_RESPONSE=$(curl -s -X PATCH http://localhost:3000/api/rooms/shares/$GAME_SHARE_ID/pause \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER")
  
  echo "Pause response:"
  echo $PAUSE_RESPONSE
  echo ""
  
  # Test resume endpoint (USING CORRECT ROUTE: /shares/:id/resume)
  echo "Testing resume game share (using correct route /shares/:id/resume)..."
  RESUME_RESPONSE=$(curl -s -X PATCH http://localhost:3000/api/rooms/shares/$GAME_SHARE_ID/resume \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER")
  
  echo "Resume response:"
  echo $RESUME_RESPONSE
  echo ""
  
  # Get game shares again to see the status
  echo "Getting game shares after operations..."
  GET_GAME_SHARES_AFTER=$(curl -s -X GET http://localhost:3000/api/rooms/$ROOM_ID/shares \
    -H "$AUTH_HEADER")
  echo "Game shares after operations:"
  echo $GET_GAME_SHARES_AFTER
  echo ""
else
  echo "Failed to get game share ID. Response was:"
  echo $CREATE_GAME_SHARE
  echo ""
fi

echo "API test with corrected paths completed!"