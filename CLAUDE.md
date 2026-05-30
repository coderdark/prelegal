# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation is a freeform AI chat that helps users draft any of 11 supported legal document types, served from a FastAPI backend inside Docker. The AI first determines what document the user needs, then gathers the relevant fields conversationally. The right-side preview updates live. Real authentication and document persistence are planned for upcoming sprints.

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
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
Consider statically building the frontend and serving it via FastAPI, if that will work.  
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
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

### Completed (PL-4)
- Docker multi-stage build: Node.js stage builds Next.js static export, Python stage runs FastAPI
- FastAPI backend (`backend/`) as a `uv` project; SQLite DB created fresh on each container start with a `users` table
- Next.js static export (`frontend/out/`) served by FastAPI at http://localhost:8000
- Stub auth routes (no real validation — fake login for now): signup, signin, signout, me
- Fake login screen at `/login`: localStorage-based session flag, unauthenticated users are redirected
- Mutual NDA form with live preview and PDF download (PDF generated server-side via WeasyPrint in FastAPI)
- Start/stop scripts for Mac, Linux, and Windows in `scripts/`

### Completed (PL-5)
- AI chat replaces the manual NDA form; the left panel is a freeform chat UI
- `GET /api/chat/greeting` returns the opening message; `POST /api/chat/message` accepts conversation history + user message, calls the LLM, and returns AI reply + extracted fields + `complete` boolean
- LLM: LiteLLM via OpenRouter, Cerebras inference provider, model `openrouter/openai/gpt-oss-120b`, `reasoning_effort="low"`, Pydantic structured outputs
- Stateless design: client maintains and sends the full conversation history on every request; no server-side session state
- Preview panel (right side) updates live as fields are extracted
- Download PDF button appears in the header only once all required fields are confirmed complete
- `OPENROUTER_API_KEY` injected into the Docker container via `env_file: .env` in docker-compose.yml

### Completed (PL-6)
- `backend/app/document_catalog.py`: registry of all 11 supported document types — each entry has a `key`, `name`, `template_file` (under `templates/`), `required_fields` list, and `field_hints` string used in the AI system prompt
- Chat system prompt updated: AI first asks what document the user needs, sets `document_type` once identified, then gathers the right fields for that type. If the user requests an unsupported document type, the AI explains and suggests the closest supported alternative
- `ChatResponse` now returns `document_type: Optional[str]` (one of the catalog keys) and a generic `fields: dict[str, str]` instead of the previous NDA-specific model. Completeness is checked server-side by `document_catalog.is_complete(doc_key, fields)`
- `POST /api/generate-pdf` now accepts `{document_type, fields}`. Mutual NDA gets its structured cover page; all other types get a generic key-value cover page + the standard terms from the appropriate template file, all rendered via WeasyPrint
- Frontend: header title dynamically shows the detected document type name; Mutual NDA keeps its rich preview; all other types display a formatted key-value table; download filename is derived from the document type name

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
- `POST /api/auth/signup` — Stub: accepts any credentials, returns email
- `POST /api/auth/signin` — Stub: accepts any credentials, returns email
- `POST /api/auth/signout` — Stub: returns 200
- `GET /api/auth/me` — Stub: returns null user
- `GET /api/chat/greeting` — Returns the AI's opening message
- `POST /api/chat/message` — Body: `{history, user_message}`; returns `{message, document_type, fields, complete}`
- `POST /api/generate-pdf` — Body: `{document_type, fields}`; returns a PDF binary
- `GET /api/health` — Health check

### Key Technical Notes
- WeasyPrint requires system Pango/font libraries installed in the Dockerfile. The backend **must run inside Docker** — it cannot start natively on Mac without those libraries.
- The Next.js API route for PDF generation was removed in PL-4; PDF is handled entirely by the FastAPI backend.
- Frontend uses `NEXT_PUBLIC_API_URL` env var for the API base URL (defaults to empty string = same origin, correct when served through FastAPI).
- `OPENROUTER_API_KEY` and `SESSION_SECRET` live in `.env` at the project root. `docker-compose.yml` passes them into the container via `env_file: .env`.
- `.claude/settings.json` contains project-level Claude Code permission allowances (shared with the team via git).