#!/bin/bash
# =========================================
# Node.js Daemon
# =========================================

# Absolute path to your Node.js server
SERVER_PATH="$(pwd)/app.js"
LOG_PATH="$(pwd)/server.log"
SERVICE_NAME="helm-deployer.service"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Node.js not found. Please install Node.js first."
  exit 1
fi

# Check if server.js exists
if [ ! -f "$SERVER_PATH" ]; then
  echo "server.js not found in $(pwd). Please add it and rerun this script."
  exit 1
fi

# -----------------------------------------
# 1. Start the server as a daemon (current session)
# -----------------------------------------
# nohup node "$SERVER_PATH" >> "$LOG_PATH" 2>&1 &
PID=$!
echo "Node.js server started as daemon with PID: $PID"
echo "Logs are being written to $LOG_PATH"

# -----------------------------------------
# 2. Create systemd service for auto startup (Linux)
# -----------------------------------------
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME"

if [ "$(uname)" != "Linux" ]; then
  echo "Auto-start setup is currently implemented for Linux only."
else
  echo "Creating systemd service at $SERVICE_PATH..."

  # Create the service file
  sudo bash -c "cat > $SERVICE_PATH" <<EOL
[Unit]
Description=Node.js Server Daemon
After=network.target

[Service]
ExecStart=$(which node) $SERVER_PATH
WorkingDirectory=$(pwd)
Restart=always
RestartSec=5
StandardOutput=append:$LOG_PATH
StandardError=append:$LOG_PATH
User=$(whoami)
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

  # Enable and start the service
  sudo systemctl daemon-reload
  sudo systemctl enable $SERVICE_NAME
  sudo systemctl start $SERVICE_NAME
  echo "Systemd service created and started. It will auto-start on boot."
fi

echo "Setup complete!"
