# Packer template for Kastrel Dashboard AMI
# This creates an AMI suitable for AWS Marketplace distribution

packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

# Variables
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "ami_name_prefix" {
  type    = string
  default = "kastrel-dashboard"
}

variable "version" {
  type    = string
  default = "1.0.0"
}

variable "instance_type" {
  type    = string
  default = "t3.small"
}

# Data source to get latest Amazon Linux 2023 AMI
data "amazon-ami" "amazon_linux_2023" {
  filters = {
    name                = "al2023-ami-*-x86_64"
    virtualization-type = "hvm"
    root-device-type    = "ebs"
  }
  owners      = ["amazon"]
  most_recent = true
  region      = var.aws_region
}

# Locals
locals {
  timestamp = formatdate("YYYYMMDD-hhmmss", timestamp())
  ami_name  = "${var.ami_name_prefix}-${var.version}-${local.timestamp}"
}

# Build configuration
source "amazon-ebs" "kastrel_dashboard" {
  ami_name        = local.ami_name
  ami_description = "Kastrel Dashboard v${var.version} - Bank monitoring and visualization"
  instance_type   = var.instance_type
  region          = var.aws_region
  source_ami      = data.amazon-ami.amazon_linux_2023.id

  ssh_username = "ec2-user"

  # AMI configuration
  ami_virtualization_type = "hvm"
  ena_support             = true

  # For Marketplace - share with specific accounts or make public
  # ami_users = ["123456789012"]  # Share with specific accounts
  
  # Tags
  tags = {
    Name        = local.ami_name
    Application = "kastrel-dashboard"
    Version     = var.version
    BuildTime   = local.timestamp
    ManagedBy   = "packer"
  }

  # Launch block device mappings
  # 35GB: 30GB minimum required by base AMI snapshot + 5GB for PyTorch/CUDA
  # package downloads and temporary extraction during pip install
  launch_block_device_mappings {
    device_name           = "/dev/xvda"
    volume_size           = 35
    volume_type           = "gp3"
    delete_on_termination = true
  }
}

# Build steps
build {
  name    = "kastrel-dashboard"
  sources = ["source.amazon-ebs.kastrel_dashboard"]

  # Upload application files
  provisioner "file" {
    source      = "../../app"
    destination = "/tmp/app"
  }

  provisioner "file" {
    source      = "../../frontend"
    destination = "/tmp/frontend"
  }

  provisioner "file" {
    source      = "../../config"
    destination = "/tmp/config"
  }

  provisioner "file" {
    source      = "../../requirements.txt"
    destination = "/tmp/requirements.txt"
  }

  provisioner "file" {
    source      = "../../demo_data"
    destination = "/tmp/demo_data"
  }

  provisioner "file" {
    source      = "files/kastrel-dashboard.service"
    destination = "/tmp/kastrel-dashboard.service"
  }

  provisioner "file" {
    source      = "files/kastrel-config.sh"
    destination = "/tmp/kastrel-config.sh"
  }

  # Install and configure everything
  provisioner "shell" {
    script = "scripts/setup.sh"
    environment_vars = [
      "KASTREL_VERSION=${var.version}"
    ]
  }

  # Clean up for AMI
  provisioner "shell" {
    script = "scripts/cleanup.sh"
  }

  # Post-processor for manifest
  post-processor "manifest" {
    output     = "manifest.json"
    strip_path = true
  }
}

