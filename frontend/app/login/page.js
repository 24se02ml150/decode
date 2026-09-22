'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState('team'); // 'team' | 'admin'
  const [teamId, setTeamId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credentials = mode === 'admin'
        ? { email, password }
        : { teamId: teamId.toUpperCase(), password };
      
      await login(credentials);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <div className="pt-12 pb-8 px-6 text-center animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">QR Campus Hunt</h1>
        <p className="text-text-secondary text-sm">Scan. Solve. Explore.</p>
      </div>

      {/* Login Card */}
      <div className="flex-1 px-5 pb-8">
        <div className="card p-6 max-w-sm mx-auto animate-fade-in-up">
          {/* Mode Toggle */}
          <div className="flex bg-bg rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('team'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all ${
                mode === 'team'
                  ? 'bg-bg-card text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Team Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('admin'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all ${
                mode === 'admin'
                  ? 'bg-bg-card text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'team' ? (
              <div className="mb-4">
                <label className="label" htmlFor="teamId">Team ID</label>
                <input
                  id="teamId"
                  type="text"
                  className="input font-mono tracking-wider uppercase"
                  placeholder="e.g. TEAM123456"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            )}

              <div className="mb-6">
                <div className="flex justify-between items-center mb-1">
                  <label className="label mb-0" htmlFor="password">Password</label>
                  {mode === 'team' && (
                    <Link 
                      href="/change-password"
                      className="text-xs text-accent hover:underline focus:outline-none"
                    >
                      Change Password?
                    </Link>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error-light text-error text-sm font-medium animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-full btn-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                mode === 'team' ? 'Start Hunt' : 'Sign In'
              )}
            </button>
          </form>
        </div>

        {mode === 'team' && (
          <p className="text-center text-text-muted text-xs mt-6 animate-fade-in">
            Your team ID and password were provided by the event organizer.
          </p>
        )}
      </div>
    </div>
  );
}
