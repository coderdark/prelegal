import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth_utils import get_current_user
from app.database import get_connection
from app.document_catalog import CATALOG

router = APIRouter(prefix="/api/documents", tags=["documents"])

_TITLE_FIELD_PRIORITY = [
    "purpose", "productName", "providerName", "party1Company",
    "controllerName", "licensorName", "partner1Name", "vendorName",
]


def _derive_title(document_type: Optional[str], fields: dict) -> str:
    for key in _TITLE_FIELD_PRIORITY:
        val = fields.get(key)
        if val:
            return val
    if document_type and document_type in CATALOG:
        return CATALOG[document_type].name
    return "Untitled Document"


class CreateDocumentRequest(BaseModel):
    title: Optional[str] = None
    document_type: Optional[str] = None
    fields: Optional[dict] = None
    history: Optional[list] = None
    complete: Optional[bool] = None


class UpdateDocumentRequest(BaseModel):
    title: Optional[str] = None
    document_type: Optional[str] = None
    fields: Optional[dict] = None
    history: Optional[list] = None
    complete: Optional[bool] = None


@router.get("")
async def list_documents(user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, title, document_type, updated_at FROM documents "
            "WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50",
            (user["id"],),
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_document(req: CreateDocumentRequest, user: dict = Depends(get_current_user)):
    fields = json.dumps(req.fields or {})
    history = json.dumps(req.history or [])
    complete = int(req.complete or False)
    init_fields = req.fields or {}
    title = req.title or _derive_title(req.document_type, init_fields)
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO documents (user_id, title, document_type, fields, history, complete) VALUES (?, ?, ?, ?, ?, ?)",
            (user["id"], title, req.document_type, fields, history, complete),
        )
        conn.commit()
        doc_id = cur.lastrowid
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, user["id"])
        ).fetchone()
    return _row_to_detail(row)


@router.get("/{doc_id}")
async def get_document(doc_id: int, user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, user["id"])
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return _row_to_detail(row)


@router.patch("/{doc_id}")
async def update_document(doc_id: int, req: UpdateDocumentRequest, user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, user["id"])
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        current_fields = json.loads(row["fields"])
        new_fields = req.fields if req.fields is not None else current_fields
        new_type = req.document_type if req.document_type is not None else row["document_type"]
        new_history = json.dumps(req.history) if req.history is not None else row["history"]
        new_complete = int(req.complete) if req.complete is not None else row["complete"]

        # Auto-derive title if still default and we now have enough info
        current_title = row["title"]
        if current_title == "Untitled Document" and (req.fields or req.document_type):
            current_title = _derive_title(new_type, new_fields)
        new_title = req.title if req.title is not None else current_title

        conn.execute(
            """UPDATE documents SET
                title = ?, document_type = ?, fields = ?, history = ?,
                complete = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ? AND user_id = ?""",
            (new_title, new_type, json.dumps(new_fields), new_history, new_complete, doc_id, user["id"]),
        )
        conn.commit()
        updated = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, user["id"])
        ).fetchone()
    return _row_to_detail(updated)


@router.delete("/{doc_id}")
async def delete_document(doc_id: int, user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        result = conn.execute(
            "DELETE FROM documents WHERE id = ? AND user_id = ?", (doc_id, user["id"])
        )
        conn.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"ok": True}


def _row_to_detail(row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "document_type": row["document_type"],
        "fields": json.loads(row["fields"]),
        "history": json.loads(row["history"]),
        "complete": bool(row["complete"]),
        "updated_at": row["updated_at"] + "Z" if row["updated_at"] else None,
    }
