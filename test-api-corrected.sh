#!/bin/bash

echo "Testing PixLink API endpoints with correct prefix..."

# First, let's try to login with the provided credentials
echo "Attempting login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"172296329@qq.com", "password":"123456"}')

echo "Login response:"
echo $LOGIN_RESPONSE
echo ""

# Extract token from response (checking both possible field names)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Checking for different field name..."
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Response was:"
  echo $LOGIN_RESPONSE
  echo "Exiting."
  exit 1
fi

echo "Got token: ${TOKEN:0:20}..."

# Set authorization header
AUTH_HEADER="Authorization: Bearer $TOKEN"

# Get user profile to confirm login worked
echo "Getting user profile..."
USER_PROFILE=$(curl -s -X GET http://localhost:3000/api/auth/profile \
  -H "$AUTH_HEADER")

echo "User profile:"
echo $USER_PROFILE
echo ""

# Get existing rooms
echo "Getting existing rooms..."
ROOMS=$(curl -s -X GET http://localhost:3000/api/rooms \
  -H "$AUTH_HEADER")

echo "Existing rooms:"
echo $ROOMS
echo ""

# Create a new room
ROOM_NAME="API Test Room $(date +%s)"
echo "Creating room: $ROOM_NAME"
CREATE_ROOM=$(curl -s -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{\"name\":\"$ROOM_NAME\",\"visibility\":\"PRIVATE\"}")

echo "Create room response:"
echo $CREATE_ROOM
echo ""

# Extract room ID
ROOM_ID=$(echo $CREATE_ROOM | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ROOM_ID" ]; then
  echo "Failed to get room ID from creation response."
  echo "Trying to get the most recently created room..."
  # Get the most recent room
  ROOMS_AFTER_CREATE=$(curl -s -X GET http://localhost:3000/api/rooms \
    -H "$AUTH_HEADER")
  ROOM_ID=$(echo $ROOMS_AFTER_CREATE | grep -o '"id":"[^"]*"' | head -n1 | cut -d'"' -f4)
fi

if [ -z "$ROOM_ID" ]; then
  echo "Failed to get room ID. Response was:"
  echo $CREATE_ROOM
  echo "Exiting."
  exit 1
fi

echo "Using room ID: $ROOM_ID"

# Create a game share in the room
echo "Creating game share in room..."
CREATE_GAME_SHARE=$(curl -s -X POST http://localhost:3000/api/rooms/$ROOM_ID/game-shares \
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
  
  # Test pause endpoint
  echo "Testing pause game share..."
  PAUSE_RESPONSE=$(curl -s -X PATCH http://localhost:3000/api/rooms/$ROOM_ID/game-shares/$GAME_SHARE_ID/pause \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER")
  
  echo "Pause response:"
  echo $PAUSE_RESPONSE
  echo ""
  
  # Test resume endpoint
  echo "Testing resume game share..."
  RESUME_RESPONSE=$(curl -s -X PATCH http://localhost:3000/api/rooms/$ROOM_ID/game-shares/$GAME_SHARE_ID/resume \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER")
  
  echo "Resume response:"
  echo $RESUME_RESPONSE
  echo ""
else
  echo "Failed to get game share ID. Response was:"
  echo $CREATE_GAME_SHARE
  echo ""
  
  # Let's try to get the game shares to see if it was created
  GAME_SHARES=$(curl -s -X GET http://localhost:3000/api/rooms/$ROOM_ID/game-shares \
    -H "$AUTH_HEADER")
  echo "Current game shares in room:"
  echo $GAME_SHARES
  echo ""
fi

echo "API test completed!"