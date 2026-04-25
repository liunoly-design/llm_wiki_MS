import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = os.path.join(os.path.dirname(__file__), "wiki_admin.db")
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class ExecutionLog(Base):
    __tablename__ = "executions"

    id = Column(Integer, primary_key=True, index=True)
    command = Column(String, index=True)
    status = Column(String) # "success", "failed", "running"
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    output = Column(Text, nullable=True)

class CronJob(Base):
    __tablename__ = "cron_jobs"

    id = Column(Integer, primary_key=True, index=True)
    command = Column(String)
    cron_expression = Column(String) # e.g., "0 * * * *"
    enabled = Column(Boolean, default=True)

class GlobalSetting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
