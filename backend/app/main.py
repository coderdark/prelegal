import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routes import auth, pdf

app = FastAPI(title="Prelegal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(pdf.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
async def startup():
    init_db()


STATIC_DIR = Path(os.environ.get("STATIC_DIR", "/app/static"))
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
