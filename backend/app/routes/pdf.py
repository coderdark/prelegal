import os
from pathlib import Path

import markdown
from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel
from weasyprint import HTML

router = APIRouter(prefix="/api", tags=["pdf"])

TEMPLATES_DIR = Path(os.environ.get("TEMPLATES_DIR", "/app/templates"))


class NdaFormData(BaseModel):
    purpose: str
    effectiveDate: str
    mndaTermYears: str = "1"
    mndaTermType: str = "fixed"
    confidentialityTermYears: str = "1"
    confidentialityTermType: str = "fixed"
    governingLaw: str = ""
    jurisdiction: str = ""
    modifications: str = ""
    party1Name: str = ""
    party1Title: str = ""
    party1Company: str = ""
    party1NoticeAddress: str = ""
    party2Name: str = ""
    party2Title: str = ""
    party2Company: str = ""
    party2NoticeAddress: str = ""


def _build_nda_markdown(data: NdaFormData) -> str:
    standard_terms = (TEMPLATES_DIR / "Mutual-NDA.md").read_text()

    mnda_term = (
        f"Expires {data.mndaTermYears} year(s) from Effective Date."
        if data.mndaTermType == "fixed"
        else "Continues until terminated in accordance with the terms of the MNDA."
    )

    confidentiality_term = (
        f"{data.confidentialityTermYears} year(s) from Effective Date, but in the case of trade secrets "
        "until Confidential Information is no longer considered a trade secret under applicable laws."
        if data.confidentialityTermType == "fixed"
        else "In perpetuity."
    )

    return f"""# Mutual Non-Disclosure Agreement

## USING THIS MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the "MNDA") consists of: (1) this Cover Page ("**Cover Page**") and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 ("**Standard Terms**") identical to those posted at [commonpaper.com/standards/mutual-nda/1.0](https://commonpaper.com/standards/mutual-nda/1.0). Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.

### Purpose

{data.purpose}

### Effective Date

{data.effectiveDate}

### MNDA Term

{mnda_term}

### Term of Confidentiality

{confidentiality_term}

### Governing Law & Jurisdiction

Governing Law: {data.governingLaw}

Jurisdiction: {data.jurisdiction}

### MNDA Modifications

{data.modifications or 'None.'}

By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.

| | PARTY 1 | PARTY 2 |
|:---|:---:|:---:|
| **Signature** | | |
| **Print Name** | {data.party1Name} | {data.party2Name} |
| **Title** | {data.party1Title} | {data.party2Title} |
| **Company** | {data.party1Company} | {data.party2Company} |
| **Notice Address** | {data.party1NoticeAddress} | {data.party2NoticeAddress} |
| **Date** | | |

Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

---

# Standard Terms

{standard_terms}"""


def _build_nda_html(md_text: str) -> str:
    body = markdown.markdown(md_text, extensions=["tables"])
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page {{
    size: A4;
    margin: 25mm 20mm 25mm 20mm;
  }}
  body {{
    font-family: Georgia, serif;
    font-size: 11pt;
    line-height: 1.75;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
  }}
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
<body>
{body}
</body>
</html>"""


@router.post("/generate-pdf")
async def generate_pdf(data: NdaFormData):
    md_text = _build_nda_markdown(data)
    html = _build_nda_html(md_text)
    pdf_bytes = HTML(string=html).write_pdf()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="Mutual-NDA.pdf"'},
    )
