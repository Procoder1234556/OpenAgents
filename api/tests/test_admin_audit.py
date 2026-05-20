import os

os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("OPENAGENTS_SKIP_INIT_DB", "1")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.main import app
from api.middleware.auth import get_current_user
from api.models.database import AuditLog, Base, User, get_db


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    async def override_user():
        return {"id": "admin-1", "address": "0xAdmin", "roles": ["admin"]}

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user

    with TestClient(app) as test_client:
        test_client.testing_session_factory = TestingSessionLocal
        yield test_client

    app.dependency_overrides.clear()


def test_admin_action_creates_audit_log(client):
    response = client.post(
        "/admin/users",
        json={"address": "0x0000000000000000000000000000000000000001", "username": "alice"},
        headers={"X-Forwarded-For": "203.0.113.10"},
    )

    assert response.status_code == 200
    logs = client.get("/admin/audit-log").json()
    assert len(logs) == 1
    assert logs[0]["action"] == "admin.user.create"
    assert logs[0]["actor"] == "admin-1"
    assert logs[0]["before_values"] is None
    assert logs[0]["after_values"]["username"] == "alice"
    assert logs[0]["ip"] == "203.0.113.10"


def test_update_captures_before_and_after_values(client):
    created = client.post(
        "/admin/users",
        json={"address": "0x0000000000000000000000000000000000000002", "username": "before"},
    ).json()

    response = client.patch(f"/admin/users/{created['id']}", json={"username": "after"})

    assert response.status_code == 200
    logs = client.get("/admin/audit-log", params={"action": "admin.user.update"}).json()
    assert len(logs) == 1
    assert logs[0]["before_values"]["username"] == "before"
    assert logs[0]["after_values"]["username"] == "after"


def test_audit_log_filters_by_actor_action_and_date_range(client):
    client.put("/admin/parameters/max_reward", json={"value": 100})
    first_log = client.get(
        "/admin/audit-log",
        params={"actor": "admin-1", "action": "admin.parameter.create"},
    ).json()[0]

    response = client.get(
        "/admin/audit-log",
        params={
            "actor": "admin-1",
            "action": "admin.parameter.create",
            "start_date": first_log["timestamp"],
            "end_date": first_log["timestamp"],
        },
    )

    assert response.status_code == 200
    logs = response.json()
    assert len(logs) == 1
    assert logs[0]["target"] == "parameter:max_reward"


def test_audit_records_are_immutable(client):
    client.post(
        "/admin/users",
        json={"address": "0x0000000000000000000000000000000000000003", "username": "locked"},
    )

    db = client.testing_session_factory()
    try:
        audit_log = db.query(AuditLog).first()
        audit_log.action = "tampered"
        with pytest.raises(ValueError, match="immutable"):
            db.commit()
        db.rollback()

        audit_log = db.query(AuditLog).first()
        db.delete(audit_log)
        with pytest.raises(ValueError, match="immutable"):
            db.commit()
    finally:
        db.close()
