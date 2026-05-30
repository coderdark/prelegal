import os
import sqlite3
from contextlib import contextmanager
from typing import Generator

DB_PATH = os.environ.get("DB_PATH", "/tmp/prelegal.db")


@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                email         TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL DEFAULT '',
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title         TEXT NOT NULL DEFAULT 'Untitled Document',
                document_type TEXT,
                fields        TEXT NOT NULL DEFAULT '{}',
                history       TEXT NOT NULL DEFAULT '[]',
                complete      INTEGER NOT NULL DEFAULT 0,
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)"
        )
        conn.commit()
