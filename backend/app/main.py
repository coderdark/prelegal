import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()  # searches cwd upward; docker-compose passes vars via env_file

from app.database import init_db
from app.routes import auth, chat, documents, pdf

app = FastAPI(title="Prelegal API")

# allow_origins=["*"] with allow_credentials=True is incompatible in browsers.
# In Docker the frontend is same-origin so CORS never fires; this only matters
# when running `npm run dev` against localhost:8000.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(pdf.router)
app.include_router(documents.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
async def startup():
    init_db()


STATIC_DIR = Path(os.environ.get("STATIC_DIR", "/app/static"))
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
