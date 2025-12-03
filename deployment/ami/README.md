# Kastrel Dashboard AMI Build

This directory contains everything needed to build an AMI for AWS Marketplace distribution.

## Overview

The AMI includes:
- **Amazon Linux 2023** base (security-hardened, long-term support)
- **Python 3.11** with virtual environment
- **Kastrel Dashboard** pre-installed and configured
- **systemd service** for automatic startup
- **First-boot configuration** via EC2 user-data

## Prerequisites

1. **Packer** (>= 1.8) - https://www.packer.io/downloads
2. **AWS CLI** configured with appropriate permissions
3. **IAM permissions** for EC2, AMI creation

## Building the AMI

```bash
# Build with defaults (v1.0.0, us-east-1)
./build.sh

# Build specific version
./build.sh 1.2.0 us-west-2
```

## Client Experience

When a client launches your AMI:

### 1. Launch Instance

```bash
aws ec2 run-instances \
    --image-id ami-xxxxxxxxx \
    --instance-type t3.small \
    --key-name their-key \
    --security-group-ids sg-xxx \
    --subnet-id subnet-xxx
```

### 2. Access Dashboard

After ~2 minutes, dashboard is available at:
```
http://<instance-public-ip>:8080
```

### 3. Configure Perches

Point perches to the dashboard:
```bash
export NEST_URL=http://<instance-ip>:8080
```

## Client Customization

Clients can customize via **EC2 User Data**:

```bash
# In user-data (plain text, not base64)
KASTREL_LOG_LEVEL=debug
KASTREL_CUSTOM_SETTING=value
```

Or after launch:
```bash
# SSH to instance
sudo vim /etc/kastrel/environment

# Restart service
sudo systemctl restart kastrel-dashboard
```

## AMI Contents

```
/opt/kastrel/
├── venv/                    # Python virtual environment
├── dashboard/
│   ├── app/                 # Application code
│   ├── frontend/            # Web UI
│   └── config/              # Configuration files
└── kastrel-config.sh        # First-boot script

/var/lib/kastrel/
├── data/                    # Persistent data
├── logs/                    # Log files
└── demo_data/               # Demo data directory

/etc/kastrel/
└── environment              # Environment configuration

/etc/systemd/system/
├── kastrel-dashboard.service    # Main service
└── kastrel-firstboot.service    # First-boot config
```

## Service Management

```bash
# Status
sudo systemctl status kastrel-dashboard

# Logs
sudo journalctl -u kastrel-dashboard -f

# Restart
sudo systemctl restart kastrel-dashboard

# Stop
sudo systemctl stop kastrel-dashboard
```

## Security Recommendations for Marketplace

1. **Remove default credentials** - None included by default
2. **SSH key required** - No password auth
3. **Security group** - Client must open port 8080
4. **HTTPS** - Recommend ALB/NLB with ACM certificate in front

## AWS Marketplace Submission

To submit to AWS Marketplace:

1. **Build production AMI** in `us-east-1`
2. **Share with AWS Marketplace account** (679593333241)
3. **Complete seller registration** at https://aws.amazon.com/marketplace/management
4. **Submit product listing** with:
   - AMI ID
   - Supported instance types
   - Pricing (free, hourly, annual)
   - Usage instructions
   - EULA

### Sharing AMI for Marketplace

```bash
# Get AMI ID
AMI_ID=$(cat manifest.json | jq -r '.builds[-1].artifact_id' | cut -d: -f2)

# Share with Marketplace
aws ec2 modify-image-attribute \
    --image-id $AMI_ID \
    --launch-permission "Add=[{UserId=679593333241}]"
```

## Comparison: AMI vs Container

| For Clients Who... | Recommend |
|--------------------|-----------|
| Want simple EC2 deployment | **AMI** |
| Already use ECS/Kubernetes | **Container** |
| Need Marketplace billing | **AMI** (easier) |
| Want automatic updates | **Container** |
| Have strict compliance | **AMI** (full control) |

## Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u kastrel-dashboard -n 100

# Check configuration
sudo cat /etc/kastrel/environment

# Check permissions
ls -la /opt/kastrel/
ls -la /var/lib/kastrel/
```

### First-boot didn't run

```bash
# Check if configured
ls -la /var/lib/kastrel/.configured

# Re-run manually
sudo rm /var/lib/kastrel/.configured
sudo /opt/kastrel/kastrel-config.sh
sudo systemctl restart kastrel-dashboard
```

