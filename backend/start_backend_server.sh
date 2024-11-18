#!/bin/bash

echo "Starting backend server at ${REACT_APP_BACKEND_HOST}:${REACT_APP_BACKEND_PORT}"

# Path to FastAPI application
FASTAPI_APP="app.api:app"

uvicorn $FASTAPI_APP --reload
