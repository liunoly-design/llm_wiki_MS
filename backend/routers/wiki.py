import os
import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_db, ExecutionLog
from sqlalchemy.orm import Session
from sqlalchemy import desc

router = APIRouter()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Digital Brain Wiki"))
WIKI_GRAPH_DIR = os.path.join(BASE_DIR, "200_Wiki_Graph")
INTAKE_DIR = os.path.join(BASE_DIR, "000_Intake")
RAW_MEMORY_DIR = os.path.join(BASE_DIR, "100_Raw_Memory")
INDEX_FILE = os.path.join(WIKI_GRAPH_DIR, ".index.md")

tag_pattern = re.compile(r"#([a-zA-Z0-9_\-]+)")

class WikiStats(BaseModel):
    # Overall
    total_notes: int
    concept_count: int
    
    # Pillar A: Intake
    intake_count: int
    
    # Pillar B: Graph Integrity
    orphan_count: int
    contradiction_count: int
    broken_yaml_count: int
    
    # Pillar C: System Hygiene
    raw_memory_count: int
    stray_count: int
    
    # Pillar D: Architecture & Structure
    structure_issues: list[dict]

    # Existing Dashboard Data
    tags: dict[str, int]
    recent_notes: list[dict]
    latest_executions: list[dict]
    success_rate: float

@router.get("/health", response_model=WikiStats)
def get_wiki_health(db: Session = Depends(get_db)):
    if not os.path.exists(BASE_DIR):
        return WikiStats(
            total_notes=0, concept_count=0, intake_count=0, orphan_count=0, 
            contradiction_count=0, broken_yaml_count=0, raw_memory_count=0, 
            stray_count=0, structure_issues=[], tags={}, recent_notes=[], latest_executions=[], success_rate=0
        )

    # Variables
    total_notes = 0
    concept_count = 0
    intake_count = 0
    raw_memory_count = 0
    orphan_count = 0
    contradiction_count = 0
    broken_yaml_count = 0
    stray_count = 0
    tag_counts = {}
    notes_list = []
    structure_issues = []

    # Helper for structure checks
    def check_directory_structure(directory, valid_pattern, error_type, description_template):
        if not os.path.exists(directory): return
        for item in os.listdir(directory):
            item_path = os.path.join(directory, item)
            if os.path.isdir(item_path) and not item.startswith("."):
                if not re.match(valid_pattern, item):
                    structure_issues.append({
                        "path": os.path.relpath(item_path, BASE_DIR),
                        "type": error_type,
                        "description": description_template.format(item=item)
                    })

    # Read Index for Orphan checking
    index_content = ""
    if os.path.exists(INDEX_FILE):
        try:
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                index_content = f.read()
        except Exception: pass

    # Check lists
    exempt_files = ["readme.md", "欢迎.md"]
    valid_root_dirs = ["000_Intake", "100_Raw_Memory", "200_Wiki_Graph", "300_Projects", "400_System_Kernel"]

    # 0. Check Root Orphan Directories
    for f in os.listdir(BASE_DIR):
        f_path = os.path.join(BASE_DIR, f)
        if os.path.isdir(f_path) and not f.startswith(".") and f != "llm_wiki_MS":
            if f not in valid_root_dirs and not re.match(r"^[0-4]00_", f):
                structure_issues.append({
                    "path": f,
                    "type": "E_ORPHAN",
                    "description": f"游离的系统分类，根目录应只包含 000-400 核心目录: {f}"
                })

    # 0.1 Check Subdirectory Naming Conventions
    check_directory_structure(WIKI_GRAPH_DIR, r"^2[0-9]0_", "E_NAMING", "Wiki Graph 子目录缺少 2X0_ 前缀: {item}")
    check_directory_structure(os.path.join(BASE_DIR, "300_Projects"), r"^3[0-9]0_", "E_NAMING", "Projects 子目录缺少 3X0_ 前缀: {item}")
    check_directory_structure(os.path.join(BASE_DIR, "400_System_Kernel"), r"^4[0-9]0_", "E_NAMING", "Kernel 子目录缺少 4X0_ 前缀: {item}")

    # 1. Check Intake
    if os.path.exists(INTAKE_DIR):
        for root, dirs, files in os.walk(INTAKE_DIR):
            for file in files:
                if file.endswith(".md") and not file.startswith(".") and file.lower() not in exempt_files:
                    intake_count += 1

    # 2. Check Raw Memory
    if os.path.exists(RAW_MEMORY_DIR):
        for root, dirs, files in os.walk(RAW_MEMORY_DIR):
            for file in files:
                if file.endswith(".md") and not file.startswith(".") and file.lower() not in exempt_files:
                    raw_memory_count += 1

    # 3. Check Stray Files in Root
    for f in os.listdir(BASE_DIR):
        if f.endswith(".md") and not f.startswith(".") and f.lower() not in exempt_files:
            stray_count += 1

    # 4. Check Wiki Graph Integrity
    if os.path.exists(WIKI_GRAPH_DIR):
        for root, dirs, files in os.walk(WIKI_GRAPH_DIR):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            for file in files:
                if file.endswith(".md") and not file.startswith(".") and file.lower() not in exempt_files:
                    total_notes += 1
                    file_path = os.path.join(root, file)
                    mtime = os.path.getmtime(file_path)
                    notes_list.append({"path": os.path.relpath(file_path, BASE_DIR), "mtime": mtime})
                    
                    page_name = file.replace(".md", "")
                    
                    # Orphan Check (ignore .index.md itself)
                    if file != ".index.md" and f"[[{page_name}]]" not in index_content:
                        orphan_count += 1

                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()
                            
                            # Contradiction Check
                            if "[!contradiction]" in content:
                                contradiction_count += 1
                                
                            # YAML Schema Check
                            if not content.startswith("---") or 'title: "' not in content:
                                broken_yaml_count += 1
                            
                            # Tags & Concepts
                            tags = tag_pattern.findall(content)
                            for t in tags:
                                tag_counts[t] = tag_counts.get(t, 0) + 1
                                if t.lower() == "concept":
                                    concept_count += 1
                    except Exception:
                        pass

    # Sort recent notes
    notes_list.sort(key=lambda x: x["mtime"], reverse=True)
    recent_notes = notes_list[:10]
    
    # Fetch executions
    execs = db.query(ExecutionLog).order_by(desc(ExecutionLog.start_time)).limit(10).all()
    latest_executions = [{
        "id": e.id, "command": e.command, "status": e.status, 
        "start_time": e.start_time.isoformat() if e.start_time else None,
        "output": e.output
    } for e in execs]
    
    # Calculate success rate
    total_execs = db.query(ExecutionLog).count()
    successful = db.query(ExecutionLog).filter(ExecutionLog.status == "success").count()
    success_rate = (successful / total_execs * 100) if total_execs > 0 else 0

    return WikiStats(
        total_notes=total_notes,
        concept_count=concept_count,
        intake_count=intake_count,
        orphan_count=orphan_count,
        contradiction_count=contradiction_count,
        broken_yaml_count=broken_yaml_count,
        raw_memory_count=raw_memory_count,
        stray_count=stray_count,
        structure_issues=structure_issues,
        tags=tag_counts,
        recent_notes=recent_notes,
        latest_executions=latest_executions,
        success_rate=success_rate
    )
