import os
import pytest
from fastapi.testclient import TestClient
from main import app
import base64

client = TestClient(app)

# Use the default credentials from .env or fallback
USERNAME = os.getenv("WEB_USERNAME", "admin")
PASSWORD = os.getenv("WEB_PASSWORD", "digitalbrain2026")
auth_token = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
headers = {"Authorization": f"Basic {auth_token}"}

def test_unauthorized_access():
    response = client.get("/api/health")
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}

def test_authorized_health_check():
    response = client.get("/api/health", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_wiki_health():
    response = client.get("/api/wiki/health", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_notes" in data
    assert "concept_count" in data
    assert "tags" in data
    assert "success_rate" in data

def test_script_discover():
    response = client.get("/api/scripts/discover", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "scripts" in data
    assert isinstance(data["scripts"], list)
