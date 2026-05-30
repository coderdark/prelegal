"""Tests for per-user document CRUD and privacy."""
import json


def _signup_and_login(client, email, password="password123"):
    client.post("/api/auth/signup", json={"email": email, "password": password})
    return client


def test_list_documents_empty(client):
    _signup_and_login(client, "user1@example.com")
    res = client.get("/api/documents")
    assert res.status_code == 200
    assert res.json() == []


def test_list_documents_requires_auth(client):
    res = client.get("/api/documents")
    assert res.status_code == 401


def test_create_document(client):
    _signup_and_login(client, "user2@example.com")
    res = client.post("/api/documents", json={"document_type": "mutual_nda"})
    assert res.status_code == 201
    data = res.json()
    assert data["document_type"] == "mutual_nda"
    assert data["id"] is not None


def test_update_document(client):
    _signup_and_login(client, "user3@example.com")
    created = client.post("/api/documents", json={}).json()
    doc_id = created["id"]

    res = client.patch(f"/api/documents/{doc_id}", json={
        "document_type": "pilot",
        "fields": {"party1Name": "Acme Corp"},
        "history": [{"role": "user", "content": "hello"}],
        "complete": False,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["document_type"] == "pilot"
    assert data["fields"]["party1Name"] == "Acme Corp"


def test_get_document(client):
    _signup_and_login(client, "user4@example.com")
    created = client.post("/api/documents", json={"document_type": "csa"}).json()
    doc_id = created["id"]

    res = client.get(f"/api/documents/{doc_id}")
    assert res.status_code == 200
    assert res.json()["document_type"] == "csa"


def test_delete_document(client):
    _signup_and_login(client, "user5@example.com")
    created = client.post("/api/documents", json={}).json()
    doc_id = created["id"]

    res = client.delete(f"/api/documents/{doc_id}")
    assert res.status_code == 200
    assert res.json()["ok"] is True

    res = client.get(f"/api/documents/{doc_id}")
    assert res.status_code == 404


def test_documents_are_user_private(client):
    """User A cannot access User B's documents."""
    # Sign up user A, create a document
    client.post("/api/auth/signup", json={"email": "userA@example.com", "password": "passwordA1"})
    doc = client.post("/api/documents", json={"document_type": "sla"}).json()
    doc_id = doc["id"]

    # Sign out user A, sign in as user B
    client.post("/api/auth/signout")
    client.post("/api/auth/signup", json={"email": "userB@example.com", "password": "passwordB1"})

    # User B should not see user A's document in list
    docs = client.get("/api/documents").json()
    assert all(d["id"] != doc_id for d in docs)

    # User B should get 404 when accessing user A's document directly
    res = client.get(f"/api/documents/{doc_id}")
    assert res.status_code == 404


def test_documents_appear_in_list_after_create(client):
    _signup_and_login(client, "user6@example.com")
    client.post("/api/documents", json={"document_type": "dpa"})
    client.post("/api/documents", json={"document_type": "baa"})

    docs = client.get("/api/documents").json()
    assert len(docs) == 2
    types = {d["document_type"] for d in docs}
    assert "dpa" in types
    assert "baa" in types
