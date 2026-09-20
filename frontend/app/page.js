'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push(user.role === 'admin' ? '/admin/dashboard' : '/team/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg">
      <div className="animate-pulse-soft">
        <div className="w-10 h-10 rounded-full bg-accent mx-auto mb-3"></div>
        <p className="text-text-secondary text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}
