#!/bin/bash
# Install devbot.local mDNS alias service
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing devbot-mdns..."

# Install the script
sudo cp "$SCRIPT_DIR/devbot-mdns" /usr/local/bin/devbot-mdns
sudo chmod +x /usr/local/bin/devbot-mdns

# Install the LaunchDaemon
sudo cp "$SCRIPT_DIR/local.devbot.mdns.plist" /Library/LaunchDaemons/local.devbot.mdns.plist
sudo chown root:wheel /Library/LaunchDaemons/local.devbot.mdns.plist
sudo chmod 644 /Library/LaunchDaemons/local.devbot.mdns.plist

# Load and start the service
sudo launchctl load /Library/LaunchDaemons/local.devbot.mdns.plist

echo ""
echo "Done! devbot.local is now registered."
echo "Test it: ping devbot.local"
echo "Access DevBot: http://devbot.local:3100"
echo ""
echo "To uninstall:"
echo "  sudo launchctl unload /Library/LaunchDaemons/local.devbot.mdns.plist"
echo "  sudo rm /Library/LaunchDaemons/local.devbot.mdns.plist"
echo "  sudo rm /usr/local/bin/devbot-mdns"
