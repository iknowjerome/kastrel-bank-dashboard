# AWS Deployment Guide for Kastrel Dashboard

This guide covers deploying the Kastrel Dashboard to AWS using containers.

## Deployment Options

| Option | Complexity | Cost | Best For |
|--------|------------|------|----------|
| **ECS Fargate** ⭐ | Medium | Pay-per-use | Production, hands-off |
| **ECS EC2** | Medium | Lower at scale | High volume |
| **App Runner** | Low | Pay-per-use | Quick start |
| **EC2 + Docker** | Low | Predictable | Simple setups |

---

## Option 1: ECS Fargate (Recommended)

### Quick Deploy with CloudFormation

This creates everything you need: VPC, ECS cluster, load balancer, and service.

```bash
# 1. First, push your image to ECR
./deploy.sh YOUR_ACCOUNT_ID YOUR_REGION v1.0.0

# 2. Deploy infrastructure with CloudFormation
aws cloudformation create-stack \
    --stack-name kastrel-dashboard \
    --template-body file://cloudformation.yaml \
    --parameters \
        ParameterKey=ContainerImage,ParameterValue=YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/kastrel-dashboard:v1.0.0 \
        ParameterKey=Environment,ParameterValue=production \
    --capabilities CAPABILITY_IAM \
    --region YOUR_REGION

# 3. Get the dashboard URL
aws cloudformation describe-stacks \
    --stack-name kastrel-dashboard \
    --query 'Stacks[0].Outputs[?OutputKey==`DashboardURL`].OutputValue' \
    --output text
```

### Manual Deploy Steps

If you prefer more control:

#### 1. Create ECR Repository

```bash
aws ecr create-repository --repository-name kastrel-dashboard
```

#### 2. Build and Push Image

```bash
# Authenticate
aws ecr get-login-password --region YOUR_REGION | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com

# Build
docker build -t kastrel-dashboard -f deployment/Dockerfile .

# Tag and push
docker tag kastrel-dashboard:latest YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/kastrel-dashboard:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/kastrel-dashboard:latest
```

#### 3. Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name kastrel-cluster
```

#### 4. Register Task Definition

Edit `ecs-task-definition.json` with your account ID and region, then:

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

#### 5. Create Service

```bash
aws ecs create-service \
    --cluster kastrel-cluster \
    --service-name kastrel-dashboard \
    --task-definition kastrel-dashboard \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

---

## Option 2: EC2 with Docker (Simple)

For a simple single-instance deployment:

### 1. Launch EC2 Instance

- **AMI**: Amazon Linux 2023 or Ubuntu 22.04
- **Instance type**: t3.small or larger
- **Security group**: Allow inbound on ports 22 (SSH) and 8080 (Dashboard)

### 2. Install Docker

```bash
# Amazon Linux 2023
sudo dnf install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Ubuntu
sudo apt update
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

### 3. Run the Dashboard

```bash
# Pull from ECR (or build locally)
docker run -d \
    --name kastrel-dashboard \
    --restart unless-stopped \
    -p 8080:8080 \
    -e KASTREL_ENV=production \
    YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/kastrel-dashboard:latest
```

---

## Option 3: AWS App Runner (Simplest)

```bash
aws apprunner create-service \
    --service-name kastrel-dashboard \
    --source-configuration '{
        "ImageRepository": {
            "ImageIdentifier": "YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/kastrel-dashboard:latest",
            "ImageRepositoryType": "ECR",
            "ImageConfiguration": {
                "Port": "8080"
            }
        },
        "AuthenticationConfiguration": {
            "AccessRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/AppRunnerECRAccessRole"
        }
    }' \
    --instance-configuration '{
        "Cpu": "1024",
        "Memory": "2048"
    }'
```

---

## Connecting Perches

Once deployed, configure your perches to connect to your dashboard:

```bash
# For ECS/App Runner (behind ALB)
export NEST_URL=http://YOUR-ALB-DNS-NAME.YOUR-REGION.elb.amazonaws.com

# For EC2
export NEST_URL=http://YOUR-EC2-PUBLIC-IP:8080
```

## Adding HTTPS

For production, add an ACM certificate and configure the ALB listener:

1. Request certificate in ACM
2. Add HTTPS listener to ALB on port 443
3. Redirect HTTP to HTTPS

```bash
# Add HTTPS listener
aws elbv2 create-listener \
    --load-balancer-arn YOUR_ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=YOUR_CERTIFICATE_ARN \
    --default-actions Type=forward,TargetGroupArn=YOUR_TARGET_GROUP_ARN
```

---

## Cost Estimates (US East)

| Configuration | Monthly Cost |
|---------------|--------------|
| Fargate (0.5 vCPU, 1GB) | ~$15-20 |
| Fargate (1 vCPU, 2GB) | ~$30-40 |
| EC2 t3.small | ~$15 |
| App Runner (1 vCPU, 2GB, low traffic) | ~$10-30 |

*Plus ALB costs (~$16/month base) and data transfer*

---

## Troubleshooting

### Check ECS task logs

```bash
aws logs get-log-events \
    --log-group-name /ecs/kastrel-dashboard \
    --log-stream-name ecs/kastrel-dashboard/TASK_ID
```

### Check task status

```bash
aws ecs describe-tasks \
    --cluster kastrel-cluster \
    --tasks TASK_ARN
```

### Common issues

1. **Task won't start**: Check security group allows outbound to ECR
2. **Health check failing**: Ensure `/api/v1/health` endpoint works
3. **Can't connect**: Check security group inbound rules and ALB target group health

