import os
import subprocess
from datetime import datetime
import shlex
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, ExecutionLog, CronJob, GlobalSetting
from scheduler import sync_scheduler_from_db

router = APIRouter()

WIKI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Digital Brain Wiki"))

class ScriptRequest(BaseModel):
    command: str

class CronJobRequest(BaseModel):
    command: str
    cron_expression: str

# Conceptual mapping based on LLM Wiki philosophy
SCRIPT_METADATA = {
    "ingest.py": {
        "name": "Cognitive Ingestor",
        "description": "Auto-compiles raw notes into the Wiki Graph"
    },
    "lint.py": {
        "name": "Wiki Sanitizer",
        "description": "Deep health inspection and auto-sorting of stray files"
    },
    "query.py": {
        "name": "Deep Query Router",
        "description": "Retrieves and synthesizes knowledge"
    }
}

@router.get("/discover")
def discover_scripts():
    scripts = []
    for root, dirs, files in os.walk(WIKI_DIR):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for file in files:
            if file.endswith(".py"):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, WIKI_DIR)
                
                # Assign conceptual name if known
                meta = SCRIPT_METADATA.get(file, {
                    "name": file,
                    "description": f"Custom script: {rel_path}"
                })
                
                scripts.append({
                    "path": f"python {rel_path}",
                    "name": meta["name"],
                    "description": meta["description"]
                })
    return {"scripts": scripts}

@router.post("/run")
def run_script(req: ScriptRequest, db: Session = Depends(get_db)):
    cmd = req.command.strip()
    if not (cmd.lower().startswith("gemini") or cmd.lower().startswith("python")):
        raise HTTPException(status_code=400, detail="Only 'gemini' or 'python' commands are supported.")
        
    # Auto-inject policy and yolo mode for gemini commands so they can write files
    if cmd.lower().startswith("gemini"):
        if "--policy" not in cmd:
            cmd += " --policy 400_System_Kernel/AGENTS.md"
        if "--yolo" not in cmd and "--approval-mode" not in cmd:
            cmd += " --yolo"
        
    log = ExecutionLog(command=cmd, status="running", start_time=datetime.utcnow())
    db.add(log)
    db.commit()
    db.refresh(log)

    # Inject dynamic settings into environment
    env = os.environ.copy()
    settings = db.query(GlobalSetting).all()
    for s in settings:
        env[s.key] = s.value

    try:
        run_args = shlex.split(cmd)
        result = subprocess.run(
            run_args, cwd=WIKI_DIR, capture_output=True, text=True, timeout=300, env=env
        )
        log.status = "success" if result.returncode == 0 else "failed"
        output = f"[STDOUT]\n{result.stdout}\n[STDERR]\n{result.stderr}"
        log.output = output
        log.end_time = datetime.utcnow()
        db.commit()
        
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "actual_command": cmd
        }
    except Exception as e:
        log.status = "failed"
        log.output = str(e)
        log.end_time = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cron")
def list_cron_jobs(db: Session = Depends(get_db)):
    jobs = db.query(CronJob).all()
    return jobs

@router.post("/cron")
def add_cron_job(req: CronJobRequest, db: Session = Depends(get_db)):
    job = CronJob(command=req.command, cron_expression=req.cron_expression)
    db.add(job)
    db.commit()
    sync_scheduler_from_db()
    return {"message": "Job added"}

@router.delete("/cron/{job_id}")
def delete_cron_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(CronJob).filter(CronJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    sync_scheduler_from_db()
    return {"message": "Job deleted"}
