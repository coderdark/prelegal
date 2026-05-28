# prelegal
A platform for drafting common legal agreements

## Status

> **Work in Progress** — This project is currently under active development and is expected to be completed by **2026-06-03**.

## Overview

Prelegal provides a set of standard legal agreement templates and a catalog for easy discovery. The templates are sourced from [Common Paper](https://github.com/CommonPaper) and licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Repository Structure

```
prelegal/
├── catalog.json          # Index of all templates with name, description, and filename
└── templates/            # Legal agreement templates (Markdown)
    ├── LICENSE.txt       # CC BY 4.0 license attribution
    ├── AI-Addendum.md
    ├── BAA.md
    ├── CSA.md
    ├── DPA.md
    ├── Mutual-NDA-coverpage.md
    ├── Mutual-NDA.md
    ├── Partnership-Agreement.md
    ├── Pilot-Agreement.md
    ├── Software-License-Agreement.md
    ├── design-partner-agreement.md
    ├── psa.md
    └── sla.md
```

## Templates

| Template | Description |
|----------|-------------|
| `Mutual-NDA-coverpage.md` | Cover page for the Mutual Non-Disclosure Agreement |
| `Mutual-NDA.md` | Mutual Non-Disclosure Agreement standard terms |
| `CSA.md` | Cloud Service Agreement |
| `design-partner-agreement.md` | Design Partner Agreement |
| `sla.md` | Service Level Agreement |
| `psa.md` | Professional Services Agreement |
| `DPA.md` | Data Processing Agreement |
| `Software-License-Agreement.md` | Software License Agreement |
| `Partnership-Agreement.md` | Partnership Agreement |
| `Pilot-Agreement.md` | Pilot Agreement |
| `BAA.md` | Business Associate Agreement |
| `AI-Addendum.md` | AI Addendum |

## catalog.json

`catalog.json` in the project root contains an entry for each template with the following fields:

- `name` — Human-readable name of the agreement
- `description` — Brief description of the agreement's purpose
- `filename` — Relative path to the template file

## License

All templates in the `templates/` directory are sourced from [Common Paper](https://github.com/CommonPaper) and are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
