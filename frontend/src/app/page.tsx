'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

interface NdaFields {
  purpose?: string;
  effectiveDate?: string;
  mndaTermYears?: string;
  mndaTermType?: string;
  confidentialityTermYears?: string;
  confidentialityTermType?: string;
  governingLaw?: string;
  jurisdiction?: string;
  modifications?: string;
  party1Name?: string;
  party1Title?: string;
  party1Company?: string;
  party1NoticeAddress?: string;
  party2Name?: string;
  party2Title?: string;
  party2Company?: string;
  party2NoticeAddress?: string;
}

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

function buildPreviewMarkdown(f: NdaFields): string {
  const mndaTerm =
    f.mndaTermType === 'fixed'
      ? `Expires ${f.mndaTermYears ?? '?'} year(s) from Effective Date.`
      : f.mndaTermType === 'until_terminated'
      ? 'Continues until terminated in accordance with the terms of the MNDA.'
      : '_[not yet specified]_';

  const confidentialityTerm =
    f.confidentialityTermType === 'fixed'
      ? `${f.confidentialityTermYears ?? '?'} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
      : f.confidentialityTermType === 'perpetuity'
      ? 'In perpetuity.'
      : '_[not yet specified]_';

  return `# Mutual Non-Disclosure Agreement

This Mutual Non-Disclosure Agreement consists of this Cover Page and the Common Paper Mutual NDA Standard Terms Version 1.0.

### Purpose
${f.purpose || '_[not yet specified]_'}

### Effective Date
${f.effectiveDate || '_[not yet specified]_'}

### MNDA Term
${mndaTerm}

### Term of Confidentiality
${confidentialityTerm}

### Governing Law & Jurisdiction

**Governing Law:** ${f.governingLaw || '_[state]_'}

**Jurisdiction:** ${f.jurisdiction || '_[city/county and state]_'}

### MNDA Modifications
${f.modifications || '_None._'}

---

### Parties

| | **Party 1** | **Party 2** |
|:---|:---|:---|
| Print Name | ${f.party1Name || '—'} | ${f.party2Name || '—'} |
| Title | ${f.party1Title || '—'} | ${f.party2Title || '—'} |
| Company | ${f.party1Company || '—'} | ${f.party2Company || '—'} |
| Notice Address | ${f.party1NoticeAddress || '—'} | ${f.party2NoticeAddress || '—'} |

---

*The full Common Paper Mutual NDA Standard Terms (Version 1.0) will be included in the downloaded PDF.*`;
}

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fields, setFields] = useState<NdaFields>({});
  const [complete, setComplete] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activePane, setActivePane] = useState<'chat' | 'preview'>('chat');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem('prelegal_user')) {
      router.replace('/login');
      return;
    }
    fetch(`${API_BASE}/api/chat/greeting`)
      .then((r) => r.json())
      .then((data) => setMessages([{ role: 'assistant', content: data.message }]));
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          user_message: text,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      setFields(data.fields ?? {});
      setComplete(data.complete ?? false);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: fields.purpose ?? '',
          effectiveDate: fields.effectiveDate ?? new Date().toISOString().split('T')[0],
          mndaTermYears: fields.mndaTermYears ?? '1',
          mndaTermType: fields.mndaTermType ?? 'fixed',
          confidentialityTermYears: fields.confidentialityTermYears ?? '1',
          confidentialityTermType: fields.confidentialityTermType ?? 'fixed',
          governingLaw: fields.governingLaw ?? '',
          jurisdiction: fields.jurisdiction ?? '',
          modifications: fields.modifications ?? '',
          party1Name: fields.party1Name ?? '',
          party1Title: fields.party1Title ?? '',
          party1Company: fields.party1Company ?? '',
          party1NoticeAddress: fields.party1NoticeAddress ?? '',
          party2Name: fields.party2Name ?? '',
          party2Title: fields.party2Title ?? '',
          party2Company: fields.party2Company ?? '',
          party2NoticeAddress: fields.party2NoticeAddress ?? '',
        }),
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
      setDownloading(false);
    }
  };

  const preview = buildPreviewMarkdown(fields);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header
        className="border-b px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
      >
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight" style={{ color: '#f1f5f9' }}>
            Mutual NDA Creator
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(203,213,225,0.8)' }}>
            Powered by Common Paper Standard Terms v1.0
          </p>
        </div>
        {complete && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer text-white disabled:opacity-50"
            style={{ backgroundColor: '#753991' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5e2d75')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#753991')}
          >
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        )}
      </header>

      {/* Mobile pane switcher */}
      <div className="md:hidden px-4 sm:px-6 pt-4">
        <div className="inline-flex rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
          {(['chat', 'preview'] as const).map((pane) => (
            <button
              key={pane}
              type="button"
              onClick={() => setActivePane(pane)}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors capitalize"
              style={{
                background: activePane === pane ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: activePane === pane ? '#f8fafc' : 'rgba(203,213,225,0.8)',
              }}
            >
              {pane}
            </button>
          ))}
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 md:overflow-hidden overflow-visible md:h-[calc(100vh-72px)] md:mt-0 mt-3">
        {/* Chat panel */}
        <div
          className={`w-full md:w-1/2 flex flex-col md:border-r ${activePane === 'preview' ? 'hidden md:flex' : ''}`}
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? { backgroundColor: '#209dd7', color: '#fff' }
                      : { background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--foreground)' }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-4 py-2.5 text-sm"
                  style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'rgba(203,213,225,0.7)' }}
                >
                  Thinking…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 sm:px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div
              className="flex items-end gap-2 rounded-xl p-2"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                disabled={sending}
                className="flex-1 resize-none bg-transparent text-sm outline-none px-2 py-1.5 max-h-32"
                style={{ color: 'var(--input-fg)' }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: '#753991' }}
                onMouseEnter={(e) => !sending && input.trim() && (e.currentTarget.style.backgroundColor = '#5e2d75')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#753991')}
              >
                Send
              </button>
            </div>
            <p className="text-xs mt-1.5 text-center" style={{ color: 'rgba(203,213,225,0.5)' }}>
              {complete ? '✓ All fields gathered — download your PDF above.' : 'Tell the AI about your NDA and it will fill in the details.'}
            </p>
          </div>
        </div>

        {/* Preview panel */}
        <div
          className={`w-full md:w-1/2 overflow-y-auto px-4 sm:px-6 py-6 ${activePane === 'chat' ? 'hidden md:block' : ''}`}
        >
          <div
            className="rounded-2xl p-5 sm:p-6 shadow-sm"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>Preview</h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(203,213,225,0.8)' }}>Updates as the AI gathers information.</p>
              </div>
              <button
                type="button"
                className="md:hidden text-xs underline underline-offset-4"
                style={{ color: 'rgba(203,213,225,0.9)' }}
                onClick={() => setActivePane('chat')}
              >
                Chat
              </button>
            </div>
            <div
              className="rounded-xl p-6 sm:p-8 nda-preview"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
