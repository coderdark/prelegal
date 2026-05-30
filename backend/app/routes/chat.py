import os
from typing import Optional

from fastapi import APIRouter
from litellm import completion
from pydantic import BaseModel

router = APIRouter(prefix="/api/chat", tags=["chat"])

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

SYSTEM_PROMPT = """You are a friendly legal assistant helping users draft a Mutual Non-Disclosure Agreement (Mutual NDA).

Your job is to gather the following information through natural conversation:
- Purpose of the NDA (why the parties are sharing confidential information)
- Effective date
- MNDA term (either a fixed number of years, or "until terminated")
- Term of confidentiality (either a fixed number of years, or "in perpetuity")
- Governing law (which US state's laws apply)
- Jurisdiction (which courts have jurisdiction)
- Any modifications to the standard terms (optional)
- Party 1: name, title, company, notice address (email or postal)
- Party 2: name, title, company, notice address (email or postal)

Guidelines:
- Be warm and conversational. Ask for a few related pieces of info at a time, not one by one.
- When you have gathered a piece of information, include it in the extracted fields — even partial info is fine.
- If the user provides info unprompted, extract it and move on.
- When all required fields are filled, confirm with the user and let them know they can download the PDF.
- Required fields: purpose, effectiveDate, mndaTermType, confidentialityTermType, governingLaw, jurisdiction, party1Name, party1Title, party1Company, party1NoticeAddress, party2Name, party2Title, party2Company, party2NoticeAddress.
- mndaTermYears is only required when mndaTermType is "fixed". Same for confidentialityTermYears.
- Today's date for reference: use ISO format (YYYY-MM-DD) for effectiveDate.
- For mndaTermType use exactly: "fixed" or "until_terminated".
- For confidentialityTermType use exactly: "fixed" or "perpetuity".
- Keep your replies concise — 1-3 sentences plus a question."""

GREETING = "Hi! I'm here to help you draft a Mutual Non-Disclosure Agreement. Let's start — who are the two parties involved, and what's the general purpose of the NDA?"


class NdaFields(BaseModel):
    purpose: Optional[str] = None
    effectiveDate: Optional[str] = None
    mndaTermYears: Optional[str] = None
    mndaTermType: Optional[str] = None
    confidentialityTermYears: Optional[str] = None
    confidentialityTermType: Optional[str] = None
    governingLaw: Optional[str] = None
    jurisdiction: Optional[str] = None
    modifications: Optional[str] = None
    party1Name: Optional[str] = None
    party1Title: Optional[str] = None
    party1Company: Optional[str] = None
    party1NoticeAddress: Optional[str] = None
    party2Name: Optional[str] = None
    party2Title: Optional[str] = None
    party2Company: Optional[str] = None
    party2NoticeAddress: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    fields: NdaFields
    complete: bool


class MessageRequest(BaseModel):
    history: list[dict]
    user_message: str


def _is_complete(fields: NdaFields) -> bool:
    required = [
        fields.purpose, fields.effectiveDate, fields.mndaTermType,
        fields.confidentialityTermType, fields.governingLaw, fields.jurisdiction,
        fields.party1Name, fields.party1Title, fields.party1Company, fields.party1NoticeAddress,
        fields.party2Name, fields.party2Title, fields.party2Company, fields.party2NoticeAddress,
    ]
    if fields.mndaTermType == "fixed" and not fields.mndaTermYears:
        return False
    if fields.confidentialityTermType == "fixed" and not fields.confidentialityTermYears:
        return False
    return all(f for f in required)


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
    result.complete = _is_complete(result.fields)
    return result
