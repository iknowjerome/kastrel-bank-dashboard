#!/bin/bash
# AWS ECS Deployment Script for Kastrel Dashboard
# 
# Prerequisites:
#   - AWS CLI installed and configured
#   - Docker installed
#   - Appropriate IAM permissions
#
# Usage:
#   ./deploy.sh <AWS_ACCOUNT_ID> <AWS_REGION> [IMAGE_TAG]
#
# Example:
#   ./deploy.sh 123456789012 us-east-1 v1.0.0

set -e

# Configuration
AWS_ACCOUNT_ID=${1:?"Usage: $0 <AWS_ACCOUNT_ID> <AWS_REGION> [IMAGE_TAG]"}
AWS_REGION=${2:?"Usage: $0 <AWS_ACCOUNT_ID> <AWS_REGION> [IMAGE_TAG]"}
IMAGE_TAG=${3:-"latest"}

ECR_REPO="kastrel-dashboard"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
CLUSTER_NAME="kastrel-cluster"
SERVICE_NAME="kastrel-dashboard-service"

echo "🚀 Deploying Kastrel Dashboard to AWS ECS"
echo "   Account: ${AWS_ACCOUNT_ID}"
echo "   Region:  ${AWS_REGION}"
echo "   Tag:     ${IMAGE_TAG}"
echo ""

# Step 1: Create ECR repository (if not exists)
echo "📦 Step 1: Ensuring ECR repository exists..."
aws ecr describe-repositories --repository-names ${ECR_REPO} --region ${AWS_REGION} 2>/dev/null || \
    aws ecr create-repository --repository-name ${ECR_REPO} --region ${AWS_REGION}

# Step 2: Authenticate Docker to ECR
echo "🔐 Step 2: Authenticating Docker to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}

# Step 3: Build Docker image
echo "🔨 Step 3: Building Docker image..."
cd "$(dirname "$0")/.."
docker build -t ${ECR_REPO}:${IMAGE_TAG} -f deployment/Dockerfile ..

# Step 4: Tag and push to ECR
echo "📤 Step 4: Pushing image to ECR..."
docker tag ${ECR_REPO}:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}
docker push ${ECR_URI}:${IMAGE_TAG}

# Step 5: Create CloudWatch log group (if not exists)
echo "📊 Step 5: Ensuring CloudWatch log group exists..."
aws logs create-log-group --log-group-name /ecs/kastrel-dashboard --region ${AWS_REGION} 2>/dev/null || true

# Step 6: Update task definition with correct values
echo "📝 Step 6: Registering task definition..."
TASK_DEF=$(cat deployment/aws/ecs-task-definition.json | \
    sed "s/YOUR_ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" | \
    sed "s/YOUR_REGION/${AWS_REGION}/g" | \
    sed "s/:latest/:${IMAGE_TAG}/g")

TASK_DEF_ARN=$(echo "$TASK_DEF" | aws ecs register-task-definition \
    --cli-input-json file:///dev/stdin \
    --region ${AWS_REGION} \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "   Task definition: ${TASK_DEF_ARN}"

# Step 7: Check if cluster exists, create if not
echo "🏗️  Step 7: Ensuring ECS cluster exists..."
aws ecs describe-clusters --clusters ${CLUSTER_NAME} --region ${AWS_REGION} --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE" || \
    aws ecs create-cluster --cluster-name ${CLUSTER_NAME} --region ${AWS_REGION}

# Step 8: Update or create service
echo "🔄 Step 8: Updating ECS service..."
if aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION} --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
    # Update existing service
    aws ecs update-service \
        --cluster ${CLUSTER_NAME} \
        --service ${SERVICE_NAME} \
        --task-definition ${TASK_DEF_ARN} \
        --force-new-deployment \
        --region ${AWS_REGION} \
        --query 'service.serviceName' \
        --output text
    echo "   Service updated!"
else
    echo "   ⚠️  Service doesn't exist. Please create it using the AWS Console or run:"
    echo ""
    echo "   aws ecs create-service \\"
    echo "       --cluster ${CLUSTER_NAME} \\"
    echo "       --service-name ${SERVICE_NAME} \\"
    echo "       --task-definition ${TASK_DEF_ARN} \\"
    echo "       --desired-count 1 \\"
    echo "       --launch-type FARGATE \\"
    echo "       --network-configuration 'awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}' \\"
    echo "       --region ${AWS_REGION}"
    echo ""
    echo "   Replace subnet-xxx and sg-xxx with your VPC subnet and security group IDs."
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure your ECS service is running"
echo "  2. Configure an Application Load Balancer (ALB) for HTTPS"
echo "  3. Set up DNS to point to your ALB"
echo "  4. Configure your perches to connect to https://your-domain.com"

