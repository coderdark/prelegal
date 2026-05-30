"""Test configuration: isolate DB and mock WeasyPrint (requires Docker/Pango)."""
import sys
from unittest.mock import MagicMock

import pytest

# Mock weasyprint before any app module imports it
_weasyprint_mock = MagicMock()
sys.modules.setdefault("weasyprint", _weasyprint_mock)
sys.modules.setdefault("weasyprint.HTML", _weasyprint_mock)


@pytest.fixture(autouse=True)
def temp_db(monkeypatch, tmp_path):
    db_path = str(tmp_path / "test.db")
    monkeypatch.setenv("DB_PATH", db_path)
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-for-pytest")
    import importlib
    import app.database as db_mod
    import app.auth_utils as auth_mod
    importlib.reload(db_mod)
    importlib.reload(auth_mod)
    db_mod.init_db()


@pytest.fixture
def client(temp_db):
    from app.main import app
    from app.database import init_db
    init_db()
    from fastapi.testclient import TestClient
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
