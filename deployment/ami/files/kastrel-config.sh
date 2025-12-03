#!/bin/bash
# First-boot configuration script for Kastrel Dashboard
# This runs once when the AMI is first launched

set -e

CONFIG_FILE="/etc/kastrel/environment"
CONFIGURED_FLAG="/var/lib/kastrel/.configured"

echo "=== Kastrel Dashboard First Boot Configuration ==="

# Create config directory
mkdir -p /etc/kastrel

# Get instance metadata
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 || echo "")
PRIVATE_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/local-ipv4)

echo "Instance ID: $INSTANCE_ID"
echo "Region: $REGION"
echo "Private IP: $PRIVATE_IP"
echo "Public IP: ${PUBLIC_IP:-'(none)'}"

# Check for user-data configuration
USER_DATA=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/user-data || echo "")

# Write environment file
cat > "$CONFIG_FILE" << EOF
# Kastrel Dashboard Configuration
# Generated on first boot: $(date -Iseconds)
# Instance: $INSTANCE_ID

KASTREL_ENV=production
KASTREL_INSTANCE_ID=$INSTANCE_ID
KASTREL_REGION=$REGION
KASTREL_PRIVATE_IP=$PRIVATE_IP
KASTREL_PUBLIC_IP=${PUBLIC_IP:-$PRIVATE_IP}

# Add custom configuration below or via EC2 user-data
EOF

# If user-data contains KASTREL_ variables, append them
if echo "$USER_DATA" | grep -q "^KASTREL_"; then
    echo "" >> "$CONFIG_FILE"
    echo "# Custom configuration from user-data" >> "$CONFIG_FILE"
    echo "$USER_DATA" | grep "^KASTREL_" >> "$CONFIG_FILE"
fi

# Set permissions
chmod 600 "$CONFIG_FILE"
chown kastrel:kastrel "$CONFIG_FILE"

# Mark as configured
touch "$CONFIGURED_FLAG"
chown kastrel:kastrel "$CONFIGURED_FLAG"

echo "=== Configuration complete ==="
echo "Dashboard will be available at http://${PUBLIC_IP:-$PRIVATE_IP}:8080"

