import secrets

import fastapi

from database import db, fetchone
from dependencies import get_current_user
from models import AuthRequest, ChangePasswordRequest
from security import hash_password, verify_password, _now_iso

router = fastapi.APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup")
async def signup(data: AuthRequest):
    user_id = secrets.token_hex(16)
    pw_hash = hash_password(data.password)
    async with db() as conn:
        try:
            await conn.execute(
                "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (user_id, data.email.lower().strip(), pw_hash, _now_iso()),
            )
            await conn.commit()
        except Exception:
            raise fastapi.HTTPException(status_code=400, detail="Email already registered")
    return {"success": True}


@router.post("/login")
async def login(data: AuthRequest):
    async with db() as conn:
        row = await fetchone(
            conn,
            "SELECT id, email, password_hash FROM users WHERE email = ?",
            (data.email.lower().strip(),),
        )
        if not row or not verify_password(data.password, row["password_hash"]):
            raise fastapi.HTTPException(status_code=401, detail="Invalid credentials")

        token = secrets.token_urlsafe(32)
        await conn.execute(
            "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
            (token, row["id"], _now_iso()),
        )
        await conn.commit()
        return {"token": token, "user": {"id": row["id"], "email": row["email"]}}


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    user=fastapi.Depends(get_current_user),
):
    async with db() as conn:
        row = await fetchone(conn, "SELECT password_hash FROM users WHERE id = ?", (user["id"],))
        if not row or not verify_password(data.current_password, row["password_hash"]):
            raise fastapi.HTTPException(status_code=400, detail="Current password is incorrect")
        await conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(data.new_password), user["id"]),
        )
        await conn.commit()
    return {"success": True}


@router.get("/me")
async def me(user=fastapi.Depends(get_current_user)):
    return {"user": user}
