# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation provides a Mutual NDA form with live preview and PDF download, served from a FastAPI backend inside Docker. AI chat, full document type support, and real authentication are planned for upcoming sprints.

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

### Current API Endpoints
- `POST /api/auth/signup` - Stub: accepts any credentials, returns email
- `POST /api/auth/signin` - Stub: accepts any credentials, returns email
- `POST /api/auth/signout` - Stub: returns 200
- `GET /api/auth/me` - Stub: returns null user
- `POST /api/generate-pdf` - Generate Mutual NDA PDF via WeasyPrint
- `GET /api/health` - Health check

### Key Technical Notes
- WeasyPrint requires system Pango/font libraries; these are installed in the Dockerfile. The backend **must run inside Docker** — it cannot start natively on Mac without those libraries.
- The Next.js API route for PDF generation has been removed; PDF is now handled entirely by the FastAPI backend.
- Frontend uses `NEXT_PUBLIC_API_URL` env var to configure the API base URL (defaults to same-origin, i.e. empty string, which works correctly when served through FastAPI).