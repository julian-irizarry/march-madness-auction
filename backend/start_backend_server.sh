#!/bin/bash

# Path to FastAPI application
FASTAPI_APP="app.api:app"

uvicorn $FASTAPI_APP --reload
