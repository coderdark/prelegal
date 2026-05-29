import { NextRequest } from 'next/server';
import puppeteer from 'puppeteer';
import { buildNdaMarkdown, buildNdaHtml } from '@/lib/nda-template';
import { NdaFormData } from '@/types/nda';

export async function POST(req: NextRequest) {
  const data: NdaFormData = await req.json();

  const markdown = buildNdaMarkdown(data);
  const html = await buildNdaHtml(markdown);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '25mm', bottom: '25mm', left: '20mm', right: '20mm' },
  });
  await browser.close();

  return new Response(Buffer.from(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="Mutual-NDA.pdf"',
    },
  });
}
