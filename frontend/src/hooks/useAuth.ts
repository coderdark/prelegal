'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, signOut as apiSignOut } from '@/lib/api';

export interface AuthState {
  email: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((data) => setEmail(data.email))
      .catch(() => setEmail(null))
      .finally(() => setLoading(false));
  }, []);

  const signOut = async () => {
    await apiSignOut().catch(() => {});
    setEmail(null);
    router.replace('/login');
  };

  return { email, loading, signOut };
}
