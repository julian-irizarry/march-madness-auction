import uvicorn
from dotenv import load_dotenv
import os

load_dotenv()

if __name__ == "__main__":
    uvicorn.run(
        "app.api:app", 
        host=os.getenv("REACT_APP_BACKEND_HOST", "127.0.0.1"), 
        port=int(os.getenv("REACT_APP_BACKEND_PORT", 8000)), 
        reload=True
    )
