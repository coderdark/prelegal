"""Tests for real authentication: signup, signin, me, signout."""


def test_signup_success(client):
    res = client.post("/api/auth/signup", json={"email": "alice@example.com", "password": "secret123"})
    assert res.status_code == 200
    assert res.json()["email"] == "alice@example.com"
    # Cookie must be set
    assert "prelegal_token" in res.cookies


def test_signup_duplicate_email(client):
    client.post("/api/auth/signup", json={"email": "bob@example.com", "password": "password1"})
    res = client.post("/api/auth/signup", json={"email": "bob@example.com", "password": "password1"})
    assert res.status_code == 409


def test_signup_short_password(client):
    res = client.post("/api/auth/signup", json={"email": "carol@example.com", "password": "short"})
    assert res.status_code == 422


def test_signin_success(client):
    client.post("/api/auth/signup", json={"email": "dave@example.com", "password": "correct-pass"})
    res = client.post("/api/auth/signin", json={"email": "dave@example.com", "password": "correct-pass"})
    assert res.status_code == 200
    assert "prelegal_token" in res.cookies


def test_signin_wrong_password(client):
    client.post("/api/auth/signup", json={"email": "eve@example.com", "password": "rightpass1"})
    res = client.post("/api/auth/signin", json={"email": "eve@example.com", "password": "wrongpass1"})
    assert res.status_code == 401


def test_signin_unknown_email(client):
    res = client.post("/api/auth/signin", json={"email": "nobody@example.com", "password": "whatever1"})
    assert res.status_code == 401


def test_me_authenticated(client):
    client.post("/api/auth/signup", json={"email": "frank@example.com", "password": "mypassword"})
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == "frank@example.com"


def test_me_unauthenticated(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] is None


def test_signout_clears_cookie(client):
    client.post("/api/auth/signup", json={"email": "grace@example.com", "password": "password99"})
    client.post("/api/auth/signout")
    res = client.get("/api/auth/me")
    assert res.json()["email"] is None
