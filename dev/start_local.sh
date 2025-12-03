#!/bin/bash
# Start Kastrel Dashboard locally

set -e
cd "$(dirname "$0")/.."

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Check if kastrel-api is installed
python -c "from services.nest.server import NestServer" 2>/dev/null || {
    echo "Note: kastrel-api not found, using placeholder NestServer"
    echo ""
}

# Set environment
export KASTREL_ENV=${KASTREL_ENV:-dev}

echo "🦅 Starting Kastrel Dashboard..."
echo "   Environment: $KASTREL_ENV"
echo "   Dashboard:   http://localhost:8080/"
echo "   Health:      http://localhost:8080/health"
echo ""
echo "(Use Ctrl+C to stop)"
echo ""

python -m app.main --env $KASTREL_ENV
