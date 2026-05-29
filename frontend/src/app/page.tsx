'use client';

import { useState } from 'react';
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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const input = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function Home() {
  const [form, setForm] = useState<NdaFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  const set =
    (field: keyof NdaFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-pdf', {
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mutual NDA Creator</h1>
          <p className="text-xs text-gray-500 mt-0.5">Powered by Common Paper Standard Terms v1.0</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors cursor-pointer"
        >
          {loading ? 'Generating…' : 'Download PDF'}
        </button>
      </header>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>
        {/* Form panel */}
        <div className="w-1/2 overflow-y-auto p-6 border-r border-gray-200 bg-white">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Agreement Details</h2>

          <Field label="Purpose">
            <textarea rows={3} className={`${input} resize-none`} value={form.purpose} onChange={set('purpose')} />
          </Field>

          <Field label="Effective Date">
            <input type="date" className={input} value={form.effectiveDate} onChange={set('effectiveDate')} />
          </Field>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">MNDA Term</label>
            <div className="flex gap-2 items-center">
              <select className={input} value={form.mndaTermType} onChange={set('mndaTermType')}>
                <option value="fixed">Expires after</option>
                <option value="until_terminated">Until terminated</option>
              </select>
              {form.mndaTermType === 'fixed' && (
                <>
                  <input
                    type="number"
                    min="1"
                    className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.mndaTermYears}
                    onChange={set('mndaTermYears')}
                  />
                  <span className="text-sm text-gray-600 whitespace-nowrap">year(s)</span>
                </>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Term of Confidentiality</label>
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
                    className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.confidentialityTermYears}
                    onChange={set('confidentialityTermYears')}
                  />
                  <span className="text-sm text-gray-600 whitespace-nowrap">year(s)</span>
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

          <h2 className="text-base font-semibold text-gray-800 mt-6 mb-4">Party 1</h2>
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

          <h2 className="text-base font-semibold text-gray-800 mt-6 mb-4">Party 2</h2>
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

        {/* Preview panel */}
        <div className="w-1/2 overflow-y-auto p-6 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Preview</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-8 nda-preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
