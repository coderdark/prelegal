import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Cookie, HTTPException

SECRET_KEY = os.environ.get("SESSION_SECRET", "dev-secret-change-in-prod")
ALGORITHM = "HS256"
EXPIRE_DAYS = 7


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "email": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"id": int(payload["sub"]), "email": payload["email"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(prelegal_token: str | None = Cookie(default=None)) -> dict:
    if not prelegal_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _decode_token(prelegal_token)


def optional_user(prelegal_token: str | None = Cookie(default=None)) -> dict | None:
    if not prelegal_token:
        return None
    try:
        return _decode_token(prelegal_token)
    except HTTPException:
        return None
