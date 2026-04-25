import os
import subprocess
from datetime import datetime
import shlex
import asyncio
import pty
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
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
    },
    "fix_structure.py": {
        "name": "Structure Auto-Fixer",
        "description": "Automatically reorganizes directories to comply with UNIFIED_STANDARD.md"
    }
}

@router.get("/discover")
def discover_scripts():
    scripts = []
    seen_names = set()
    
    # 1. Walk WIKI_DIR
    for root, dirs, files in os.walk(WIKI_DIR):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for file in files:
            if file.endswith(".py"):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, WIKI_DIR)
                
                meta = SCRIPT_METADATA.get(file, {
                    "name": file,
                    "description": f"Custom script: {rel_path}"
                })
                
                if meta["name"] not in seen_names:
                    scripts.append({
                        "path": f"python {rel_path}",
                        "name": meta["name"],
                        "description": meta["description"]
                    })
                    seen_names.add(meta["name"])
                
    # 2. Walk local backend/scripts directory
    local_scripts_dir = os.path.join(os.path.dirname(__file__), "..", "scripts")
    if os.path.exists(local_scripts_dir):
        for root, dirs, files in os.walk(local_scripts_dir):
            for file in files:
                if file.endswith(".py"):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, WIKI_DIR)
                    
                    meta = SCRIPT_METADATA.get(file, {
                        "name": file,
                        "description": f"Custom script: {rel_path}"
                    })
                    
                    if meta["name"] not in seen_names:
                        scripts.append({
                            "path": f"python {rel_path}",
                            "name": meta["name"],
                            "description": meta["description"]
                        })
                        seen_names.add(meta["name"])
                    
    return {"scripts": scripts}

@router.post("/run")
def run_script(req: ScriptRequest, db: Session = Depends(get_db)):
    cmd = req.command.strip()
    
    # In case the user pasted a multi-line terminal output, just take the first command line
    if "\n" in cmd:
        cmd = cmd.split("\n")[0].strip()
        
    # In case the user pasted the terminal prompt by mistake
    if "% " in cmd:
        cmd = cmd.split("% ", 1)[1].strip()
    elif "$ " in cmd:
        cmd = cmd.split("$ ", 1)[1].strip()
        
    if not (cmd.lower().startswith("gemini") or cmd.lower().startswith("/opt/homebrew/bin/gemini") or cmd.lower().startswith("python")):
        # If the user enters natural language directly, auto-wrap it in a gemini prompt
        escaped_cmd = cmd.replace('"', '\\"')
        cmd = f'gemini -p "{escaped_cmd}"'
        
    # Auto-inject policy and yolo mode for gemini commands so they can write files
    if cmd.lower().startswith("gemini") or cmd.lower().startswith("/opt/homebrew/bin/gemini"):
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
        
        # Ensure we use the correct python executable
        if run_args[0] == 'python':
            import sys
            run_args[0] = sys.executable
        elif run_args[0] == 'gemini' or run_args[0] == '/opt/homebrew/bin/gemini':
            # Specify absolute path to gemini to avoid environment PATH issues when spawned from web server
            run_args[0] = '/opt/homebrew/bin/gemini'
            
        result = subprocess.run(
            run_args, cwd=WIKI_DIR, capture_output=True, text=True, timeout=1800, env=env
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
    except subprocess.TimeoutExpired as e:
        log.status = "failed"
        output_str = f"[TIMEOUT] Command timed out after {e.timeout} seconds.\n[STDOUT]\n{e.stdout}\n[STDERR]\n{e.stderr}"
        log.output = output_str
        log.end_time = datetime.utcnow()
        db.commit()
        return {
            "stdout": e.stdout or "",
            "stderr": f"Timeout after {e.timeout} seconds\n" + (e.stderr or ""),
            "returncode": 124,
            "actual_command": cmd
        }
    except Exception as e:
        log.status = "failed"
        log.output = str(e)
        log.end_time = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

import json
@router.post("/run/stream")
async def run_script_stream(req: ScriptRequest, db: Session = Depends(get_db)):
    cmd = req.command.strip()
    
    if "\n" in cmd:
        cmd = cmd.split("\n")[0].strip()
        
    if "% " in cmd:
        cmd = cmd.split("% ", 1)[1].strip()
    elif "$ " in cmd:
        cmd = cmd.split("$ ", 1)[1].strip()
        
    if not (cmd.lower().startswith("gemini") or cmd.lower().startswith("/opt/homebrew/bin/gemini") or cmd.lower().startswith("python")):
        escaped_cmd = cmd.replace('"', '\\"')
        cmd = f'gemini -p "{escaped_cmd}"'
        
    if cmd.lower().startswith("gemini") or cmd.lower().startswith("/opt/homebrew/bin/gemini"):
        if "--policy" not in cmd:
            cmd += " --policy 400_System_Kernel/AGENTS.md"
        if "--yolo" not in cmd and "--approval-mode" not in cmd:
            cmd += " --yolo"
        
    log = ExecutionLog(command=cmd, status="running", start_time=datetime.utcnow())
    db.add(log)
    db.commit()
    db.refresh(log)

    env = os.environ.copy()
    env["FORCE_COLOR"] = "1"
    env["TERM"] = "xterm-256color"
    settings = db.query(GlobalSetting).all()
    for s in settings:
        env[s.key] = s.value

    run_args = shlex.split(cmd)
    if run_args[0] == 'python':
        import sys
        run_args[0] = sys.executable
    elif run_args[0] == 'gemini' or run_args[0] == '/opt/homebrew/bin/gemini':
        run_args[0] = '/opt/homebrew/bin/gemini'

    async def event_generator():
        # Yield the actual command so frontend can display it
        yield f"data: {json.dumps({'type': 'meta', 'actual_command': cmd})}\n\n"
        
        master, slave = pty.openpty()
        
        # Set window size for the PTY to prevent CLIs from crashing/hanging
        try:
            import fcntl, termios, struct
            winsize = struct.pack("HHHH", 24, 80, 0, 0)
            fcntl.ioctl(slave, termios.TIOCSWINSZ, winsize)
        except Exception:
            pass
            
        process = await asyncio.create_subprocess_exec(
            *run_args,
            cwd=WIKI_DIR,
            stdin=slave,
            stdout=slave,
            stderr=slave,
            env=env
        )
        os.close(slave)
        
        output_buffer = []
        loop = asyncio.get_running_loop()
        
        # Read from the PTY master
        while True:
            try:
                # We use loop.run_in_executor because os.read can block
                data = await loop.run_in_executor(None, os.read, master, 4096)
                if not data:
                    break
                text = data.decode('utf-8', errors='replace')
                output_buffer.append(text)
                yield f"data: {json.dumps({'type': 'stdout', 'data': text})}\n\n"
            except OSError:
                break
                
        await process.wait()
        os.close(master)
        
        returncode = process.returncode
        full_output = "".join(output_buffer)
        
        # Update log
        log.status = "success" if returncode == 0 else "failed"
        log.output = full_output
        log.end_time = datetime.utcnow()
        # Since we are in an async generator, we should use a fresh db session or just commit the existing one carefully.
        try:
            db.commit()
        except:
            pass
            
        yield f"data: {json.dumps({'type': 'end', 'returncode': returncode, 'stdout': full_output, 'stderr': ''})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

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
