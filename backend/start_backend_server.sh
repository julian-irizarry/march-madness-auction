#!/bin/bash

echo "Starting backend server at ${VITE_BACKEND_HOST}:${VITE_BACKEND_PORT}"

# Path to FastAPI application
FASTAPI_APP="app.api:app"

uvicorn $FASTAPI_APP --reload
