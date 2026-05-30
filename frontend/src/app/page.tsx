'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/hooks/useAuth';
import {
  getChatGreeting,
  sendChatMessage,
  generatePdf,
  listDocuments,
  createDocument,
  updateDocument,
  getDocument,
  deleteDocument,
  type DocumentSummary,
} from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

type Fields = Record<string, string>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fieldLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function buildNdaPreview(f: Fields): string {
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

*The full Common Paper Mutual NDA Standard Terms (Version 1.0) will be included in the downloaded PDF.*`;
}

function buildGenericPreview(docTypeName: string, f: Fields): string {
  const entries = Object.entries(f).filter(([, v]) => v);
  if (entries.length === 0) return `# ${docTypeName}\n\n_Details will appear here as the AI gathers information._`;
  const rows = entries.map(([k, v]) => `| ${fieldLabel(k)} | ${v} |`).join('\n');
  return `# ${docTypeName}\n\n### Gathered Details\n\n| Field | Value |\n|:------|:------|\n${rows}`;
}

const DOC_TYPE_NAMES: Record<string, string> = {
  mutual_nda: 'Mutual Non-Disclosure Agreement',
  csa: 'Cloud Service Agreement',
  design_partner: 'Design Partner Agreement',
  sla: 'Service Level Agreement',
  psa: 'Professional Services Agreement',
  dpa: 'Data Processing Agreement',
  software_license: 'Software License Agreement',
  partnership: 'Partnership Agreement',
  pilot: 'Pilot Agreement',
  baa: 'Business Associate Agreement',
  ai_addendum: 'AI Addendum',
};

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const { email, loading: authLoading, signOut } = useAuth();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fields, setFields] = useState<Fields>({});
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Document persistence state
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePane, setActivePane] = useState<'chat' | 'preview'>('chat');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !email) {
      router.replace('/login');
    }
  }, [authLoading, email, router]);

  // ── Initial data load ───────────────────────────────────────────────────────

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch {
      // silently ignore — user will just not see history
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (!email) return;
    getChatGreeting()
      .then((data) => setMessages([{ role: 'assistant', content: data.message }]))
      .catch(() => {});
    fetchDocuments();
  }, [email, fetchDocuments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending]);

  // ── Document actions ────────────────────────────────────────────────────────

  const startNewDocument = () => {
    setMessages([]);
    setFields({});
    setDocumentType(null);
    setComplete(false);
    setDocumentId(null);
    setSidebarOpen(false);
    getChatGreeting()
      .then((data) => setMessages([{ role: 'assistant', content: data.message }]))
      .catch(() => {});
  };

  const loadDocument = async (doc: DocumentSummary) => {
    try {
      const detail = await getDocument(doc.id);
      setMessages(detail.history as ChatMessage[]);
      setFields(detail.fields);
      setDocumentType(detail.document_type);
      setComplete(detail.complete);
      setDocumentId(detail.id);
      setSidebarOpen(false);
      setActivePane('chat');
    } catch {
      // ignore silently
    }
  };

  const handleDeleteDocument = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (documentId === id) startNewDocument();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    try {
      const data = await sendChatMessage(
        messages.map((m) => ({ role: m.role, content: m.content })),
        text,
      );

      const aiMsg: ChatMessage = { role: 'assistant', content: data.message };
      const fullHistory = [...updatedMessages, aiMsg];
      setMessages(fullHistory);
      if (data.document_type) setDocumentType(data.document_type);
      setFields(data.fields ?? {});
      setComplete(data.complete ?? false);

      // Auto-save document
      const historyPayload = fullHistory.map((m) => ({ role: m.role, content: m.content }));
      if (documentId === null) {
        const created = await createDocument({
          document_type: data.document_type ?? undefined,
          fields: data.fields,
          history: historyPayload,
          complete: data.complete,
        });
        setDocumentId(created.id);
        setDocuments((prev) => [{ id: created.id, title: created.title, document_type: created.document_type, updated_at: created.updated_at }, ...prev]);
      } else {
        const updated = await updateDocument(documentId, {
          document_type: data.document_type ?? undefined,
          fields: data.fields,
          history: historyPayload,
          complete: data.complete,
        });
        setDocuments((prev) =>
          prev.map((d) => (d.id === documentId ? { ...d, title: updated.title, updated_at: updated.updated_at } : d)),
        );
      }
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

  // ── PDF download ────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    if (!documentType) return;
    setDownloading(true);
    try {
      const blob = await generatePdf(documentType, fields);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${DOC_TYPE_NAMES[documentType] ?? documentType}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const docName = documentType ? (DOC_TYPE_NAMES[documentType] ?? documentType) : null;
  const preview =
    documentType === 'mutual_nda'
      ? buildNdaPreview(fields)
      : buildGenericPreview(docName ?? 'Your Document', fields);

  const statusText = complete
    ? 'All details gathered — download your document above.'
    : documentType
    ? `Drafting your ${docName}…`
    : "Tell me what document you need and I'll help you draft it.";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <p className="text-sm" style={{ color: 'rgba(203,213,225,0.6)' }}>Loading…</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>

      {/* Header */}
      <header
        className="border-b px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          {/* Sidebar toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(203,213,225,0.7)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title="Document history"
            aria-label="Toggle document history"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight" style={{ color: '#f1f5f9' }}>
              {docName ?? 'Legal Document Creator'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(203,213,225,0.8)' }}>
              Powered by Common Paper Standard Terms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <button
            onClick={signOut}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
            style={{ borderColor: 'rgba(226,232,240,0.2)', color: 'rgba(203,213,225,0.8)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Sign out
          </button>
        </div>
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

      {/* Main area */}
      <div className="flex flex-1 md:overflow-hidden overflow-visible md:h-[calc(100vh-72px)] md:mt-0 mt-3 relative">

        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 md:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Document history sidebar */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-30 md:z-auto
            w-72 md:w-64 flex flex-col border-r
            transform transition-transform duration-200 md:transform-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${sidebarOpen ? 'flex' : 'hidden md:flex'}
          `}
          style={{ background: 'var(--panel-solid)', borderColor: 'var(--border)' }}
        >
          <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>My Documents</span>
            <button
              type="button"
              onClick={startNewDocument}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg text-white"
              style={{ backgroundColor: '#209dd7' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1a7fb0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#209dd7')}
            >
              + New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {loadingDocs && (
              <p className="px-4 py-3 text-xs" style={{ color: 'rgba(203,213,225,0.5)' }}>Loading…</p>
            )}
            {!loadingDocs && documents.length === 0 && (
              <p className="px-4 py-3 text-xs" style={{ color: 'rgba(203,213,225,0.5)' }}>
                No documents yet. Start a conversation to create one.
              </p>
            )}
            {documents.map((doc) => (
              <div
                key={doc.id}
                role="button"
                tabIndex={0}
                onClick={() => loadDocument(doc)}
                onKeyDown={(e) => e.key === 'Enter' && loadDocument(doc)}
                className="group flex items-start justify-between px-4 py-3 cursor-pointer transition-colors"
                style={{
                  background: documentId === doc.id ? 'rgba(32,157,215,0.15)' : 'transparent',
                  borderLeft: documentId === doc.id ? '2px solid #209dd7' : '2px solid transparent',
                }}
                onMouseEnter={(e) => documentId !== doc.id && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => documentId !== doc.id && (e.currentTarget.style.background = 'transparent')}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>
                    {doc.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(203,213,225,0.5)' }}>
                    {relativeTime(doc.updated_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteDocument(doc.id, e)}
                  disabled={deletingId === doc.id}
                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                  style={{ color: 'rgba(203,213,225,0.5)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(203,213,225,0.5)')}
                  title="Delete document"
                  aria-label="Delete document"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {email && (
            <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs truncate" style={{ color: 'rgba(203,213,225,0.5)' }}>{email}</p>
            </div>
          )}
        </aside>

        {/* Chat panel */}
        <div
          className={`w-full md:flex-1 flex flex-col md:border-r ${activePane === 'preview' ? 'hidden md:flex' : ''}`}
          style={{ borderColor: 'var(--border)' }}
        >
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
              {statusText}
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
