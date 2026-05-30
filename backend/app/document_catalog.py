from dataclasses import dataclass


@dataclass
class DocType:
    key: str
    name: str
    template_file: str
    required_fields: list[str]
    field_hints: str


CATALOG: dict[str, DocType] = {
    "mutual_nda": DocType(
        key="mutual_nda",
        name="Mutual Non-Disclosure Agreement",
        template_file="Mutual-NDA.md",
        required_fields=[
            "purpose", "effectiveDate", "mndaTermType", "confidentialityTermType",
            "governingLaw", "jurisdiction",
            "party1Name", "party1Title", "party1Company", "party1NoticeAddress",
            "party2Name", "party2Title", "party2Company", "party2NoticeAddress",
        ],
        field_hints=(
            "purpose, effectiveDate, mndaTermType ('fixed' or 'until_terminated'), "
            "mndaTermYears (if fixed), confidentialityTermType ('fixed' or 'perpetuity'), "
            "confidentialityTermYears (if fixed), governingLaw, jurisdiction, modifications (optional), "
            "party1Name, party1Title, party1Company, party1NoticeAddress, "
            "party2Name, party2Title, party2Company, party2NoticeAddress"
        ),
    ),
    "csa": DocType(
        key="csa",
        name="Cloud Service Agreement",
        template_file="CSA.md",
        required_fields=[
            "providerName", "customerName", "productName",
            "effectiveDate", "subscriptionPeriod", "fees",
            "governingLaw", "jurisdiction",
        ],
        field_hints=(
            "providerName, providerAddress, customerName, customerAddress, "
            "productName, productDescription, effectiveDate, subscriptionPeriod, "
            "fees, paymentTerms, governingLaw, jurisdiction"
        ),
    ),
    "design_partner": DocType(
        key="design_partner",
        name="Design Partner Agreement",
        template_file="design-partner-agreement.md",
        required_fields=[
            "providerName", "customerName", "productDescription",
            "effectiveDate", "duration", "governingLaw", "jurisdiction",
        ],
        field_hints=(
            "providerName, customerName, productDescription, effectiveDate, "
            "duration, compensation, responsibilities, governingLaw, jurisdiction"
        ),
    ),
    "sla": DocType(
        key="sla",
        name="Service Level Agreement",
        template_file="sla.md",
        required_fields=[
            "providerName", "customerName", "serviceDescription",
            "uptimeCommitment", "effectiveDate", "governingLaw", "jurisdiction",
        ],
        field_hints=(
            "providerName, customerName, serviceDescription, uptimeCommitment, "
            "responseTimeSLA, effectiveDate, governingLaw, jurisdiction"
        ),
    ),
    "psa": DocType(
        key="psa",
        name="Professional Services Agreement",
        template_file="psa.md",
        required_fields=[
            "providerName", "clientName", "servicesDescription",
            "effectiveDate", "fees", "governingLaw", "jurisdiction",
        ],
        field_hints=(
            "providerName, clientName, servicesDescription, effectiveDate, "
            "projectTimeline, fees, paymentTerms, ipOwnership, governingLaw, jurisdiction"
        ),
    ),
    "dpa": DocType(
        key="dpa",
        name="Data Processing Agreement",
        template_file="DPA.md",
        required_fields=[
            "controllerName", "processorName", "processingPurposes",
            "dataTypes", "effectiveDate", "governingLaw",
        ],
        field_hints=(
            "controllerName, processorName, processingPurposes, dataTypes, "
            "dataSubjectCategories, securityMeasures, effectiveDate, governingLaw"
        ),
    ),
    "software_license": DocType(
        key="software_license",
        name="Software License Agreement",
        template_file="Software-License-Agreement.md",
        required_fields=[
            "licensorName", "licenseeName", "softwareName",
            "licenseType", "fees", "effectiveDate", "governingLaw", "jurisdiction",
        ],
        field_hints=(
            "licensorName, licenseeName, softwareName, softwareDescription, "
            "licenseType ('perpetual' or 'term'), licenseTerm, fees, permittedUse, "
            "effectiveDate, governingLaw, jurisdiction"
        ),
    ),
    "partnership": DocType(
        key="partnership",
        name="Partnership Agreement",
        template_file="Partnership-Agreement.md",
        required_fields=[
            "partner1Name", "partner2Name", "partnershipPurpose",
            "revenueSharing", "effectiveDate", "governingLaw", "jurisdiction",
        ],
        field_hints=(
            "partner1Name, partner1Entity, partner2Name, partner2Entity, "
            "partnershipPurpose, revenueSharing, rolesAndResponsibilities, "
            "duration, effectiveDate, governingLaw, jurisdiction"
        ),
    ),
    "pilot": DocType(
        key="pilot",
        name="Pilot Agreement",
        template_file="Pilot-Agreement.md",
        required_fields=[
            "providerName", "customerName", "productDescription",
            "pilotStartDate", "pilotEndDate", "evaluationPurposes",
            "governingLaw", "jurisdiction",
        ],
        field_hints=(
            "providerName, providerAddress, customerName, customerAddress, "
            "productDescription, pilotStartDate, pilotEndDate, evaluationPurposes, "
            "fees, generalCapAmount, governingLaw, jurisdiction"
        ),
    ),
    "baa": DocType(
        key="baa",
        name="Business Associate Agreement",
        template_file="BAA.md",
        required_fields=[
            "coveredEntityName", "businessAssociateName", "servicesDescription",
            "phiTypes", "effectiveDate", "governingLaw",
        ],
        field_hints=(
            "coveredEntityName, businessAssociateName, servicesDescription, "
            "phiTypes, permittedUses, effectiveDate, governingLaw"
        ),
    ),
    "ai_addendum": DocType(
        key="ai_addendum",
        name="AI Addendum",
        template_file="AI-Addendum.md",
        required_fields=[
            "party1Name", "party2Name", "baseAgreementReference",
            "aiServicesDescription", "trainingDataUsage", "effectiveDate", "governingLaw",
        ],
        field_hints=(
            "party1Name, party2Name, baseAgreementReference, aiServicesDescription, "
            "trainingDataUsage ('permitted' or 'not permitted'), aiOutputOwnership, "
            "effectiveDate, governingLaw"
        ),
    ),
}


def get_doc_type(key: str) -> DocType | None:
    return CATALOG.get(key)


def is_complete(doc_key: str, fields: dict[str, str]) -> bool:
    doc = CATALOG.get(doc_key)
    if not doc:
        return False
    for req in doc.required_fields:
        if not fields.get(req):
            return False
    if doc_key == "mutual_nda":
        if fields.get("mndaTermType") == "fixed" and not fields.get("mndaTermYears"):
            return False
        if fields.get("confidentialityTermType") == "fixed" and not fields.get("confidentialityTermYears"):
            return False
    return True
