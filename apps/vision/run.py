"""
Entry point for the PyInstaller-frozen vision-server sidecar.

Imports the FastAPI `app` object directly (avoids string-based import,
which is unreliable with PyInstaller) and runs uvicorn on a fixed port.
"""
import uvicorn
from src.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8003, log_level="warning")
