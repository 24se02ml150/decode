'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Users, CheckCircle, Target, Trophy, Clock } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const res = await api.admin.getOverview();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const {
    totalTeams,
    activeTeams,
    currentEvent,
    currentRound,
    totalTasks,
    completedTasks,
    teamsCompleted,
    teamsQualified,
  } = data || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Overview</h1>
        <p className="text-text-secondary mt-1">Real-time statistics for your QR Campus Hunt</p>
      </div>

      {/* Event Status Banner */}
      {!currentEvent ? (
        <div className="bg-warning-light border border-warning/20 rounded-xl p-6 text-center">
          <h2 className="text-warning font-bold text-lg mb-2">No Event Active</h2>
          <p className="text-warning/80 mb-4">You need to create an event to get started.</p>
          <Link href="/admin/events" className="btn btn-primary">Create Event</Link>
        </div>
      ) : (
        <div className={`card p-6 border-l-4 ${currentEvent.status === 'active' ? 'border-l-success bg-success-light/30' : 'border-l-warning bg-warning-light/30'}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1">Current Event</p>
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                {currentEvent.name}
                <span className={`badge ${currentEvent.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                  {currentEvent.status}
                </span>
              </h2>
            </div>
            
            {currentRound && (
              <div className="text-right">
                <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1">Active Round</p>
                <p className="text-lg font-bold text-text-primary">{currentRound.name}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Teams Stat */}
        <div className="card p-5 hover:-translate-y-1 transition-transform">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Total Teams</p>
              <h3 className="text-3xl font-bold text-text-primary">{totalTeams || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent-light text-accent flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">
            <span className="text-success font-medium">{activeTeams || 0}</span> active
          </p>
        </div>

        {/* Tasks Stat (if round active) */}
        <div className="card p-5 hover:-translate-y-1 transition-transform">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Tasks Completed</p>
              <h3 className="text-3xl font-bold text-text-primary">{completedTasks || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-success-light text-success flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Across {totalTasks || 0} tasks in current round
          </p>
        </div>

        {/* Completion Stat */}
        <div className="card p-5 hover:-translate-y-1 transition-transform">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Teams Finished</p>
              <h3 className="text-3xl font-bold text-text-primary">{teamsCompleted || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-warning-light text-warning flex items-center justify-center">
              <Target size={20} />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Finished current round tasks
          </p>
        </div>

        {/* Qualification Stat */}
        <div className="card p-5 hover:-translate-y-1 transition-transform">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Qualified Teams</p>
              <h3 className="text-3xl font-bold text-text-primary">{teamsQualified || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center">
              <Trophy size={20} />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">
            For the next round
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold text-text-primary mb-4">Live Monitoring</h3>
          <p className="text-sm text-text-secondary mb-6">Track team progress in real-time on the leaderboard.</p>
          <Link href="/admin/results" className="btn btn-secondary w-full">
            View Live Leaderboard
          </Link>
        </div>
        
        <div className="card p-6">
          <h3 className="text-lg font-bold text-text-primary mb-4">Print QR Codes</h3>
          <p className="text-sm text-text-secondary mb-6">Print the QR codes to place at physical locations across campus.</p>
          <Link href="/admin/qr" className="btn btn-secondary w-full">
            Manage QR Codes
          </Link>
        </div>
      </div>
    </div>
  );
}
