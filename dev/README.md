# Kastrel Dashboard - Development Guide

## Quick Start (Recommended)

```bash
# Option A: Docker Compose (closest to production)
docker compose up
# → http://localhost:8080

# Option B: Local Python (fastest iteration)
./dev/start_local.sh
# → http://localhost:8080
```

---

## Development Environments

| Environment | Speed | Production Fidelity | When to Use |
|-------------|-------|---------------------|-------------|
| **Local Python** | ⚡ Instant | Low | Day-to-day coding |
| **Docker Compose** | 🚀 Fast | High | Integration testing |
| **Test AMI on EC2** | 🐢 5 min | Exact | Pre-release verification |

---

## Option 1: Docker Compose ⭐ (Recommended)

Closest to production, with live code reload.

```bash
# Start dashboard
docker compose up

# Start with simulated perches
docker compose --profile with-perches up

# View logs
docker compose logs -f

# Rebuild after dependency changes
docker compose build --no-cache
docker compose up
```

**Live reload:** Edit files in `app/` → changes reflect immediately. For frontend changes, rebuild React app.

### VS Code Dev Container

For full IDE integration, open the project in VS Code and click "Reopen in Container" when prompted. This gives you:
- Python intellisense inside the container
- Integrated terminal in the container
- Debugger attached to the running app

---

## Option 2: Local Python (Fastest Iteration)

Best for rapid code changes.

```bash
# Setup (one time)
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run
./dev/start_local.sh
# or
python -m app.main --host 127.0.0.1 --port 8080

# Open http://localhost:8080
```

---

## Option 3: Test AMI on EC2 (Pre-Release)

Before releasing to clients, verify on a real EC2 instance.

```bash
# Build AMI (requires AWS credentials)
cd deployment/ami
./build.sh 1.0.0-dev us-east-1

# Launch test instance
aws ec2 run-instances \
    --image-id ami-xxxxx \
    --instance-type t3.small \
    --key-name your-key \
    --security-group-ids sg-xxxxx

# Test, then terminate
aws ec2 terminate-instances --instance-ids i-xxxxx
```

---

## Testing with Simulated Perches

```bash
# Option 1: Docker Compose (easiest)
docker compose --profile with-perches up

# Option 2: Manual
python dev/simulate_perches.py --url http://localhost:8080 --num-perches 5
```

---

## Development → Production Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DEVELOP                                                      │
│     docker compose up  OR  ./dev/start_local.sh                 │
│     Fast iteration, live reload                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. TEST ON EC2 (before release)                                 │
│     Build test AMI → Launch EC2 → Verify → Terminate            │
│     Exact production environment                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. RELEASE                                                      │
│     Build final AMI → Submit to AWS Marketplace                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Port 8080 already in use

```bash
# Find what's using it
lsof -i :8080

# Use different port
docker compose run -p 8081:8080 dashboard
# or
python -m app.main --port 8081
```

### Docker container won't start

```bash
# Check logs
docker compose logs dashboard

# Rebuild from scratch
docker compose down
docker compose build --no-cache
docker compose up
```

### Changes not reflecting

```bash
# For Docker: changes to app/ should auto-reflect
# For frontend changes, rebuild React app in frontend/
# For Python changes, restart the container:
docker compose restart dashboard
```
