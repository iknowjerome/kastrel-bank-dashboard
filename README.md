# Kastrel Dashboard

Dashboard for Kastrel - extends the Nest with a visualization UI.

## Overview

This application:
1. **Inherits from Nest** (from `kastrel-api`) to listen for perch connections
2. **Adds a web UI** for visualizing perch data
3. **Adds demo features** like local data loading
4. **Gets packaged as a Docker image** for clients to run

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  kastrel-api (base library)                                                 │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  services/nest/                                                         │ │
│  │                                                                         │ │
│  │  BASE NEST (reusable core)                                             │ │
│  │  - NestServer class                                                    │ │
│  │  - TraceAggregator                                                     │ │
│  │  - PerchStorage                                                        │ │
│  │  - Perch API routes (/api/v1/...)                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │  imports / inherits
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  kastrel-dashboard (this project)                                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  from services.nest import NestServer                                  │ │
│  │                                                                         │ │
│  │  class DashboardApp(NestServer):                                       │ │
│  │      # Inherits all perch-listening functionality                      │ │
│  │      # ADDS: Dashboard UI                                              │ │
│  │      # ADDS: Demo-specific features                                    │ │
│  │      # ADDS: Local data loading                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Inherited from Nest (perches talk to these):
- `POST /api/v1/agents/register` - Register a perch
- `POST /api/v1/traces` - Send trace data
- `GET /api/v1/health` - Health check

### Dashboard additions (humans look at these):
- `GET /` - Dashboard UI
- `GET /dashboard/api/agents` - List connected perches
- `GET /dashboard/api/traces` - View trace data
- `GET /dashboard/api/stats` - Get statistics
- `WS /dashboard/ws` - Real-time updates
- `POST /dashboard/api/demo/load-local-data` - Load demo data

## Quick Start

### Prerequisites

- Python 3.10+
- `kastrel-api` installed (see below)

### Install kastrel-api

```bash
# Option 1: Local development (if you have kastrel-api repo)
pip install -e ../kastrel-api

# Option 2: From git
pip install git+https://github.com/YOUR_ORG/kastrel-api.git@main
```

### Run Locally

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start dashboard
./dev/start_local.sh

# Open browser to http://localhost:8080
```

### Test with Simulated Perches

```bash
# In another terminal
python dev/simulate_perches.py --url http://localhost:8080 --num-perches 3
```

### Docker

```bash
# Build image
docker build -t kastrel-dashboard -f deployment/Dockerfile .

# Run
docker run -p 8080:8080 kastrel-dashboard
```

### Docker Compose (with simulated perches)

```bash
cd deployment
docker-compose up
```

## Project Structure

```
kastrel-dashboard/
├── README.md
├── requirements.txt
├── pyproject.toml
├── .gitignore
├── config/
│   ├── dev.yaml              # Development configuration
│   └── production.yaml       # Production configuration
├── app/
│   ├── __init__.py
│   ├── main.py               # DashboardApp extends NestServer
│   ├── config.py             # Configuration loading
│   ├── dashboard/
│   │   ├── __init__.py
│   │   ├── routes.py         # Dashboard API routes
│   │   ├── websocket.py      # WebSocket connection manager
│   │   └── models.py         # Pydantic models
│   └── demo/
│       ├── __init__.py
│       └── local_data.py     # Local data loading for demos
├── frontend/
│   ├── src/                  # React source code
│   ├── dist/                 # Built frontend (generated)
│   ├── package.json
│   └── vite.config.ts
├── deployment/
│   ├── Dockerfile
│   ├── Dockerfile.perch-sim
│   └── docker-compose.yml
└── dev/
    ├── start_local.sh        # Local development script
    └── simulate_perches.py   # Test script
```

## Deployment

### Local/Docker

Clients receive the Docker image and run:

```bash
docker run -p 8080:8080 kastrel/dashboard:latest
```

Then configure their perches to connect to `http://<dashboard-host>:8080`.

### AWS Deployment

For AWS deployment options (ECS Fargate, EC2, App Runner), see the detailed guide:

📖 **[AWS Deployment Guide](deployment/aws/README.md)**

Quick start with CloudFormation:

```bash
# 1. Push image to ECR
cd deployment/aws
./deploy.sh YOUR_ACCOUNT_ID YOUR_REGION v1.0.0

# 2. Deploy full infrastructure
aws cloudformation create-stack \
    --stack-name kastrel-dashboard \
    --template-body file://cloudformation.yaml \
    --parameters \
        ParameterKey=ContainerImage,ParameterValue=YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/kastrel-dashboard:v1.0.0 \
    --capabilities CAPABILITY_IAM
```
