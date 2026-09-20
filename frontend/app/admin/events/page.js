'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Settings, Play, Pause, Square, AlertCircle, ChevronRight, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Modal
  const [showCreate, setShowCreate] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  
  // Validation State
  const [validatingId, setValidatingId] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await api.admin.getEvents();
      // Fetch rounds for each event to show count
      const eventsWithRounds = await Promise.all(res.data.map(async (event) => {
        const roundsRes = await api.admin.getRounds(event.id);
        return { ...event, roundsCount: roundsRes.data.length };
      }));
      setEvents(eventsWithRounds);
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
      const res = await api.admin.createEvent(newEvent);
      setShowCreate(false);
      setNewEvent({ name: '', description: '' });
      router.push(`/admin/events/${res.data.id}`);
    } catch (err) {
      alert(err.message);
      setSubmitting(false);
    }
  };

  const handleValidateAndStart = async (event) => {
    setValidatingId(event.id);
    try {
      const res = await api.admin.validateEvent(event.id);
      setValidationResult({ eventId: event.id, ...res.data });
      
      if (res.data.isValid) {
        if (confirm('Event is fully configured. Do you want to start it now?')) {
          await api.admin.startEvent(event.id);
          setValidationResult(null);
          loadEvents();
        }
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setValidatingId(null);
    }
  };

  const handleAction = async (id, action) => {
    if (!confirm(`Are you sure you want to ${action} this event?`)) return;
    try {
      if (action === 'pause') await api.admin.pauseEvent(id);
      if (action === 'resume') await api.admin.resumeEvent(id);
      if (action === 'end') await api.admin.endEvent(id);
      loadEvents();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Events</h1>
          <p className="text-text-secondary mt-1">Manage your campus hunt events</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary gap-2">
          <Plus size={18} />
          Create Event
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-32 w-full"></div>
          <div className="skeleton h-32 w-full"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-bg-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={24} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">No Events Created</h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">Create your first QR Campus Hunt event to start adding rounds and tasks.</p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">
            Create First Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {events.map((event) => (
            <div key={event.id} className="card p-0 overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="p-5 border-b border-border bg-bg-hover/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{event.name}</h3>
                    {event.description && <p className="text-text-secondary text-sm mt-1 line-clamp-2">{event.description}</p>}
                  </div>
                  <span className={`badge ${
                    event.status === 'active' ? 'badge-success' :
                    event.status === 'paused' ? 'badge-warning' :
                    event.status === 'completed' ? 'badge-neutral' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {event.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1">
                <div className="flex items-center gap-6 mb-6">
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{event.roundsCount}</p>
                    <p className="text-text-secondary text-xs uppercase tracking-wider font-semibold mt-1">Rounds</p>
                  </div>
                  {event.startedAt && (
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {new Date(event.startedAt).toLocaleDateString()}
                      </p>
                      <p className="text-text-secondary text-xs uppercase tracking-wider font-semibold mt-1">Started</p>
                    </div>
                  )}
                </div>

                {/* Validation Errors Display */}
                {validationResult?.eventId === event.id && !validationResult.isValid && (
                  <div className="mb-4 p-4 rounded-lg bg-error-light border border-error/20">
                    <h4 className="text-error font-bold text-sm mb-2 flex items-center gap-2">
                      <AlertCircle size={16} /> Setup Incomplete
                    </h4>
                    <ul className="text-xs text-error/80 space-y-1 list-disc list-inside">
                      {validationResult.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="p-4 bg-bg-hover/50 border-t border-border flex items-center justify-between gap-3">
                <Link 
                  href={`/admin/events/${event.id}`}
                  className="btn btn-secondary btn-sm gap-2"
                >
                  <Settings size={16} />
                  Configure
                </Link>

                <div className="flex gap-2">
                  {event.status === 'draft' && (
                    <button 
                      onClick={() => handleValidateAndStart(event)}
                      disabled={validatingId === event.id}
                      className="btn btn-primary btn-sm gap-2"
                    >
                      <Play size={16} />
                      {validatingId === event.id ? 'Validating...' : 'Start Event'}
                    </button>
                  )}
                  {event.status === 'active' && (
                    <>
                      <button 
                        onClick={() => handleAction(event.id, 'pause')}
                        className="btn btn-secondary btn-sm gap-2 text-warning hover:text-warning"
                      >
                        <Pause size={16} /> Pause
                      </button>
                      <button 
                        onClick={() => handleAction(event.id, 'end')}
                        className="btn btn-danger btn-sm gap-2"
                      >
                        <Square size={16} /> End Event
                      </button>
                    </>
                  )}
                  {event.status === 'paused' && (
                    <button 
                      onClick={() => handleAction(event.id, 'resume')}
                      className="btn btn-primary btn-sm gap-2"
                    >
                      <Play size={16} /> Resume
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <h2 className="text-xl font-bold mb-4">Create New Event</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="label">Event Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={newEvent.name}
                  onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                  placeholder="e.g. Fall 2026 Campus Hunt"
                />
              </div>
              <div className="mb-6">
                <label className="label">Description (Optional)</label>
                <textarea
                  className="input min-h-[100px] resize-none"
                  value={newEvent.description}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Short description of the event..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Just need to import Calendar for the empty state icon
import { Calendar } from 'lucide-react';
