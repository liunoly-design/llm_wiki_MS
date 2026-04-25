import os
import subprocess
from fastapi import APIRouter, HTTPException

router = APIRouter()

WIKI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Digital Brain Wiki"))

def run_git_command(args):
    try:
        result = subprocess.run(
            ["git", "-C", WIKI_DIR] + args,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Git error: {e.stderr}")

@router.get("/status")
def get_git_status():
    status_out = run_git_command(["status"])
    return {"status_output": status_out}

@router.get("/log")
def get_git_log():
    # Structured JSON log: hash|author|date|message — use iso-local for full timestamp
    log_out = run_git_command(["log", "-n", "30", "--pretty=format:%H|%an|%ad|%s", "--date=format:%Y-%m-%d %H:%M"])
    
    commits = []
    for line in log_out.split("\n"):
        if line:
            parts = line.split("|", 3)
            if len(parts) == 4:
                commits.append({
                    "hash": parts[0],
                    "author": parts[1],
                    "date": parts[2],
                    "message": parts[3]
                })
    return {"commits": commits}

@router.post("/restore")
def restore_file(filepath: str):
    if ".." in filepath:
        raise HTTPException(status_code=400, detail="Invalid path")
    out = run_git_command(["restore", filepath])
    return {"message": "File restored", "output": out}

@router.post("/revert")
def revert_to_commit(commit_hash: str):
    # DANGEROUS operation: hard reset to specific commit
    out1 = run_git_command(["reset", "--hard", commit_hash])
    out2 = run_git_command(["clean", "-fd"])
    return {"message": f"Reverted to {commit_hash}", "output": f"{out1}\n{out2}"}

@router.post("/commit")
def commit_changes(message: str):
    run_git_command(["add", "."])
    out = run_git_command(["commit", "-m", message])
    return {"message": "Changes committed", "output": out}
