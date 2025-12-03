#!/bin/bash
# Cleanup script for AMI - removes sensitive data and prepares for distribution
set -e

echo "=== Cleaning up for AMI ==="

# Remove temporary files
sudo rm -rf /tmp/*

# Clear SSH host keys (regenerated on first boot)
sudo rm -f /etc/ssh/ssh_host_*

# Clear machine-id (regenerated on first boot)
sudo truncate -s 0 /etc/machine-id

# Clear logs
sudo rm -rf /var/log/*
sudo rm -rf /var/lib/kastrel/logs/*

# Clear bash history
cat /dev/null > ~/.bash_history
history -c

# Clear cloud-init data (so it runs again on new instances)
sudo rm -rf /var/lib/cloud/instances/*

# Remove any cached credentials
sudo rm -rf /root/.aws
rm -rf ~/.aws

echo "=== Cleanup complete ==="

