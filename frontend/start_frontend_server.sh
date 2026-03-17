#!/bin/bash

echo "Starting frontend server at ${FRONTEND_HOST}:${FRONTEND_PORT}"

# Path to your project directory
PROJECT_DIR="/app/"

cd $PROJECT_DIR && npx vite --host 0.0.0.0 --port ${FRONTEND_PORT:-3000}
