'use client';

export default function Loading() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg">
      <div className="animate-pulse-soft text-center">
        <div className="w-10 h-10 rounded-full bg-accent mx-auto mb-3"></div>
        <p className="text-text-secondary text-sm">Loading task...</p>
      </div>
    </div>
  );
}
