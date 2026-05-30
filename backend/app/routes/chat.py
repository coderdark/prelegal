import os
from typing import Optional

from fastapi import APIRouter
from litellm import completion
from pydantic import BaseModel

from app.document_catalog import CATALOG, is_complete

router = APIRouter(prefix="/api/chat", tags=["chat"])

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

_SUPPORTED_DOCS = "\n".join(
    f"- {doc.key}: {doc.name}" for doc in CATALOG.values()
)

_FIELD_HINTS = "\n".join(
    f"- {doc.key} ({doc.name}): {doc.field_hints}" for doc in CATALOG.values()
)

SYSTEM_PROMPT = f"""You are a friendly legal assistant helping users draft legal agreements using Common Paper standard templates.

Supported document types:
{_SUPPORTED_DOCS}

Your workflow:
1. Start by asking what kind of document the user needs (if not already clear).
2. If the user asks for a document NOT in the supported list, explain you cannot generate it and suggest the closest supported type.
3. Once the document type is identified, set document_type to the correct key and begin gathering information.
4. Gather information conversationally — ask for a few related pieces at a time.
5. When all required fields are collected, set complete: true and confirm the user can download.

Fields to gather per document type:
{_FIELD_HINTS}

Rules for fields dict:
- Use the exact camelCase field names listed above.
- Only include fields that have been confirmed by the user — do not guess.
- Carry forward all previously confirmed fields on every response.
- For mutual_nda: mndaTermType must be exactly "fixed" or "until_terminated"; confidentialityTermType must be exactly "fixed" or "perpetuity".

Keep replies warm and concise: 2–3 sentences plus a question. Today's date (ISO format) is available for effective date references."""

GREETING = "Hi! I'm here to help you draft a legal agreement. What kind of document do you need — for example, an NDA, a Cloud Service Agreement, a Pilot Agreement, or something else?"


class ChatResponse(BaseModel):
    message: str
    document_type: Optional[str] = None
    fields: dict[str, str] = {}
    complete: bool = False


class MessageRequest(BaseModel):
    history: list[dict]
    user_message: str


@router.get("/greeting")
async def greeting():
    return {"message": GREETING}


@router.post("/message")
async def message(req: MessageRequest):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in req.history:
        messages.append(turn)
    messages.append({"role": "user", "content": req.user_message})

    response = completion(
        model=MODEL,
        messages=messages,
        response_format=ChatResponse,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
        api_key=os.environ.get("OPENROUTER_API_KEY"),
        api_base="https://openrouter.ai/api/v1",
    )

    result = ChatResponse.model_validate_json(response.choices[0].message.content)
    if result.document_type:
        result.complete = is_complete(result.document_type, result.fields)
    return result
