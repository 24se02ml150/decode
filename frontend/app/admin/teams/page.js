'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Search, Trash2, Key, Filter, CheckCircle2, XCircle, Users } from 'lucide-react';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  
  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  
  // Forms
  const [newTeam, setNewTeam] = useState({ teamName: '' });
  const [bulkData, setBulkData] = useState({ count: 5, prefix: 'Team' });
  const [submitting, setSubmitting] = useState(false);
  
  // Result info (for showing plain passwords)
  const [createdTeams, setCreatedTeams] = useState(null);

  useEffect(() => {
    loadTeams();
  }, [page, search]);

  const loadTeams = async () => {
    try {
      const res = await api.admin.getTeams(`page=${page}&limit=20&search=${search}`);
      setTeams(res.data.teams);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.admin.createTeam(newTeam);
      setCreatedTeams([res.data]);
      setShowCreate(false);
      setNewTeam({ teamName: '' });
      loadTeams();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.admin.bulkCreateTeams({
        count: parseInt(bulkData.count),
        prefix: bulkData.prefix
      });
      setCreatedTeams(res.data);
      setShowBulk(false);
      loadTeams();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (id, teamName) => {
    if (!confirm(`Are you sure you want to reset the password for ${teamName}?`)) return;
    try {
      const res = await api.admin.resetPassword(id);
      setCreatedTeams([res.data]);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, teamName) => {
    if (!confirm(`Are you sure you want to completely delete ${teamName}? This cannot be undone.`)) return;
    try {
      await api.admin.deleteTeam(id);
      loadTeams();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await api.admin.updateTeam(id, { isActive: !currentStatus });
      loadTeams();
    } catch (err) {
      alert(err.message);
    }
  };

  const downloadCSV = async () => {
    try {
      const blob = await api.admin.getTeamReport('csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'teams.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download CSV');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Teams</h1>
          <p className="text-text-secondary mt-1">Manage participating teams and access credentials</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowBulk(true)} className="btn btn-secondary">
            Bulk Generate
          </button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary gap-2">
            <Plus size={18} />
            New Team
          </button>
        </div>
      </div>

      {/* Credentials Banner */}
      {createdTeams && (
        <div className="bg-accent-subtle border border-accent/20 rounded-xl p-6 relative">
          <button 
            onClick={() => setCreatedTeams(null)} 
            className="absolute top-4 right-4 text-accent/60 hover:text-accent"
          >
            <XCircle size={20} />
          </button>
          <h3 className="font-bold text-accent mb-2 flex items-center gap-2">
            <Key size={18} /> Credentials Generated
          </h3>
          <p className="text-sm text-accent/80 mb-4">
            Please copy these credentials now. You won't be able to see the passwords again.
          </p>
          
          <div className="bg-white rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-hover text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Team Name</th>
                  <th className="px-4 py-3 font-medium">Team ID</th>
                  <th className="px-4 py-3 font-medium">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {createdTeams.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium">{t.teamName}</td>
                    <td className="px-4 py-3 font-mono text-accent">{t.teamId}</td>
                    <td className="px-4 py-3 font-mono">{t.plainPassword}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search teams by name or ID..."
            className="input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={downloadCSV} className="btn btn-secondary flex-shrink-0">
          Export CSV
        </button>
      </div>

      {/* Teams Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-bg-hover rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={24} className="text-text-muted" />
            </div>
            <p className="font-medium text-text-primary">No teams found</p>
            <p className="text-sm text-text-secondary">Try a different search or create a new team.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-hover text-text-secondary border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Team Name</th>
                  <th className="px-6 py-4 font-medium">Team ID</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-bg-hover/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">
                      {team.teamName}
                    </td>
                    <td className="px-6 py-4 font-mono text-text-secondary">
                      {team.teamId}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(team.id, team.isActive)}
                        className={`badge ${team.isActive ? 'badge-success' : 'badge-neutral'} cursor-pointer hover:opacity-80 transition-opacity`}
                      >
                        {team.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResetPassword(team.id, team.teamName)}
                          className="p-2 text-text-secondary hover:text-accent transition-colors"
                          title="Reset Password"
                        >
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(team.id, team.teamName)}
                          className="p-2 text-text-secondary hover:text-error transition-colors"
                          title="Delete Team"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-sm">
            <button 
              className="btn btn-secondary btn-sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </button>
            <span className="text-text-secondary">
              Page {page} of {pagination.totalPages}
            </span>
            <button 
              className="btn btn-secondary btn-sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <h2 className="text-xl font-bold mb-4">Create Team</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="label">Team Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={newTeam.teamName}
                  onChange={e => setNewTeam({...newTeam, teamName: e.target.value})}
                  placeholder="E.g. The Innovators"
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulk && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <h2 className="text-xl font-bold mb-4">Bulk Generate Teams</h2>
            <p className="text-sm text-text-secondary mb-4">
              Quickly create multiple teams at once. Their names will be numbered (e.g. Team 1, Team 2).
            </p>
            <form onSubmit={handleBulkCreate}>
              <div className="mb-4">
                <label className="label">Number of Teams</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="input"
                  required
                  value={bulkData.count}
                  onChange={e => setBulkData({...bulkData, count: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="label">Name Prefix</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={bulkData.prefix}
                  onChange={e => setBulkData({...bulkData, prefix: e.target.value})}
                  placeholder="Team"
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" className="btn btn-ghost" onClick={() => setShowBulk(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Generating...' : 'Generate Teams'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
