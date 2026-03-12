#!/bin/bash
set -euo pipefail

# Stop script for helm-deployer daemon
SERVER_PATH="$(pwd)/app.js"
LOG_PATH="$(pwd)/server.log"
SERVICE_NAME="helm-deployer.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME"

# 1) Stop systemd service if present
if command -v systemctl >/dev/null 2>&1; then
  if sudo systemctl list-unit-files --type=service | grep -q "^${SERVICE_NAME}"; then
    echo "Stopping systemd service $SERVICE_NAME..."
    sudo systemctl stop "$SERVICE_NAME" || true
    sudo systemctl disable "$SERVICE_NAME" || true
    echo "Removing service file (if present): $SERVICE_PATH"
    sudo rm -f "$SERVICE_PATH" || true
    sudo systemctl daemon-reload || true
    echo "Systemd service stopped and removed."
  fi
fi

# 2) Stop any background node processes running the SERVER_PATH
PIDS=$(ps -eo pid,args | awk -v sp="$SERVER_PATH" '$0 ~ sp {print $1}') || true

if [ -n "$PIDS" ]; then
  echo "Found node process(es) for $SERVER_PATH: $PIDS"
  for pid in $PIDS; do
    if [ -z "$pid" ]; then
      continue
    fi
    echo "Sending TERM to PID $pid"
    kill "$pid" || true
    sleep 1
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "PID $pid still alive, sending KILL"
      kill -9 "$pid" || true
    fi
  done
  echo "Background node process(es) stopped."
else
  echo "No background node processes for $SERVER_PATH found."
fi

# 3) Inform about log
if [ -f "$LOG_PATH" ]; then
  echo "Logs are at: $LOG_PATH"
fi

echo "stop-daemon: done"
