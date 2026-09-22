'use client';

import { useState, useEffect, use } from 'react';
import api from '@/lib/api';
import { Plus, Trash2, Edit, ChevronLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EventConfigPage({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [event, setEvent] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve(params).then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);
  
  // Modals
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [roundForm, setRoundForm] = useState({
    name: '',
    roundNumber: 1,
    description: '',
    qualifyCount: '',
  });

  const loadData = async () => {
    if (!id) return;
    try {
      const res = await api.admin.getEvent(id);
      setEvent(res.data.event);
      setRounds(res.data.rounds);
    } catch (err) {
      console.error(err);
      alert('Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRound = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...roundForm,
        eventId: parseInt(id),
        qualifyCount: roundForm.qualifyCount ? parseInt(roundForm.qualifyCount) : null,
        roundNumber: parseInt(roundForm.roundNumber),
      };

      if (editingRound) {
        await api.admin.updateRound(editingRound.id, payload);
      } else {
        await api.admin.createRound(payload);
      }
      
      setShowRoundModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openNewRound = () => {
    setEditingRound(null);
    setRoundForm({
      name: `Round ${rounds.length + 1}`,
      roundNumber: rounds.length + 1,
      description: '',
      qualifyCount: '',
    });
    setShowRoundModal(true);
  };

  const openEditRound = (round) => {
    setEditingRound(round);
    setRoundForm({
      name: round.name,
      roundNumber: round.roundNumber,
      description: round.description || '',
      qualifyCount: round.qualifyCount || '',
    });
    setShowRoundModal(true);
  };

  const handleDeleteRound = async (roundId) => {
    if (!confirm('Are you sure you want to delete this round? All tasks inside will also be deleted.')) return;
    try {
      await api.admin.deleteRound(roundId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-text-muted">Loading configuration...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link href="/admin/events" className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-accent mb-4 transition-colors">
          <ChevronLeft size={16} className="mr-1" /> Back to Events
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{event?.name} Configuration</h1>
            <p className="text-text-secondary mt-1">Configure rounds, qualification rules, and tasks</p>
          </div>
          <button 
            className="btn btn-primary gap-2"
            onClick={openNewRound}
          >
            <Plus size={18} /> Add Round
          </button>
        </div>
      </div>

      {/* Rounds List */}
      <div className="space-y-4">
        {rounds.length === 0 ? (
          <div className="card p-12 text-center text-text-secondary">
            No rounds created yet. Create the first round to add tasks.
          </div>
        ) : (
          rounds.map((round) => (
            <div key={round.id} className="card p-5 hover:border-accent/50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="w-8 h-8 rounded-full bg-bg-hover flex items-center justify-center font-bold text-text-secondary text-sm">
                      {round.roundNumber}
                    </span>
                    <h3 className="text-lg font-bold text-text-primary">{round.name}</h3>
                    <span className={`badge ${round.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                      {round.status}
                    </span>
                  </div>
                  <p className="text-text-secondary text-sm ml-11">
                    {round.qualifyCount 
                      ? `Top ${round.qualifyCount} teams qualify for the next round.`
                      : 'All participating teams qualify (No elimination).'}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 pl-11 md:pl-0">
                  <Link 
                    href={`/admin/rounds/${round.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    Manage Tasks
                  </Link>
                  <button 
                    onClick={() => openEditRound(round)}
                    className="btn btn-secondary btn-sm p-2"
                    title="Edit Round Settings"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteRound(round.id)}
                    className="btn btn-secondary btn-sm p-2 text-error hover:text-error hover:border-error"
                    title="Delete Round"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Round Modal */}
      {showRoundModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <h2 className="text-xl font-bold mb-4">{editingRound ? 'Edit Round' : 'Create Round'}</h2>
            <form onSubmit={handleSaveRound}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Round Number</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    required
                    value={roundForm.roundNumber}
                    onChange={e => setRoundForm({...roundForm, roundNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Round Name</label>
                  <input
                    type="text"
                    className="input"
                    required
                    value={roundForm.name}
                    onChange={e => setRoundForm({...roundForm, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="label">Qualification Limit (Optional)</label>
                <p className="text-xs text-text-muted mb-2">Leave empty if no teams are eliminated after this round.</p>
                <input
                  type="number"
                  min="1"
                  className="input"
                  placeholder="e.g. 10 (Top 10 teams qualify)"
                  value={roundForm.qualifyCount}
                  onChange={e => setRoundForm({...roundForm, qualifyCount: e.target.value})}
                />
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button type="button" className="btn btn-ghost" onClick={() => setShowRoundModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary gap-2">
                  <Save size={16} /> Save Round
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
