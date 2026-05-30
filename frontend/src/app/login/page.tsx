'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp, ApiError } from '@/lib/api';

type Tab = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (tab === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) setError('An account with this email already exists.');
        else if (err.status === 401) setError('Invalid email or password.');
        else if (err.status === 422) setError('Password must be at least 8 characters.');
        else setError('Something went wrong. Please try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>
            Prelegal
          </h1>
          <p className="text-sm text-[#888888]">Draft legal agreements in minutes</p>
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          {/* Tab toggle */}
          <div
            className="inline-flex w-full rounded-xl p-1 mb-5"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            {(['signin', 'signup'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className="flex-1 py-1.5 text-sm rounded-lg transition-colors font-medium"
                style={{
                  background: tab === t ? 'rgba(255,255,255,0.10)' : 'transparent',
                  color: tab === t ? '#f8fafc' : 'rgba(203,213,225,0.7)',
                }}
              >
                {t === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)] placeholder:text-[color:var(--input-placeholder)] shadow-sm outline-none focus:ring-2 focus:ring-[#209dd7]/40 focus:border-[#209dd7]/60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)] placeholder:text-[color:var(--input-placeholder)] shadow-sm outline-none focus:ring-2 focus:ring-[#209dd7]/40 focus:border-[#209dd7]/60"
              />
            </div>

            {tab === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Confirm password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)] placeholder:text-[color:var(--input-placeholder)] shadow-sm outline-none focus:ring-2 focus:ring-[#209dd7]/40 focus:border-[#209dd7]/60"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-60"
              style={{ backgroundColor: '#753991' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#5e2d75')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#753991')}
            >
              {loading ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
