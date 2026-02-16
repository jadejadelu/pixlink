# ZTM (Zero Trust Mesh) Docker Setup

This project provides Docker Compose configurations for running ZTM hub and agent services.

## Available Configurations

### 1. Hub Only
- File: `docker-compose-hub.yml`
- Runs only the ZTM hub service
- Exposes port 8888

### 2. Agent Only
- File: `docker-compose-agent.yml`
- Runs both hub and agent services
- Agent connects to the hub

### 3. Complete Setup
- File: `docker-compose.yml`
- Runs hub and agent in a single network
- Includes hub and one agent

## Usage

### Start the services
```bash
# For hub only
docker-compose -f docker-compose-hub.yml up -d

# For complete setup
docker-compose -f docker-compose.yml up -d

# For agent setup
docker-compose -f docker-compose-agent.yml up -d
```

### Stop the services
```bash
# For hub only
docker-compose -f docker-compose-hub.yml down

# For complete setup
docker-compose -f docker-compose.yml down

# For agent setup
docker-compose -f docker-compose-agent.yml down
```

### View logs
```bash
docker-compose -f docker-compose.yml logs -f
```

## Environment Variables

### Hub
- `ZTM_NAMES`: Address to listen on (default: 0.0.0.0)
- `ZTM_PORT`: Port to listen on (default: 8888)
- `ZTM_DATA`: Data directory (default: ~/.ztm)

### Agent
- `ZTM_JOIN_MESH`: Hub address to join (e.g., ztm-hub:8888)
- `ZTM_ENDPOINT`: Endpoint name for this agent
- `ZTM_PORT`: Port to listen on (default: 7777)
- `ZTM_PERMIT`: Permit directory
- `ZTM_DATA`: Data directory (default: ~/.ztm)

## Note on Permit Files

The hub service generates a root.json permit file in the shared volume. The agent service waits for this file to be created and then copies it to ztm-permit.json to use as its own permit file. This allows the agent to join the hub securely.

## Volumes

- `hub-data/`: Hub persistent data
- `agent-data/`: Agent persistent data
- `shared-permit`: Docker named volume for sharing permit files between hub and agent. Hub generates root.json which is used by agent as ztm-permit.json