'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NdaFormData } from '@/types/nda';

const DEFAULT_FORM: NdaFormData = {
  purpose: 'Evaluating whether to enter into a business relationship with the other party.',
  effectiveDate: new Date().toISOString().split('T')[0],
  mndaTermYears: '1',
  mndaTermType: 'fixed',
  confidentialityTermYears: '1',
  confidentialityTermType: 'fixed',
  governingLaw: '',
  jurisdiction: '',
  modifications: '',
  party1Name: '',
  party1Title: '',
  party1Company: '',
  party1NoticeAddress: '',
  party2Name: '',
  party2Title: '',
  party2Company: '',
  party2NoticeAddress: '',
};

function buildPreviewMarkdown(data: NdaFormData): string {
  const mndaTerm =
    data.mndaTermType === 'fixed'
      ? `Expires ${data.mndaTermYears} year(s) from Effective Date.`
      : 'Continues until terminated in accordance with the terms of the MNDA.';

  const confidentialityTerm =
    data.confidentialityTermType === 'fixed'
      ? `${data.confidentialityTermYears} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
      : 'In perpetuity.';

  return `# Mutual Non-Disclosure Agreement

This Mutual Non-Disclosure Agreement consists of this Cover Page and the Common Paper Mutual NDA Standard Terms Version 1.0.

### Purpose
${data.purpose}

### Effective Date
${data.effectiveDate}

### MNDA Term
${mndaTerm}

### Term of Confidentiality
${confidentialityTerm}

### Governing Law & Jurisdiction

**Governing Law:** ${data.governingLaw || '_[state]_'}

**Jurisdiction:** ${data.jurisdiction || '_[city/county and state]_'}

### MNDA Modifications
${data.modifications || '_None._'}

---

### Parties

| | **Party 1** | **Party 2** |
|:---|:---|:---|
| Print Name | ${data.party1Name || '—'} | ${data.party2Name || '—'} |
| Title | ${data.party1Title || '—'} | ${data.party2Title || '—'} |
| Company | ${data.party1Company || '—'} | ${data.party2Company || '—'} |
| Notice Address | ${data.party1NoticeAddress || '—'} | ${data.party2NoticeAddress || '—'} |

---

*The full Common Paper Mutual NDA Standard Terms (Version 1.0) will be included in the downloaded PDF.*`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-200 mb-1">{label}</label>
      {children}
    </div>
  );
}

const input =
  'w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)] placeholder:text-[color:var(--input-placeholder)] shadow-sm outline-none ring-1 ring-transparent focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400/70';
const inputCompact =
  'rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)] shadow-sm outline-none ring-1 ring-transparent focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400/70';

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState<NdaFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [activePane, setActivePane] = useState<'form' | 'preview'>('form');

  useEffect(() => {
    if (!localStorage.getItem('prelegal_user')) {
      router.replace('/login');
    }
  }, [router]);

  const set =
    (field: keyof NdaFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleDownload = async () => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
      const res = await fetch(`${apiBase}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Mutual-NDA.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const preview = buildPreviewMarkdown(form);

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(99,102,241,0.16),transparent_60%),radial-gradient(900px_circle_at_90%_0%,rgba(56,189,248,0.10),transparent_55%)]">
      {/* Header */}
      <header className="bg-[var(--panel)] border-b border-[var(--border)] px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-50 tracking-tight">Mutual NDA Creator</h1>
          <p className="text-xs text-slate-300/80 mt-0.5">Powered by Common Paper Standard Terms v1.0</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={loading}
            className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm shadow-indigo-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60"
          >
            {loading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </header>

      {/* Mobile pane switcher */}
      <div className="md:hidden px-4 sm:px-6 pt-4">
        <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1">
          <button
            type="button"
            onClick={() => setActivePane('form')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activePane === 'form' ? 'bg-white/10 text-slate-50' : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            Form
          </button>
          <button
            type="button"
            onClick={() => setActivePane('preview')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activePane === 'preview' ? 'bg-white/10 text-slate-50' : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 md:overflow-hidden overflow-visible md:h-[calc(100vh-72px)] md:mt-0 mt-3">
        {/* Form panel */}
        <div
          className={`w-full md:w-1/2 overflow-y-auto px-4 sm:px-6 py-6 md:border-r md:border-[var(--border)] ${
            activePane === 'preview' ? 'hidden md:block' : ''
          }`}
        >
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-50">Agreement Details</h2>
                <p className="text-xs text-slate-300/80 mt-1">Fill the cover page fields; the Standard Terms stay unchanged.</p>
              </div>
            </div>

            <Field label="Purpose">
              <textarea rows={3} className={`${input} resize-none`} value={form.purpose} onChange={set('purpose')} />
            </Field>

            <Field label="Effective Date">
              <input type="date" className={input} value={form.effectiveDate} onChange={set('effectiveDate')} />
            </Field>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-200 mb-1">MNDA Term</label>
              <div className="flex gap-2 items-center">
                <select className={input} value={form.mndaTermType} onChange={set('mndaTermType')}>
                  <option value="fixed">Expires after</option>
                  <option value="until_terminated">Until terminated</option>
                </select>
                {form.mndaTermType === 'fixed' && (
                  <>
                    <input type="number" min="1" className={`w-20 ${inputCompact}`} value={form.mndaTermYears} onChange={set('mndaTermYears')} />
                    <span className="text-sm text-slate-300 whitespace-nowrap">year(s)</span>
                  </>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-200 mb-1">Term of Confidentiality</label>
              <div className="flex gap-2 items-center">
                <select className={input} value={form.confidentialityTermType} onChange={set('confidentialityTermType')}>
                  <option value="fixed">Fixed duration</option>
                  <option value="perpetuity">In perpetuity</option>
                </select>
                {form.confidentialityTermType === 'fixed' && (
                  <>
                    <input
                      type="number"
                      min="1"
                      className={`w-20 ${inputCompact}`}
                      value={form.confidentialityTermYears}
                      onChange={set('confidentialityTermYears')}
                    />
                    <span className="text-sm text-slate-300 whitespace-nowrap">year(s)</span>
                  </>
                )}
              </div>
            </div>

            <Field label="Governing Law (State)">
              <input type="text" className={input} placeholder="e.g. Delaware" value={form.governingLaw} onChange={set('governingLaw')} />
            </Field>

            <Field label="Jurisdiction">
              <input
                type="text"
                className={input}
                placeholder="e.g. courts located in New Castle, DE"
                value={form.jurisdiction}
                onChange={set('jurisdiction')}
              />
            </Field>

            <Field label="MNDA Modifications (optional)">
              <textarea
                rows={2}
                className={`${input} resize-none`}
                placeholder="List any modifications, or leave blank for none."
                value={form.modifications}
                onChange={set('modifications')}
              />
            </Field>

            <h2 className="text-base font-semibold text-slate-50 mt-7 mb-4">Party 1</h2>
            <Field label="Print Name">
              <input type="text" className={input} value={form.party1Name} onChange={set('party1Name')} />
            </Field>
            <Field label="Title">
              <input type="text" className={input} value={form.party1Title} onChange={set('party1Title')} />
            </Field>
            <Field label="Company">
              <input type="text" className={input} value={form.party1Company} onChange={set('party1Company')} />
            </Field>
            <Field label="Notice Address (email or postal)">
              <input type="text" className={input} value={form.party1NoticeAddress} onChange={set('party1NoticeAddress')} />
            </Field>

            <h2 className="text-base font-semibold text-slate-50 mt-7 mb-4">Party 2</h2>
            <Field label="Print Name">
              <input type="text" className={input} value={form.party2Name} onChange={set('party2Name')} />
            </Field>
            <Field label="Title">
              <input type="text" className={input} value={form.party2Title} onChange={set('party2Title')} />
            </Field>
            <Field label="Company">
              <input type="text" className={input} value={form.party2Company} onChange={set('party2Company')} />
            </Field>
            <Field label="Notice Address (email or postal)">
              <input type="text" className={input} value={form.party2NoticeAddress} onChange={set('party2NoticeAddress')} />
            </Field>
          </div>
        </div>

        {/* Preview panel */}
        <div
          className={`w-full md:w-1/2 overflow-y-auto px-4 sm:px-6 py-6 ${
            activePane === 'form' ? 'hidden md:block' : ''
          }`}
        >
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-50">Preview</h2>
                <p className="text-xs text-slate-300/80 mt-1">Placeholders show up until you fill each field.</p>
              </div>
              <button
                type="button"
                className="md:hidden text-xs text-slate-200/90 hover:text-slate-50 underline underline-offset-4"
                onClick={() => setActivePane('form')}
              >
                Edit
              </button>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 sm:p-8 nda-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
