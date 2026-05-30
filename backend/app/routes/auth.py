from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])


class Credentials(BaseModel):
    email: str
    password: str = ""


@router.post("/signup")
async def signup(creds: Credentials):
    return {"email": creds.email, "message": "Account created"}


@router.post("/signin")
async def signin(creds: Credentials):
    return {"email": creds.email, "message": "Signed in"}


@router.post("/signout")
async def signout():
    return {"message": "Signed out"}


@router.get("/me")
async def me():
    return {"email": None}
