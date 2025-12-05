#!/bin/bash
# Launch Kastrel Dashboard AMI instance
#
# Usage:
#   ./launch_ami.sh [AMI_ID] [REGION] [KEY_NAME] [INSTANCE_TYPE]
#
# Example:
#   ./launch_ami.sh ami-02078df84d0265e10 ca-central-1 kastrel-test t3.small

set -e

AMI_ID=${1:-""}
REGION=${2:-"ca-central-1"}
KEY_NAME=${3:-"kastrel-test"}
INSTANCE_TYPE=${4:-"t3.small"}

if [ -z "$AMI_ID" ]; then
    echo "❌ Error: AMI ID is required"
    echo ""
    echo "Usage: $0 <AMI_ID> [REGION] [KEY_NAME] [INSTANCE_TYPE]"
    echo ""
    echo "Example:"
    echo "  $0 ami-02078df84d0265e10 ca-central-1 kastrel-test t3.small"
    exit 1
fi

echo "🚀 Launching Kastrel Dashboard instance"
echo "   AMI ID:       ${AMI_ID}"
echo "   Region:       ${REGION}"
echo "   Key Name:     ${KEY_NAME}"
echo "   Instance Type: ${INSTANCE_TYPE}"
echo ""

# Get the default VPC security group
echo "📋 Getting default security group..."
SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=default" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region ${REGION} 2>/dev/null)

if [ -z "$SG_ID" ] || [ "$SG_ID" == "None" ]; then
    echo "❌ Could not find default security group. Please specify a security group ID."
    exit 1
fi

echo "   Security Group: ${SG_ID}"

# Allow port 8080 on that security group (ignore if already exists)
echo "🔓 Opening port 8080..."
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 8080 \
    --cidr 0.0.0.0/0 \
    --region ${REGION} 2>/dev/null || echo "   (Port 8080 may already be open)"

# Allow port 22 for SSH (ignore if already exists)
echo "🔓 Opening port 22 for SSH..."
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 \
    --region ${REGION} 2>/dev/null || echo "   (Port 22 may already be open)"

# Launch instance
echo "🚀 Launching instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ${AMI_ID} \
    --instance-type ${INSTANCE_TYPE} \
    --key-name ${KEY_NAME} \
    --security-group-ids ${SG_ID} \
    --region ${REGION} \
    --query 'Instances[0].InstanceId' \
    --output text)

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" == "None" ]; then
    echo "❌ Failed to launch instance"
    exit 1
fi

echo "   Instance ID: ${INSTANCE_ID}"

# Wait a moment for the instance to start
echo "⏳ Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids ${INSTANCE_ID} --region ${REGION}

# Get public IP
echo "📡 Getting public IP..."
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids ${INSTANCE_ID} \
    --region ${REGION} \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "None" ]; then
    echo "⚠️  No public IP found (instance may be in a private subnet)"
    PRIVATE_IP=$(aws ec2 describe-instances \
        --instance-ids ${INSTANCE_ID} \
        --region ${REGION} \
        --query 'Reservations[0].Instances[0].PrivateIpAddress' \
        --output text)
    echo "   Private IP: ${PRIVATE_IP}"
else
    echo "   Public IP: ${PUBLIC_IP}"
fi

echo ""
echo "✅ Instance launched successfully!"
echo ""
echo "📋 Instance Details:"
echo "   Instance ID: ${INSTANCE_ID}"
if [ -n "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "None" ]; then
    echo "   Public IP:  ${PUBLIC_IP}"
    echo ""
    echo "🌐 Dashboard will be available at:"
    echo "   http://${PUBLIC_IP}:8080"
    echo ""
    echo "⏳ Wait ~2 minutes for the service to start, then access the dashboard."
else
    echo "   Private IP: ${PRIVATE_IP}"
    echo ""
    echo "⚠️  Instance is in a private subnet. Access via VPN or bastion host."
fi
echo ""
echo "🔍 Check instance status:"
echo "   aws ec2 describe-instances --instance-ids ${INSTANCE_ID} --region ${REGION}"
echo ""
echo "🛑 To terminate the instance:"
echo "   aws ec2 terminate-instances --instance-ids ${INSTANCE_ID} --region ${REGION}"

