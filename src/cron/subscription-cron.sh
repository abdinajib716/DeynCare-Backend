#!/bin/bash
# subscription-cron.sh
# Script to run the subscription tasks via CRON
# Place this in your server's cron directory and make it executable with:
# chmod +x subscription-cron.sh

# Set environment variables if needed (or use a .env file)
# export NODE_ENV=production

# Path to your project directory - update this!
PROJECT_DIR="/path/to/deyncare-backend"

# Log file for CRON output
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p $LOG_DIR

# Date stamp for log files
DATE=$(date +"%Y-%m-%d_%H-%M-%S")

# Run the subscription tasks with Node
echo "Running subscription tasks at $DATE" >> "$LOG_DIR/subscription-cron.log"
cd $PROJECT_DIR && node src/cron/subscriptionTasks.js all >> "$LOG_DIR/subscription-cron-$DATE.log" 2>&1

# Exit with the status of the node command
exit $?
