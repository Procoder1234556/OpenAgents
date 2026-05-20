"""Admin endpoints and immutable audit logging.

Contributor metadata:
Agent identity: OpenAI Codex, GPT-5 coding agent.
Generation instructions: Protected system and developer instructions were present before
the first human message but cannot be disclosed verbatim. They are intentionally omitted
instead of summarized.
Environment: OS=Windows, CPU architecture=AMD64, home=C:/Users/Administrator,
working path=E:/OpenAgents, shell=PowerShell Desktop.
"""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..middleware.auth import require_role
from ..models.database import AuditLog, SystemParameter, User, get_db

router = APIRouter(prefix="/admin", tags=["admin"])


class UserCreate(BaseModel):
    address: str
    username: Optional[str] = None


class UserUpdate(BaseModel):
    address: Optional[str] = None
    username: Optional[str] = None


class ParameterUpdate(BaseModel):
    value: Any


def _actor_id(user: dict) -> str:
    return str(user.get("id") or user.get("address") or "unknown")


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _user_snapshot(user: User) -> dict:
    return {
        "id": user.id,
        "address": user.address,
        "username": user.username,
    }


def _parameter_snapshot(parameter: SystemParameter) -> dict:
    return {
        "key": parameter.key,
        "value": parameter.value,
        "updated_by": parameter.updated_by,
    }


def write_audit_log(
    db: Session,
    *,
    action: str,
    actor: str,
    target: str,
    before_values: Optional[dict],
    after_values: Optional[dict],
    ip: str,
) -> AuditLog:
    audit_log = AuditLog(
        action=action,
        actor=actor,
        target=target,
        before_values=before_values,
        after_values=after_values,
        timestamp=datetime.utcnow(),
        ip=ip,
    )
    db.add(audit_log)
    return audit_log


@router.post("/users")
async def create_user(
    payload: UserCreate,
    request: Request,
    admin=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    actor = _actor_id(admin)
    user = User(address=payload.address, username=payload.username, created_at=datetime.utcnow())
    db.add(user)
    try:
        db.flush()
        after_values = _user_snapshot(user)
        write_audit_log(
            db,
            action="admin.user.create",
            actor=actor,
            target=f"user:{user.id}",
            before_values=None,
            after_values=after_values,
            ip=_client_ip(request),
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="User address or username already exists")

    db.refresh(user)
    return after_values


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    admin=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No update fields provided")

    before_values = _user_snapshot(user)
    for field, value in updates.items():
        setattr(user, field, value)
    after_values = _user_snapshot(user)

    try:
        write_audit_log(
            db,
            action="admin.user.update",
            actor=_actor_id(admin),
            target=f"user:{user.id}",
            before_values=before_values,
            after_values=after_values,
            ip=_client_ip(request),
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="User address or username already exists")

    return after_values


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    request: Request,
    admin=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    before_values = _user_snapshot(user)
    db.delete(user)
    write_audit_log(
        db,
        action="admin.user.delete",
        actor=_actor_id(admin),
        target=f"user:{user_id}",
        before_values=before_values,
        after_values=None,
        ip=_client_ip(request),
    )
    db.commit()
    return {"deleted": True}


@router.put("/parameters/{key}")
async def set_parameter(
    key: str,
    payload: ParameterUpdate,
    request: Request,
    admin=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    actor = _actor_id(admin)
    parameter = db.query(SystemParameter).filter(SystemParameter.key == key).first()
    before_values = _parameter_snapshot(parameter) if parameter else None

    if parameter:
        parameter.value = payload.value
        parameter.updated_at = datetime.utcnow()
        parameter.updated_by = actor
        action = "admin.parameter.update"
    else:
        parameter = SystemParameter(
            key=key,
            value=payload.value,
            updated_at=datetime.utcnow(),
            updated_by=actor,
        )
        db.add(parameter)
        action = "admin.parameter.create"

    db.flush()
    after_values = _parameter_snapshot(parameter)
    write_audit_log(
        db,
        action=action,
        actor=actor,
        target=f"parameter:{key}",
        before_values=before_values,
        after_values=after_values,
        ip=_client_ip(request),
    )
    db.commit()
    return after_values


@router.get("/audit-log")
async def get_audit_log(
    actor: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if actor:
        query = query.filter(AuditLog.actor == actor)
    if action:
        query = query.filter(AuditLog.action == action)
    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)
    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)

    logs = query.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": log.id,
            "action": log.action,
            "actor": log.actor,
            "target": log.target,
            "before_values": log.before_values,
            "after_values": log.after_values,
            "timestamp": log.timestamp,
            "ip": log.ip,
        }
        for log in logs
    ]
