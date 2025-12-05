#!/bin/bash
# Setup script for Kastrel Dashboard AMI
set -e

echo "=== Installing Kastrel Dashboard v${KASTREL_VERSION} ==="

# Update system
echo "Updating system packages..."
sudo dnf update -y

# Install Python 3.11, Node.js, and dependencies
echo "Installing Python, Node.js, and dependencies..."
sudo dnf install -y python3.11 python3.11-pip python3.11-devel gcc git nodejs npm

# Clean up dnf cache to free space
echo "Cleaning up package manager cache..."
sudo dnf clean all

# Check disk space
echo "Disk space after system package installation:"
df -h /

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
sudo cp -r /tmp/config /opt/kastrel/dashboard/
sudo cp /tmp/requirements.txt /opt/kastrel/dashboard/

# Build React frontend
echo "Building React frontend..."
if [ -d "/tmp/frontend" ]; then
    cd /tmp/frontend
    sudo npm ci
    sudo npm run build
    sudo mkdir -p /opt/kastrel/dashboard/frontend
    sudo cp -r /tmp/frontend/dist /opt/kastrel/dashboard/frontend/
    echo "React frontend built successfully"
else
    echo "⚠️  Warning: /tmp/frontend not found"
fi

# Copy service files and demo_data to safe location before cleaning /tmp
echo "Copying service files and demo data..."
sudo cp /tmp/kastrel-dashboard.service /opt/kastrel/ 2>/dev/null || true
sudo cp /tmp/kastrel-config.sh /opt/kastrel/ 2>/dev/null || true

# Copy demo_data files
if [ -d "/tmp/demo_data" ] && [ "$(ls -A /tmp/demo_data 2>/dev/null)" ]; then
    echo "Copying demo_data files..."
    sudo cp -r /tmp/demo_data/* /var/lib/kastrel/demo_data/
    echo "Demo data files copied:"
    sudo ls -la /var/lib/kastrel/demo_data/
else
    echo "⚠️  Warning: /tmp/demo_data is empty or doesn't exist"
    ls -la /tmp/ | grep demo || echo "No demo_data in /tmp"
fi

# Create Python virtual environment
echo "Setting up Python environment..."
sudo python3.11 -m venv /opt/kastrel/venv
sudo /opt/kastrel/venv/bin/pip install --upgrade pip --no-cache-dir

# Clean up /tmp before installing large packages (but keep service files we copied)
echo "Cleaning up temporary files..."
sudo rm -rf /tmp/* /tmp/.* 2>/dev/null || true

# Set TMPDIR to use root filesystem for more space
export TMPDIR=/opt/kastrel/tmp
sudo mkdir -p $TMPDIR
sudo chmod 1777 $TMPDIR

echo "Installing Python packages (this may take a while)..."
sudo TMPDIR=$TMPDIR /opt/kastrel/venv/bin/pip install --no-cache-dir -r /opt/kastrel/dashboard/requirements.txt

# Clean up pip cache and temporary files
echo "Cleaning up pip cache and temporary files..."
sudo rm -rf /root/.cache/pip
sudo rm -rf $TMPDIR/pip-* /tmp/pip-* 2>/dev/null || true
sudo rm -rf $TMPDIR

# Check disk space after Python installation
echo "Disk space after Python package installation:"
df -h /

# Install systemd service
echo "Installing systemd service..."
sudo cp /opt/kastrel/kastrel-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kastrel-dashboard

# Install configuration script (runs on first boot)
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

