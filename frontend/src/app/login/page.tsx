'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('prelegal_user', email || 'user');
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#032147] mb-1" style={{ color: '#f1f5f9' }}>
            Prelegal
          </h1>
          <p className="text-sm text-[#888888]">Draft legal agreements in minutes</p>
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-50 mb-5">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)] placeholder:text-[color:var(--input-placeholder)] shadow-sm outline-none focus:ring-2 focus:ring-[#209dd7]/40 focus:border-[#209dd7]/60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)] placeholder:text-[color:var(--input-placeholder)] shadow-sm outline-none focus:ring-2 focus:ring-[#209dd7]/40 focus:border-[#209dd7]/60"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors cursor-pointer"
              style={{ backgroundColor: '#753991' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5e2d75')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#753991')}
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
