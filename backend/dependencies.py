import fastapi
from database import db, fetchone


async def get_current_user(authorization: str = fastapi.Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise fastapi.HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1].strip()
    async with db() as conn:
        row = await fetchone(
            conn,
            """
            SELECT u.id, u.email, u.created_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        )
        if not row:
            raise fastapi.HTTPException(status_code=401, detail="Invalid token")
        return {"id": row["id"], "email": row["email"], "created_at": row["created_at"]}
