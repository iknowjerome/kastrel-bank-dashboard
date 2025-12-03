#!/bin/bash
# Setup script for Kastrel Dashboard AMI
set -e

echo "=== Installing Kastrel Dashboard v${KASTREL_VERSION} ==="

# Update system
echo "Updating system packages..."
sudo dnf update -y

# Install Python 3.11 and dependencies
echo "Installing Python and dependencies..."
sudo dnf install -y python3.11 python3.11-pip python3.11-devel gcc git

# Create application user
echo "Creating kastrel user..."
sudo useradd -r -s /bin/false kastrel || true

# Create application directories
echo "Setting up directories..."
sudo mkdir -p /opt/kastrel/dashboard
sudo mkdir -p /var/lib/kastrel/{data,logs,demo_data}
sudo mkdir -p /etc/kastrel

# Install application
echo "Installing application..."
sudo cp -r /tmp/app /opt/kastrel/dashboard/
sudo cp -r /tmp/frontend /opt/kastrel/dashboard/
sudo cp -r /tmp/config /opt/kastrel/dashboard/
sudo cp /tmp/requirements.txt /opt/kastrel/dashboard/

# Create Python virtual environment
echo "Setting up Python environment..."
sudo python3.11 -m venv /opt/kastrel/venv
sudo /opt/kastrel/venv/bin/pip install --upgrade pip
sudo /opt/kastrel/venv/bin/pip install -r /opt/kastrel/dashboard/requirements.txt

# Install systemd service
echo "Installing systemd service..."
sudo cp /tmp/kastrel-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kastrel-dashboard

# Install configuration script (runs on first boot)
sudo cp /tmp/kastrel-config.sh /opt/kastrel/
sudo chmod +x /opt/kastrel/kastrel-config.sh

# Create first-boot service
cat << 'EOF' | sudo tee /etc/systemd/system/kastrel-firstboot.service
[Unit]
Description=Kastrel Dashboard First Boot Configuration
After=network-online.target
Wants=network-online.target
Before=kastrel-dashboard.service
ConditionPathExists=!/var/lib/kastrel/.configured

[Service]
Type=oneshot
ExecStart=/opt/kastrel/kastrel-config.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable kastrel-firstboot

# Set ownership
sudo chown -R kastrel:kastrel /opt/kastrel
sudo chown -R kastrel:kastrel /var/lib/kastrel

# Configure firewall (if firewalld is running)
if systemctl is-active --quiet firewalld; then
    sudo firewall-cmd --permanent --add-port=8080/tcp
    sudo firewall-cmd --reload
fi

echo "=== Setup complete ==="

