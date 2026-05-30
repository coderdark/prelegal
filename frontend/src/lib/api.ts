const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser { email: string }

export function signUp(email: string, password: string) {
  return request<AuthUser>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signIn(email: string, password: string) {
  return request<AuthUser>('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signOut() {
  await request('/api/auth/signout', { method: 'POST' });
}

export function getMe() {
  return request<{ email: string | null }>('/api/auth/me');
}

// ── Documents ───────────────────────────────────────────────────────────────

export interface DocumentSummary {
  id: number;
  title: string;
  document_type: string | null;
  updated_at: string;
}

export interface DocumentDetail extends DocumentSummary {
  fields: Record<string, string>;
  history: { role: string; content: string }[];
  complete: boolean;
}

export function listDocuments() {
  return request<DocumentSummary[]>('/api/documents');
}

export function createDocument(data: { title?: string; document_type?: string; fields?: Record<string, string>; history?: { role: string; content: string }[]; complete?: boolean }) {
  return request<DocumentDetail>('/api/documents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getDocument(id: number) {
  return request<DocumentDetail>(`/api/documents/${id}`);
}

export function updateDocument(
  id: number,
  data: {
    title?: string;
    document_type?: string;
    fields?: Record<string, string>;
    history?: { role: string; content: string }[];
    complete?: boolean;
  },
) {
  return request<DocumentDetail>(`/api/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteDocument(id: number) {
  return request<{ ok: boolean }>(`/api/documents/${id}`, { method: 'DELETE' });
}

// ── Chat ────────────────────────────────────────────────────────────────────

export interface ChatResponse {
  message: string;
  document_type: string | null;
  fields: Record<string, string>;
  complete: boolean;
}

export function getChatGreeting() {
  return request<{ message: string }>('/api/chat/greeting');
}

export function sendChatMessage(history: { role: string; content: string }[], userMessage: string) {
  return request<ChatResponse>('/api/chat/message', {
    method: 'POST',
    body: JSON.stringify({ history, user_message: userMessage }),
  });
}

// ── PDF ─────────────────────────────────────────────────────────────────────

export async function generatePdf(documentType: string, fields: Record<string, string>): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/generate-pdf`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_type: documentType, fields }),
  });
  if (!res.ok) throw new ApiError(res.status, 'PDF generation failed');
  return res.blob();
}
