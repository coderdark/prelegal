import os
import re
from pathlib import Path

import markdown
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from weasyprint import HTML

from app.document_catalog import CATALOG

router = APIRouter(prefix="/api", tags=["pdf"])

TEMPLATES_DIR = Path(os.environ.get("TEMPLATES_DIR", "/app/templates"))


class PdfRequest(BaseModel):
    document_type: str
    fields: dict[str, str]


def _field_label(key: str) -> str:
    """Convert camelCase field key to a readable label."""
    spaced = re.sub(r"([A-Z])", r" \1", key).strip()
    return spaced[0].upper() + spaced[1:]


def _build_nda_cover(fields: dict[str, str]) -> str:
    mnda_term = (
        f"Expires {fields.get('mndaTermYears', '?')} year(s) from Effective Date."
        if fields.get("mndaTermType") == "fixed"
        else "Continues until terminated in accordance with the terms of the MNDA."
    )
    confidentiality_term = (
        f"{fields.get('confidentialityTermYears', '?')} year(s) from Effective Date, "
        "but in the case of trade secrets until Confidential Information is no longer "
        "considered a trade secret under applicable laws."
        if fields.get("confidentialityTermType") == "fixed"
        else "In perpetuity."
    )
    return f"""# Mutual Non-Disclosure Agreement

## USING THIS MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the "MNDA") consists of: (1) this Cover Page and (2) the Common Paper Mutual NDA Standard Terms Version 1.0.

### Purpose
{fields.get("purpose", "")}

### Effective Date
{fields.get("effectiveDate", "")}

### MNDA Term
{mnda_term}

### Term of Confidentiality
{confidentiality_term}

### Governing Law & Jurisdiction

Governing Law: {fields.get("governingLaw", "")}

Jurisdiction: {fields.get("jurisdiction", "")}

### MNDA Modifications
{fields.get("modifications", "None.")}

By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.

| | PARTY 1 | PARTY 2 |
|:---|:---:|:---:|
| **Signature** | | |
| **Print Name** | {fields.get("party1Name", "")} | {fields.get("party2Name", "")} |
| **Title** | {fields.get("party1Title", "")} | {fields.get("party2Title", "")} |
| **Company** | {fields.get("party1Company", "")} | {fields.get("party2Company", "")} |
| **Notice Address** | {fields.get("party1NoticeAddress", "")} | {fields.get("party2NoticeAddress", "")} |
| **Date** | | |

Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
"""


def _build_generic_cover(doc_type_name: str, fields: dict[str, str]) -> str:
    rows = "\n".join(
        f"| {_field_label(k)} | {v} |"
        for k, v in fields.items()
        if v
    )
    return f"""# {doc_type_name}

## Agreement Details

| Field | Value |
|:------|:------|
{rows}

*The parties agree to be bound by the Standard Terms incorporated below.*

| | PARTY 1 | PARTY 2 |
|:---|:---|:---|
| **Signature** | | |
| **Date** | | |

"""


def _build_html(md_text: str) -> str:
    body = markdown.markdown(md_text, extensions=["tables"])
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page {{ size: A4; margin: 25mm 20mm 25mm 20mm; }}
  body {{ font-family: Georgia, serif; font-size: 11pt; line-height: 1.75; color: #1a1a1a; margin: 0; padding: 0; }}
  h1 {{ font-size: 17pt; margin: 0 0 14px; padding-bottom: 6px; border-bottom: 2px solid #1a1a1a; }}
  h2 {{ font-size: 13pt; margin: 28px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }}
  h3 {{ font-size: 11pt; font-weight: bold; margin: 20px 0 4px; }}
  p {{ margin: 6px 0 10px; }}
  table {{ width: 100%; border-collapse: collapse; margin: 16px 0 24px; font-size: 10pt; page-break-inside: avoid; }}
  td, th {{ border: 1px solid #888; padding: 8px 14px; vertical-align: top; }}
  th {{ background: #f3f4f6; font-weight: 600; }}
  hr {{ border: none; border-top: 2px solid #333; margin: 36px 0; }}
  a {{ color: #1d4ed8; }}
  ol {{ padding-left: 22px; margin: 8px 0; }}
  li {{ margin: 5px 0; }}
</style>
</head>
<body>{body}</body>
</html>"""


@router.post("/generate-pdf")
async def generate_pdf(req: PdfRequest):
    doc = CATALOG.get(req.document_type)
    if not doc:
        raise HTTPException(status_code=400, detail=f"Unknown document type: {req.document_type}")

    template_path = TEMPLATES_DIR / doc.template_file
    if not template_path.exists():
        raise HTTPException(status_code=500, detail=f"Template not found: {doc.template_file}")

    standard_terms = template_path.read_text()

    if req.document_type == "mutual_nda":
        cover = _build_nda_cover(req.fields)
    else:
        cover = _build_generic_cover(doc.name, req.fields)

    full_md = f"{cover}\n---\n\n# Standard Terms\n\n{standard_terms}"
    pdf_bytes = HTML(string=_build_html(full_md)).write_pdf()

    filename = doc.name.replace(" ", "-") + ".pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
