# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation is a freeform AI chat that helps users draft any of 11 supported legal document types, served from a FastAPI backend inside Docker. Users sign up and sign in with real credentials. The AI first determines what document the user needs, then gathers the relevant fields conversationally. Each document is auto-saved to the database after every AI message and is private to the owning user. The right-side preview updates live. A collapsible sidebar lists the user's saved documents and allows resuming any prior draft.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLite and is created fresh on each container start (no persistent volume — this is intentional).  
The Next.js frontend is statically built and served by FastAPI at http://localhost:8000.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit/primary action buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

### Completed (PL-4)
- Docker multi-stage build: Node.js stage builds Next.js static export, Python stage runs FastAPI
- FastAPI backend (`backend/`) as a `uv` project; SQLite DB created fresh on each container start
- Next.js static export (`frontend/out/`) served by FastAPI at http://localhost:8000
- Mutual NDA form with live preview and PDF download (PDF generated server-side via WeasyPrint in FastAPI)
- Start/stop scripts for Mac, Linux, and Windows in `scripts/`

### Completed (PL-5)
- AI chat replaces the manual NDA form; the left panel is a freeform chat UI
- `GET /api/chat/greeting` returns the opening message; `POST /api/chat/message` accepts conversation history + user message, calls the LLM, and returns AI reply + extracted fields + `complete` boolean
- LLM: LiteLLM via OpenRouter, Cerebras inference provider, model `openrouter/openai/gpt-oss-120b`, `reasoning_effort="low"`, Pydantic structured outputs
- Stateless chat design: client maintains and sends the full conversation history on every request
- Preview panel (right side) updates live as fields are extracted
- Download PDF button appears in the header only once all required fields are confirmed complete
- `OPENROUTER_API_KEY` injected into the Docker container via `env_file: .env` in docker-compose.yml

### Completed (PL-6)
- `backend/app/document_catalog.py`: registry of all 11 supported document types — each entry has a `key`, `name`, `template_file` (under `templates/`), `required_fields` list, and `field_hints` string used in the AI system prompt
- Chat system prompt updated: AI first asks what document the user needs, sets `document_type` once identified, then gathers the right fields for that type. If the user requests an unsupported document type, the AI explains and suggests the closest supported alternative
- `ChatResponse` returns `document_type: Optional[str]` (one of the catalog keys) and a generic `fields: dict[str, str]`. Completeness is checked server-side by `document_catalog.is_complete(doc_key, fields)`
- `POST /api/generate-pdf` accepts `{document_type, fields}`. Mutual NDA gets its structured cover page; all other types get a generic key-value cover page + standard terms from the appropriate template file, rendered via WeasyPrint
- Frontend: header title dynamically shows the detected document type name; Mutual NDA keeps its rich preview; all other types display a formatted key-value table

### Completed (PL-7)
- **Real authentication**: bcrypt password hashing (direct `bcrypt` library — `passlib` is NOT used; it is incompatible with bcrypt 5.x). JWT tokens signed with `SESSION_SECRET` from `.env` using `PyJWT` and the HS256 algorithm. Tokens are stored in an `httpOnly`, `SameSite=Lax` cookie named `prelegal_token` with a 7-day expiry. All auth logic lives in `backend/app/auth_utils.py`.
- **Sign-up / Sign-in UI**: tab toggle on the login page (`/login`). Sign Up validates password length (≥8 chars) and returns `409` on duplicate email. Sign In returns `401` on wrong credentials. Inline error display — no `alert()`. Sign-out button in the header clears the cookie and redirects to `/login`.
- **Per-user private document storage**: `documents` table in SQLite. Every document row has `user_id` (FK to `users.id`), `title`, `document_type`, `fields` (JSON string), `history` (JSON string of full chat history), `complete` (integer 0/1), `created_at`, `updated_at`. All CRUD endpoints enforce `WHERE id = ? AND user_id = ?` — users cannot access each other's documents.
- **Auto-save**: after every AI chat response that contains fields, the frontend calls `POST /api/documents` (first message) or `PATCH /api/documents/{id}` (subsequent messages) to persist the current state. A single API call is used for the initial create (fields/history/complete are accepted by `POST /api/documents`).
- **Document history sidebar**: collapsible left rail on desktop (always visible, toggled by hamburger icon in header). Slide-over overlay on mobile. Lists the authenticated user's documents ordered by `updated_at DESC`. Click any entry to restore the full chat history, fields, document type, and completion state. Delete icon (trash) appears on hover. "New" button resets state and fetches a fresh greeting.
- **Document title auto-derivation**: on save, the server derives a human-readable title from field values (priority order: `purpose`, `productName`, `providerName`, `party1Company`, `controllerName`, `licensorName`, `partner1Name`, `vendorName`). Falls back to the document type name, then "Untitled Document".
- **Frontend API client**: `frontend/src/lib/api.ts` — typed wrapper functions for all API calls. All requests use `credentials: 'include'` so the auth cookie is sent automatically. Exports `ApiError` class with `status` field for error handling.
- **Auth hook**: `frontend/src/hooks/useAuth.ts` — calls `GET /api/auth/me` on mount, returns `{ email, loading, signOut }`. Used on the main page to guard access and display the sign-out button.
- **Backend unit tests**: `backend/tests/` with pytest. 17 tests covering signup, signin, me, signout, and full document CRUD including per-user privacy enforcement. WeasyPrint is mocked in `conftest.py` (requires Docker/Pango to run natively).

### Supported Document Types (catalog keys)
| Key | Name | Template |
|-----|------|----------|
| `mutual_nda` | Mutual Non-Disclosure Agreement | `Mutual-NDA.md` |
| `csa` | Cloud Service Agreement | `CSA.md` |
| `design_partner` | Design Partner Agreement | `design-partner-agreement.md` |
| `sla` | Service Level Agreement | `sla.md` |
| `psa` | Professional Services Agreement | `psa.md` |
| `dpa` | Data Processing Agreement | `DPA.md` |
| `software_license` | Software License Agreement | `Software-License-Agreement.md` |
| `partnership` | Partnership Agreement | `Partnership-Agreement.md` |
| `pilot` | Pilot Agreement | `Pilot-Agreement.md` |
| `baa` | Business Associate Agreement | `BAA.md` |
| `ai_addendum` | AI Addendum | `AI-Addendum.md` |

### Current API Endpoints
- `POST /api/auth/signup` — Body: `{email, password}`; creates user with bcrypt hash, sets `prelegal_token` cookie, returns `{email}`
- `POST /api/auth/signin` — Body: `{email, password}`; verifies bcrypt hash, sets `prelegal_token` cookie, returns `{email}`
- `POST /api/auth/signout` — Clears `prelegal_token` cookie, returns `{message}`
- `GET /api/auth/me` — Returns `{email}` for authenticated user, or `{email: null}` if unauthenticated (always 200)
- `GET /api/documents` — **Auth required**; returns list of `{id, title, document_type, updated_at}` for the current user, ordered by `updated_at DESC`, limit 50
- `POST /api/documents` — **Auth required**; body: `{title?, document_type?, fields?, history?, complete?}`; creates a new document row; returns full `DocumentDetail`
- `GET /api/documents/{id}` — **Auth required**; returns `{id, title, document_type, fields, history, complete, updated_at}` for a document owned by the current user
- `PATCH /api/documents/{id}` — **Auth required**; body: `{title?, document_type?, fields?, history?, complete?}`; updates fields and auto-derives title; returns updated `DocumentDetail`
- `DELETE /api/documents/{id}` — **Auth required**; deletes the document if owned by the current user; returns `{ok: true}`
- `GET /api/chat/greeting` — Returns the AI's opening message
- `POST /api/chat/message` — Body: `{history, user_message}`; returns `{message, document_type, fields, complete}`
- `POST /api/generate-pdf` — Body: `{document_type, fields}`; returns a PDF binary
- `GET /api/health` — Health check

### Database Schema
```sql
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         TEXT NOT NULL DEFAULT 'Untitled Document',
    document_type TEXT,
    fields        TEXT NOT NULL DEFAULT '{}',   -- JSON string
    history       TEXT NOT NULL DEFAULT '[]',   -- JSON string of chat turns
    complete      INTEGER NOT NULL DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
```

### Key Technical Notes
- WeasyPrint requires system Pango/font libraries installed in the Dockerfile. The backend **must run inside Docker** — it cannot start natively on Mac without those libraries. Backend unit tests mock WeasyPrint via `sys.modules` in `conftest.py` so they can run locally.
- The Next.js API route for PDF generation was removed in PL-4; PDF is handled entirely by the FastAPI backend.
- Frontend uses `NEXT_PUBLIC_API_URL` env var for the API base URL (defaults to empty string = same origin, correct when served through FastAPI).
- `OPENROUTER_API_KEY` and `SESSION_SECRET` live in `.env` at the project root. `docker-compose.yml` passes them into the container via `env_file: .env`. `SESSION_SECRET` is used to sign JWTs — it must be set in `.env` before running.
- Auth uses `httpOnly` cookies (`prelegal_token`), not `Authorization` headers or `localStorage`. All `fetch` calls in `frontend/src/lib/api.ts` use `credentials: 'include'`.
- `passlib` is NOT a dependency. Password hashing uses the `bcrypt` library directly (`bcrypt.hashpw` / `bcrypt.checkpw`). `passlib 1.7.4` is incompatible with `bcrypt 5.x` and must not be added.
- `get_connection()` in `database.py` is a `@contextmanager` that yields a `sqlite3.Connection` and closes it in `finally`. Use it as `with get_connection() as conn:` — the connection is always closed after the block.
- SQLite `updated_at` timestamps are returned with a `Z` suffix appended by the API so that `new Date(ts)` in the browser parses them as UTC.
- `CORS` in `main.py` uses `allow_origins=["http://localhost:3000", "http://localhost:8000"]` with `allow_credentials=True`. Do NOT use `allow_origins=["*"]` with `allow_credentials=True` — browsers reject that combination.
- `.claude/settings.json` contains project-level Claude Code permission allowances (shared with the team via git).

### Frontend File Structure (relevant files)
```
frontend/src/
├── app/
│   ├── globals.css          # CSS custom properties (design tokens) + markdown preview styles
│   ├── layout.tsx           # Root layout; metadata title
│   ├── login/page.tsx       # Sign-in / Sign-up tab toggle; calls /api/auth/signin|signup
│   └── page.tsx             # Main app: chat panel, preview panel, document sidebar
├── hooks/
│   └── useAuth.ts           # Auth state hook: getMe on mount, signOut helper
└── lib/
    ├── api.ts               # Typed API client; all fetch calls with credentials: include
    └── nda-template.ts      # Legacy NDA markdown builder (used only by frontend tests)
```

### Backend File Structure (relevant files)
```
backend/
├── app/
│   ├── auth_utils.py        # hash_password, verify_password, create_token, get_current_user, optional_user
│   ├── database.py          # get_connection() contextmanager, init_db()
│   ├── document_catalog.py  # CATALOG registry, is_complete()
│   ├── main.py              # FastAPI app, CORS, router registration, startup hook
│   └── routes/
│       ├── auth.py          # /api/auth/signup|signin|signout|me
│       ├── chat.py          # /api/chat/greeting|message
│       ├── documents.py     # /api/documents CRUD
│       └── pdf.py           # /api/generate-pdf
├── tests/
│   ├── conftest.py          # temp DB fixture, weasyprint mock, TestClient fixture
│   ├── test_auth.py         # 9 auth tests
│   └── test_documents.py    # 8 document CRUD + privacy tests
└── pyproject.toml           # Dependencies: fastapi, uvicorn, litellm, bcrypt, pyjwt,
                             #   python-dotenv, markdown, weasyprint, python-multipart
```
