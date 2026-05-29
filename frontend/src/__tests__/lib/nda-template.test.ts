import { describe, it, expect, vi, beforeEach } from 'vitest';

const FAKE_STANDARD_TERMS = '# Standard Terms\n\nThis is the standard terms content.';

vi.mock('fs', () => ({
  readFileSync: vi.fn(() => FAKE_STANDARD_TERMS),
}));

import { buildNdaMarkdown, buildNdaHtml } from '@/lib/nda-template';
import { NdaFormData } from '@/types/nda';

const BASE_FORM: NdaFormData = {
  purpose: 'Evaluating a potential partnership.',
  effectiveDate: '2026-05-28',
  mndaTermYears: '2',
  mndaTermType: 'fixed',
  confidentialityTermYears: '3',
  confidentialityTermType: 'fixed',
  governingLaw: 'Delaware',
  jurisdiction: 'courts located in Wilmington, DE',
  modifications: '',
  party1Name: 'Alice Smith',
  party1Title: 'CEO',
  party1Company: 'Acme Corp',
  party1NoticeAddress: 'alice@acme.com',
  party2Name: 'Bob Jones',
  party2Title: 'CTO',
  party2Company: 'Beta Inc',
  party2NoticeAddress: 'bob@beta.com',
};

describe('buildNdaMarkdown', () => {
  it('includes party names', () => {
    const md = buildNdaMarkdown(BASE_FORM);
    expect(md).toContain('Alice Smith');
    expect(md).toContain('Bob Jones');
  });

  it('includes party titles and companies', () => {
    const md = buildNdaMarkdown(BASE_FORM);
    expect(md).toContain('CEO');
    expect(md).toContain('Acme Corp');
    expect(md).toContain('CTO');
    expect(md).toContain('Beta Inc');
  });

  it('includes notice addresses', () => {
    const md = buildNdaMarkdown(BASE_FORM);
    expect(md).toContain('alice@acme.com');
    expect(md).toContain('bob@beta.com');
  });

  it('includes effective date', () => {
    const md = buildNdaMarkdown(BASE_FORM);
    expect(md).toContain('2026-05-28');
  });

  it('includes governing law and jurisdiction', () => {
    const md = buildNdaMarkdown(BASE_FORM);
    expect(md).toContain('Delaware');
    expect(md).toContain('courts located in Wilmington, DE');
  });

  it('includes purpose', () => {
    const md = buildNdaMarkdown(BASE_FORM);
    expect(md).toContain('Evaluating a potential partnership.');
  });

  it('renders fixed MNDA term with years', () => {
    const md = buildNdaMarkdown({ ...BASE_FORM, mndaTermType: 'fixed', mndaTermYears: '2' });
    expect(md).toContain('Expires 2 year(s) from Effective Date.');
  });

  it('renders until_terminated MNDA term', () => {
    const md = buildNdaMarkdown({ ...BASE_FORM, mndaTermType: 'until_terminated' });
    expect(md).toContain('Continues until terminated');
  });

  it('renders fixed confidentiality term with years', () => {
    const md = buildNdaMarkdown({ ...BASE_FORM, confidentialityTermType: 'fixed', confidentialityTermYears: '3' });
    expect(md).toContain('3 year(s) from Effective Date');
  });

  it('renders perpetual confidentiality term', () => {
    const md = buildNdaMarkdown({ ...BASE_FORM, confidentialityTermType: 'perpetuity' });
    expect(md).toContain('In perpetuity.');
  });

  it('falls back to "None." when modifications is empty', () => {
    const md = buildNdaMarkdown({ ...BASE_FORM, modifications: '' });
    expect(md).toContain('None.');
  });

  it('includes custom modifications when provided', () => {
    const md = buildNdaMarkdown({ ...BASE_FORM, modifications: 'Section 9 is amended.' });
    expect(md).toContain('Section 9 is amended.');
  });

  it('appends the standard terms from the template file', () => {
    const md = buildNdaMarkdown(BASE_FORM);
    expect(md).toContain(FAKE_STANDARD_TERMS);
  });
});

describe('buildNdaHtml', () => {
  it('returns a complete HTML document', async () => {
    const html = await buildNdaHtml('# Hello\n\nWorld');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<body>');
  });

  it('renders markdown headings as HTML', async () => {
    const html = await buildNdaHtml('# Title\n\n## Section');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<h2>Section</h2>');
  });

  it('renders bold text', async () => {
    const html = await buildNdaHtml('This is **important**.');
    expect(html).toContain('<strong>important</strong>');
  });

  it('includes @page CSS rule for print margins', async () => {
    const html = await buildNdaHtml('content');
    expect(html).toContain('@page');
    expect(html).toContain('25mm');
  });

  it('sets Georgia font family', async () => {
    const html = await buildNdaHtml('content');
    expect(html).toContain('Georgia');
  });
});
