import { NdaFormData } from '@/types/nda';
import { readFileSync } from 'fs';
import path from 'path';
import { marked } from 'marked';

export function buildNdaMarkdown(data: NdaFormData): string {
  const templatesDir = path.join(process.cwd(), '..', 'templates');
  const standardTerms = readFileSync(path.join(templatesDir, 'Mutual-NDA.md'), 'utf-8');

  const mndaTerm =
    data.mndaTermType === 'fixed'
      ? `Expires ${data.mndaTermYears} year(s) from Effective Date.`
      : 'Continues until terminated in accordance with the terms of the MNDA.';

  const confidentialityTerm =
    data.confidentialityTermType === 'fixed'
      ? `${data.confidentialityTermYears} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
      : 'In perpetuity.';

  return `# Mutual Non-Disclosure Agreement

## USING THIS MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the "MNDA") consists of: (1) this Cover Page ("**Cover Page**") and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 ("**Standard Terms**") identical to those posted at [commonpaper.com/standards/mutual-nda/1.0](https://commonpaper.com/standards/mutual-nda/1.0). Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.

### Purpose

${data.purpose}

### Effective Date

${data.effectiveDate}

### MNDA Term

${mndaTerm}

### Term of Confidentiality

${confidentialityTerm}

### Governing Law & Jurisdiction

Governing Law: ${data.governingLaw}

Jurisdiction: ${data.jurisdiction}

### MNDA Modifications

${data.modifications || 'None.'}

By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.

| | PARTY 1 | PARTY 2 |
|:---|:---:|:---:|
| **Signature** | | |
| **Print Name** | ${data.party1Name} | ${data.party2Name} |
| **Title** | ${data.party1Title} | ${data.party2Title} |
| **Company** | ${data.party1Company} | ${data.party2Company} |
| **Notice Address** | ${data.party1NoticeAddress} | ${data.party2NoticeAddress} |
| **Date** | | |

Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

---

# Standard Terms

${standardTerms}`;
}

export async function buildNdaHtml(markdown: string): Promise<string> {
  const body = await marked(markdown);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: 25mm 20mm 25mm 20mm;
  }
  body {
    font-family: Georgia, serif;
    font-size: 11pt;
    line-height: 1.75;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
  }
  h1 {
    font-size: 17pt;
    margin: 0 0 14px;
    padding-bottom: 6px;
    border-bottom: 2px solid #1a1a1a;
  }
  h2 {
    font-size: 13pt;
    margin: 28px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #ccc;
  }
  h3 {
    font-size: 11pt;
    font-weight: bold;
    margin: 20px 0 4px;
  }
  p { margin: 6px 0 10px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 24px;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  td, th {
    border: 1px solid #888;
    padding: 8px 14px;
    vertical-align: top;
  }
  th { background: #f3f4f6; font-weight: 600; }
  hr {
    border: none;
    border-top: 2px solid #333;
    margin: 36px 0;
  }
  a { color: #1d4ed8; }
  ol { padding-left: 22px; margin: 8px 0; }
  li { margin: 5px 0; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
