'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({ error, reset }) {
  const router = useRouter();
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center p-5 text-center">
      <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-text-primary mb-2">Something went wrong</h2>
      <p className="text-text-secondary text-sm mb-6">{error.message || 'An unexpected error occurred while loading this task.'}</p>
      
      <div className="flex gap-4">
        <button onClick={() => reset()} className="btn btn-secondary">
          Try Again
        </button>
        <button onClick={() => router.push('/team/dashboard')} className="btn btn-primary">
          Dashboard
        </button>
      </div>
    </div>
  );
}
