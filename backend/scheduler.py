import subprocess
import os
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from database import SessionLocal, ExecutionLog, CronJob, GlobalSetting

scheduler = BackgroundScheduler()

WIKI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Digital Brain Wiki"))

def execute_job(command: str):
    db = SessionLocal()
    
    # Create execution log
    log = ExecutionLog(
        command=command,
        status="running",
        start_time=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    
    
    # Inject settings
    env = os.environ.copy()
    settings = db.query(GlobalSetting).all()
    for s in settings:
        env[s.key] = s.value

    try:
        run_args = command.split()
        result = subprocess.run(
            run_args,
            cwd=WIKI_DIR,
            capture_output=True,
            text=True,
            timeout=120,
            env=env
        )
        
        log.status = "success" if result.returncode == 0 else "failed"
        log.output = f"[STDOUT]\n{result.stdout}\n[STDERR]\n{result.stderr}"
        log.end_time = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        log.status = "failed"
        log.output = str(e)
        log.end_time = datetime.utcnow()
        db.commit()
    finally:
        db.close()

def sync_scheduler_from_db():
    scheduler.remove_all_jobs()
    db = SessionLocal()
    try:
        jobs = db.query(CronJob).filter(CronJob.enabled == True).all()
        for job in jobs:
            try:
                trigger = CronTrigger.from_crontab(job.cron_expression)
                scheduler.add_job(
                    execute_job,
                    trigger=trigger,
                    args=[job.command],
                    id=str(job.id),
                    replace_existing=True
                )
            except Exception as e:
                print(f"Failed to schedule job {job.id}: {e}")
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        scheduler.start()
    sync_scheduler_from_db()

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
