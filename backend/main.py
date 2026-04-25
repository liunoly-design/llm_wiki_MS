import os
import secrets
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from database import init_db
from scheduler import start_scheduler, shutdown_scheduler

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()

app = FastAPI(title="Wiki Management System", lifespan=lifespan)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBasic()

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, os.getenv("WEB_USERNAME", "admin"))
    correct_password = secrets.compare_digest(credentials.password, os.getenv("WEB_PASSWORD", "secret123"))
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Wiki Management System API"}

@app.get("/api/health", dependencies=[Depends(verify_credentials)])
def check_health():
    return {"status": "ok"}

# We will include routers here once created
from routers import wiki, git, scripts, livesync, config
app.include_router(wiki.router, prefix="/api/wiki", dependencies=[Depends(verify_credentials)])
app.include_router(git.router, prefix="/api/git", dependencies=[Depends(verify_credentials)])
app.include_router(scripts.router, prefix="/api/scripts", dependencies=[Depends(verify_credentials)])
app.include_router(livesync.router, prefix="/api/livesync", dependencies=[Depends(verify_credentials)])
app.include_router(config.router, prefix="/api/config", dependencies=[Depends(verify_credentials)])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
