'use client';

import { useState } from 'react';
import { Save, Key } from 'lucide-react';
import api from '@/lib/api';

export default function SettingsPage() {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setError('New passwords do not match');
    }

    setSubmitting(true);
    try {
      // Assuming a generic update password endpoint exists or can be added later
      // For now, this is a functional placeholder that simulates success
      // await api.admin.updatePassword(passwordForm);
      
      setTimeout(() => {
        setMessage('Password updated successfully. (Demo only)');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSubmitting(false);
      }, 800);
      
    } catch (err) {
      setError(err.message || 'Failed to update password');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your administrator account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Settings */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
            <Key size={20} className="text-accent" />
            <h2 className="text-lg font-bold text-text-primary">Change Password</h2>
          </div>

          {message && <div className="p-3 mb-4 rounded-lg bg-success-light text-success text-sm">{message}</div>}
          {error && <div className="p-3 mb-4 rounded-lg bg-error-light text-error text-sm">{error}</div>}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                className="input"
                required
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
              />
            </div>
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                className="input"
                required
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                className="input"
                required
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
              />
            </div>
            <div className="pt-2">
              <button type="submit" className="btn btn-primary w-full gap-2" disabled={submitting}>
                <Save size={18} />
                {submitting ? 'Saving...' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Global Event Settings (Placeholder) */}
        <div className="card p-6 opacity-75">
          <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
            <h2 className="text-lg font-bold text-text-primary">System Preferences</h2>
            <span className="badge badge-neutral">Coming Soon</span>
          </div>
          
          <div className="space-y-4 pointer-events-none">
            <div>
              <label className="label">Organization Name</label>
              <input type="text" className="input" defaultValue="Decode University" disabled />
            </div>
            <div>
              <label className="label">Default Timezone</label>
              <select className="input" disabled>
                <option>UTC (Coordinated Universal Time)</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input type="checkbox" className="rounded border-border text-accent" defaultChecked disabled />
                Enable email notifications for completed events
              </label>
            </div>
            <div className="pt-2">
              <button type="button" className="btn btn-secondary w-full" disabled>
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
