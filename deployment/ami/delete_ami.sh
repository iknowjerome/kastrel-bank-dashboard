#!/bin/bash
# Delete an AMI and its associated snapshots
#
# Usage:
#   ./delete_ami.sh <AMI_ID> [REGION]
#
# Example:
#   ./delete_ami.sh ami-0fcad7a860c4603b6 ca-central-1

set -e

AMI_ID=$1
REGION=${2:-ca-central-1}

if [ -z "$AMI_ID" ]; then
    echo "Usage: $0 <AMI_ID> [REGION]"
    echo "Example: $0 ami-0fcad7a860c4603b6 ca-central-1"
    exit 1
fi

echo "🗑️  Deleting AMI: $AMI_ID in region $REGION"
echo ""

# Check if AMI exists
if ! aws ec2 describe-images --image-ids $AMI_ID --region $REGION &>/dev/null; then
    echo "❌ AMI $AMI_ID not found in region $REGION"
    exit 1
fi

# Get snapshot IDs
echo "📸 Finding associated snapshots..."
SNAPSHOTS=$(aws ec2 describe-images --image-ids $AMI_ID --region $REGION --query 'Images[0].BlockDeviceMappings[*].Ebs.SnapshotId' --output text)

if [ -z "$SNAPSHOTS" ] || [ "$SNAPSHOTS" == "None" ]; then
    echo "⚠️  No snapshots found for this AMI"
    SNAPSHOTS=""
fi

# Deregister AMI
echo "📝 Deregistering AMI..."
if aws ec2 deregister-image --image-id $AMI_ID --region $REGION; then
    echo "✅ AMI deregistered successfully"
else
    echo "❌ Failed to deregister AMI"
    exit 1
fi

# Delete snapshots
if [ -n "$SNAPSHOTS" ]; then
    echo ""
    echo "🗑️  Deleting snapshots..."
    for SNAPSHOT in $SNAPSHOTS; do
        echo "   Deleting snapshot: $SNAPSHOT"
        if aws ec2 delete-snapshot --snapshot-id $SNAPSHOT --region $REGION; then
            echo "   ✅ Snapshot deleted"
        else
            echo "   ⚠️  Failed to delete snapshot (may already be deleted or in use)"
        fi
    done
fi

echo ""
echo "✅ Done!"

