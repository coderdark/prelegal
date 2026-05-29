export interface NdaFormData {
  purpose: string;
  effectiveDate: string;
  mndaTermYears: string;
  mndaTermType: 'fixed' | 'until_terminated';
  confidentialityTermYears: string;
  confidentialityTermType: 'fixed' | 'perpetuity';
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1Name: string;
  party1Title: string;
  party1Company: string;
  party1NoticeAddress: string;
  party2Name: string;
  party2Title: string;
  party2Company: string;
  party2NoticeAddress: string;
}
