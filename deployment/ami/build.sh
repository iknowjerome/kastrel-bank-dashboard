#!/bin/bash
# Build Kastrel Dashboard AMI using Packer
#
# Usage:
#   ./build.sh [VERSION] [REGION]
#
# Example:
#   ./build.sh 1.0.0 us-east-1

set -e

VERSION=${1:-"1.0.0"}
REGION=${2:-"us-east-1"}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔨 Building Kastrel Dashboard AMI"
echo "   Version: ${VERSION}"
echo "   Region:  ${REGION}"
echo ""

# Check for Packer
if ! command -v packer &> /dev/null; then
    echo "❌ Packer not found. Install from: https://www.packer.io/downloads"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run: aws configure"
    exit 1
fi

# Build React frontend first
echo "📦 Building React frontend..."
FRONTEND_DIR="../../frontend"
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    if [ -f "package.json" ]; then
        if command -v npm &> /dev/null; then
            echo "   Running npm install..."
            npm install --silent
            echo "   Building React app..."
            npm run build
            echo "   ✅ React build complete"
        else
            echo "   ⚠️  npm not found, skipping React build"
            echo "   Make sure frontend/dist is up to date!"
        fi
    else
        echo "   ⚠️  No package.json found in frontend"
    fi
    cd "$SCRIPT_DIR"
else
    echo "   ⚠️  frontend directory not found, skipping build"
fi
echo ""

# Initialize Packer plugins
echo "📦 Initializing Packer plugins..."
packer init packer.pkr.hcl

# Validate template
echo "✅ Validating Packer template..."
packer validate \
    -var "version=${VERSION}" \
    -var "aws_region=${REGION}" \
    packer.pkr.hcl

# Build AMI
echo "🚀 Building AMI..."
packer build \
    -var "version=${VERSION}" \
    -var "aws_region=${REGION}" \
    packer.pkr.hcl

echo ""
echo "✅ AMI build complete!"
echo ""
echo "Check manifest.json for the AMI ID, or run:"
echo "  aws ec2 describe-images --owners self --filters 'Name=name,Values=kastrel-dashboard-${VERSION}*' --query 'Images[*].[ImageId,Name]' --output table"

