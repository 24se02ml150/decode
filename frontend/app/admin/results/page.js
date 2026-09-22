'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Download, RefreshCw, Trophy, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState('live'); // live, round, full
  const [liveData, setLiveData] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [roundResults, setRoundResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInitialData();
    
    // Auto refresh live data every 15 seconds
    const interval = setInterval(() => {
      if (activeTab === 'live') {
        refreshLiveData();
      }
    }, 15000);
    
    return () => clearInterval(interval);
  }, [activeTab, selectedRound]);

  useEffect(() => {
    if (activeTab === 'round' && selectedRound) {
      loadRoundResults(selectedRound);
    }
  }, [selectedRound, activeTab]);

  const loadInitialData = async () => {
    try {
      // Get rounds for dropdowns
      const eventsRes = await api.admin.getEvents();
      const currentEvent = eventsRes.data.find(e => e.status === 'active') || eventsRes.data[0];
      
      if (currentEvent) {
        const roundsRes = await api.admin.getRounds(currentEvent.id);
        setRounds(roundsRes.data);
        if (roundsRes.data.length > 0) {
          const active = roundsRes.data.find(r => r.status === 'active') || roundsRes.data[roundsRes.data.length - 1];
          setSelectedRound(active.id);
        }
      }

      await refreshLiveData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshLiveData = async () => {
    setRefreshing(true);
    try {
      const res = await api.admin.getLiveProgress(selectedRound);
      setLiveData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadRoundResults = async (roundId) => {
    setLoading(true);
    try {
      const res = await api.admin.getRoundResults(roundId);
      setRoundResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type) => {
    const format = 'csv';
    let url;
    
    if (type === 'teams') {
      window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/reports/teams?format=${format}`, '_blank');
    } else if (type === 'round' && selectedRound) {
      window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/reports/round-results/${selectedRound}?format=${format}`, '_blank');
    } else if (type === 'full') {
      window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/reports/full?format=${format}`, '_blank');
    }
  };

  if (loading && !liveData) return <div className="p-8 text-center">Loading results...</div>;

  // Chart data preparation
  const chartData = liveData?.teamProgress?.slice(0, 10).map(t => ({
    name: t.teamName,
    score: t.score || 0
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Leaderboard & Results</h1>
          <p className="text-text-secondary mt-1">Monitor live progress and export reports</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => refreshLiveData()} 
            className={`btn btn-secondary p-2 ${refreshing ? 'opacity-50' : ''}`}
            title="Refresh"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'live' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          onClick={() => setActiveTab('live')}
        >
          Live Leaderboard
        </button>
        <button
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'round' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          onClick={() => setActiveTab('round')}
        >
          Round Results
        </button>
        <button
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'full' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          onClick={() => setActiveTab('full')}
        >
          Export Reports
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'live' && (
          <div className="space-y-6">
            {/* Top 10 Chart */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Top 10 Teams</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#F1F3F5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#059669' : index === 1 ? '#10B981' : index === 2 ? '#34D399' : '#94A3B8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-border bg-bg-hover flex justify-between items-center">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <Trophy size={18} className="text-warning" /> Overall Standings
                </h3>
                <span className="badge badge-neutral text-xs">Auto-updates</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-card text-text-secondary border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-medium">Rank</th>
                      <th className="px-6 py-3 font-medium">Team Name</th>
                      <th className="px-6 py-3 font-medium">Total Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {liveData?.teamProgress?.map((team, idx) => (
                      <tr key={team.teamId} className={`transition-colors ${idx < 3 ? 'bg-accent-subtle/30' : 'hover:bg-bg-hover/50'}`}>
                        <td className="px-6 py-4 font-bold">
                          {idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                        </td>
                        <td className="px-6 py-4 font-medium text-text-primary">
                          {team.teamName}
                          {!team.isActive && <span className="ml-2 badge badge-error text-[10px]">Inactive</span>}
                        </td>
                        <td className="px-6 py-4 font-bold text-accent">
                          {team.score || 0} pts
                        </td>
                      </tr>
                    ))}
                    {(!liveData?.teamProgress || liveData.teamProgress.length === 0) && (
                      <tr>
                        <td colSpan="3" className="px-6 py-8 text-center text-text-muted">No team data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'round' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <select 
                className="input max-w-xs"
                value={selectedRound || ''}
                onChange={(e) => setSelectedRound(parseInt(e.target.value))}
              >
                <option value="" disabled>Select Round</option>
                {rounds.map(r => (
                  <option key={r.id} value={r.id}>Round {r.roundNumber}: {r.name}</option>
                ))}
              </select>
              <button 
                onClick={() => handleExport('round')}
                disabled={!selectedRound}
                className="btn btn-secondary gap-2"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-hover text-text-secondary border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-medium">Rank</th>
                      <th className="px-6 py-3 font-medium">Team Name</th>
                      <th className="px-6 py-3 font-medium">Score</th>
                      <th className="px-6 py-3 font-medium">Tasks Completed</th>
                      <th className="px-6 py-3 font-medium">Qualified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {roundResults?.results?.map((t, idx) => (
                      <tr key={t.teamId} className="hover:bg-bg-hover/50">
                        <td className="px-6 py-3">{idx + 1}</td>
                        <td className="px-6 py-3 font-medium">{t.teamName}</td>
                        <td className="px-6 py-3 font-bold text-accent">{t.score}</td>
                        <td className="px-6 py-3">{t.tasksCompleted} / {t.totalTasks || liveData.totalTasks || 1}</td>
                        <td className="px-6 py-3">
                          {t.isQualified === true ? (
                            <span className="badge badge-success">Yes</span>
                          ) : t.isQualified === false ? (
                            <span className="badge badge-error">No</span>
                          ) : (
                            <span className="badge badge-neutral">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'full' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-accent-light text-accent rounded-full flex items-center justify-center mb-4">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Teams Roster</h3>
              <p className="text-sm text-text-secondary mb-6">Complete list of all teams, IDs, and statuses.</p>
              <button onClick={() => handleExport('teams')} className="btn btn-primary w-full gap-2 mt-auto">
                <Download size={18} /> Download CSV
              </button>
            </div>
            
            <div className="card p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-accent-light text-accent rounded-full flex items-center justify-center mb-4">
                <Trophy size={24} />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Full Event Report</h3>
              <p className="text-sm text-text-secondary mb-6">Comprehensive data including every team's performance across all rounds.</p>
              <button onClick={() => handleExport('full')} className="btn btn-primary w-full gap-2 mt-auto">
                <Download size={18} /> Download CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
