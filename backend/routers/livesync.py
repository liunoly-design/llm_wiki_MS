import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

LIVESYNC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Digital Brain Wiki/.obsidian/plugins/obsidian-livesync"))
DATA_JSON_PATH = os.path.join(LIVESYNC_DIR, "data.json")
LOG_PATH = os.path.join(LIVESYNC_DIR, "livesync.log")

class LiveSyncStatus(BaseModel):
    configured: bool
    write_log_enabled: bool
    log_content: str

@router.get("/status", response_model=LiveSyncStatus)
def get_livesync_status():
    if not os.path.exists(DATA_JSON_PATH):
        return LiveSyncStatus(configured=False, write_log_enabled=False, log_content="Plugin not found.")

    try:
        with open(DATA_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to read data.json")

    write_log = data.get("writeLogToTheFile", False)
    
    log_content = ""
    if os.path.exists(LOG_PATH):
        try:
            with open(LOG_PATH, "r", encoding="utf-8") as f:
                # Read last 50 lines
                lines = f.readlines()
                log_content = "".join(lines[-50:])
        except Exception:
            log_content = "Failed to read log file."
    else:
        log_content = "No log file found."

    return LiveSyncStatus(
        configured=True,
        write_log_enabled=write_log,
        log_content=log_content
    )

@router.post("/toggle-log")
def toggle_livesync_log(enable: bool):
    if not os.path.exists(DATA_JSON_PATH):
        raise HTTPException(status_code=404, detail="Plugin not found")
        
    try:
        with open(DATA_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        data["writeLogToTheFile"] = enable
        
        with open(DATA_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            
        return {"message": f"Log writing {'enabled' if enable else 'disabled'} successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
