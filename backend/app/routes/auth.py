from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from app.auth_utils import (
    EXPIRE_DAYS,
    create_token,
    hash_password,
    optional_user,
    verify_password,
)
from app.database import get_connection

router = APIRouter(prefix="/api/auth", tags=["auth"])

_COOKIE_OPTS = dict(
    key="prelegal_token",
    httponly=True,
    samesite="lax",
    max_age=60 * 60 * 24 * EXPIRE_DAYS,
    path="/",
    secure=False,  # set to True when HTTPS is deployed
)


class Credentials(BaseModel):
    email: str
    password: str


def _set_auth_cookie(response: Response, user_id: int, email: str) -> None:
    token = create_token(user_id, email)
    response.set_cookie(value=token, **_COOKIE_OPTS)


@router.post("/signup")
async def signup(creds: Credentials, response: Response):
    if len(creds.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    with get_connection() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (creds.email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")
        cur = conn.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (creds.email, hash_password(creds.password)),
        )
        conn.commit()
        user_id = cur.lastrowid
    _set_auth_cookie(response, user_id, creds.email)
    return {"email": creds.email}


@router.post("/signin")
async def signin(creds: Credentials, response: Response):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, password_hash FROM users WHERE email = ?", (creds.email,)
        ).fetchone()
    if not row or not verify_password(creds.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    _set_auth_cookie(response, row["id"], creds.email)
    return {"email": creds.email}


@router.post("/signout")
async def signout(response: Response):
    # Mirror all attributes from _COOKIE_OPTS so the browser actually clears the cookie
    response.delete_cookie(
        key="prelegal_token",
        path=_COOKIE_OPTS["path"],
        samesite=_COOKIE_OPTS["samesite"],
        secure=_COOKIE_OPTS["secure"],
        httponly=_COOKIE_OPTS["httponly"],
    )
    return {"message": "Signed out"}


@router.get("/me")
async def me(user: dict | None = Depends(optional_user)):
    return {"email": user["email"] if user else None}
