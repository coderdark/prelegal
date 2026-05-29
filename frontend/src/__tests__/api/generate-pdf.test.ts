import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPdf, mockSetContent, mockClose, mockNewPage, mockLaunch } = vi.hoisted(() => {
  const mockPdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-fake'));
  const mockSetContent = vi.fn().mockResolvedValue(undefined);
  const mockClose = vi.fn().mockResolvedValue(undefined);
  const mockNewPage = vi.fn().mockResolvedValue({ setContent: mockSetContent, pdf: mockPdf });
  const mockLaunch = vi.fn().mockResolvedValue({ newPage: mockNewPage, close: mockClose });
  return { mockPdf, mockSetContent, mockClose, mockNewPage, mockLaunch };
});

vi.mock('puppeteer', () => ({ default: { launch: mockLaunch } }));
vi.mock('fs', () => ({ readFileSync: vi.fn(() => '# Standard Terms') }));

import { POST } from '@/app/api/generate-pdf/route';

const VALID_BODY = {
  purpose: 'Evaluating a business relationship.',
  effectiveDate: '2026-05-28',
  mndaTermYears: '1',
  mndaTermType: 'fixed',
  confidentialityTermYears: '1',
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

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/generate-pdf', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with PDF content-type', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('sets Content-Disposition to attachment with filename', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="Mutual-NDA.pdf"');
  });

  it('launches puppeteer and closes the browser', async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockLaunch).toHaveBeenCalledOnce();
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('calls page.pdf with A4 format and margins', async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'A4',
        margin: expect.objectContaining({ top: '25mm', bottom: '25mm' }),
      })
    );
  });

  it('returns the buffer produced by puppeteer', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    const buffer = Buffer.from(await res.arrayBuffer());
    expect(buffer.toString()).toBe('%PDF-fake');
  });
});
