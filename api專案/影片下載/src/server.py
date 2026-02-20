from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.core import Downloader
import uvicorn
import os

app = FastAPI(title="Local Video Downloader API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

downloader = Downloader()

class DownloadRequest(BaseModel):
    url: str
    format_type: str = "video"  # "video" or "audio"

from fastapi.responses import StreamingResponse
import json

@app.post("/api/download")
async def download_video(request: DownloadRequest):
    result = downloader.download_video(request.url, request.format_type)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@app.post("/api/download-stream")
def download_stream(request: DownloadRequest):
    def event_generator():
        for data in downloader.download_stream(request.url, request.format_type):
            yield f"data: {json.dumps(data)}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")

from fastapi.responses import FileResponse
import os

@app.get("/api/file/{filename}")
def get_file(filename: str):
    safe_filename = os.path.basename(filename)
    file_path = (downloader.download_path / safe_filename).resolve()
    
    # Path traversal validation
    base_dir = downloader.download_path.resolve()
    if not str(file_path).startswith(str(base_dir)):
        raise HTTPException(status_code=403, detail="Invalid file path")
        
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path, 
        filename=safe_filename, 
        media_type='application/octet-stream',
        headers={"Content-Disposition": f"attachment; filename={safe_filename}"}
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "download_dir": str(downloader.download_path)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)
