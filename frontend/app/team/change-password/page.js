'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    
    try {
      await api.auth.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword
      });
      
      // Force reload auth context and navigate to dashboard
      window.location.href = '/team/dashboard';
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-bg-card p-8 rounded-2xl border border-border shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-accent/20 blur-[64px] pointer-events-none" />
        
        <div className="text-center relative z-10">
          <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-4 border border-accent/20">
            <KeyRound size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-text-primary mb-2">Change Password</h2>
          
          {user?.mustResetPassword ? (
            <div className="flex items-start gap-2 bg-warning/10 text-warning text-left p-3 rounded-lg text-sm border border-warning/20 mb-6">
              <ShieldAlert className="shrink-0 mt-0.5" size={16} />
              <p>You are using a default or temporary password. For your security, you must set a new password before continuing.</p>
            </div>
          ) : (
            <p className="text-text-secondary text-sm mb-6">Update your account password.</p>
          )}
        </div>

        <form className="mt-8 space-y-6 relative z-10" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-error/10 border border-error/20 text-error text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                required
                className="input"
                placeholder="Enter current password"
                value={form.currentPassword}
                onChange={e => setForm({...form, currentPassword: e.target.value})}
              />
            </div>
            
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                required
                className="input"
                placeholder="Min. 6 characters"
                value={form.newPassword}
                onChange={e => setForm({...form, newPassword: e.target.value})}
              />
            </div>
            
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                required
                className="input"
                placeholder="Type new password again"
                value={form.confirmPassword}
                onChange={e => setForm({...form, confirmPassword: e.target.value})}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-bg-page bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-bg-page border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </span>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
