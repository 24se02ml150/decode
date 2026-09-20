'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Trash2, Edit, MapPin } from 'lucide-react';

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadLocations(selectedEvent);
    } else {
      setLocations([]);
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const res = await api.admin.getEvents();
      setEvents(res.data);
      if (res.data.length > 0) {
        setSelectedEvent(res.data[0].id.toString());
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const loadLocations = async (eventId) => {
    setLoading(true);
    try {
      const res = await api.admin.getLocations(eventId);
      setLocations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setSubmitting(true);
    try {
      if (editingLoc) {
        await api.admin.updateLocation(editingLoc.id, form);
      } else {
        await api.admin.createLocation({ ...form, eventId: parseInt(selectedEvent) });
      }
      setShowModal(false);
      loadLocations(selectedEvent);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openNew = () => {
    if (!selectedEvent) return alert('Select an event first.');
    setEditingLoc(null);
    setForm({ name: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (loc) => {
    setEditingLoc(loc);
    setForm({ name: loc.name, description: loc.description || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.admin.deleteLocation(id);
      loadLocations(selectedEvent);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Locations</h1>
          <p className="text-text-secondary mt-1">Manage physical campus locations for tasks</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            className="input" 
            value={selectedEvent} 
            onChange={e => setSelectedEvent(e.target.value)}
          >
            <option value="" disabled>Select Event</option>
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button onClick={openNew} disabled={!selectedEvent} className="btn btn-primary gap-2 flex-shrink-0">
            <Plus size={18} /> Add Location
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-text-muted">Loading locations...</div>
      ) : locations.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-bg-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin size={24} className="text-text-muted" />
          </div>
          <p className="text-text-secondary">No locations found for this event. Add locations to attach them to tasks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div key={loc.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <MapPin size={18} className="text-accent" /> {loc.name}
                  </h3>
                  {loc.description && <p className="text-text-secondary text-sm mt-2">{loc.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(loc)} className="p-2 text-text-secondary hover:text-accent">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(loc.id)} className="p-2 text-text-secondary hover:text-error">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <h2 className="text-xl font-bold mb-4">{editingLoc ? 'Edit Location' : 'Add Location'}</h2>
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="label">Location Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Main Library Atrium"
                />
              </div>
              <div className="mb-6">
                <label className="label">Description / Instructions (Optional)</label>
                <textarea
                  className="input min-h-[100px] resize-none"
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Details for organizers..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
