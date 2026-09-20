'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function ProgressPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const res = await api.team.getProgress();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 space-y-4">
        <div className="skeleton h-8 w-32"></div>
        <div className="skeleton h-40 w-full"></div>
        <div className="skeleton h-40 w-full"></div>
      </div>
    );
  }

  const rounds = data?.rounds || [];

  return (
    <div className="pb-4">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-text-primary">Progress</h1>
        <p className="text-text-secondary text-sm">Your event journey</p>
      </div>

      <div className="px-5 space-y-4 stagger-children">
        {rounds.map((round) => {
          const progress = round.totalTasks > 0 ? (round.tasksCompleted / round.totalTasks) * 100 : 0;

          return (
            <div key={round.id} className="card p-5">
              {/* Round Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Round {round.roundNumber}</p>
                  <h3 className="text-base font-bold text-text-primary">{round.name}</h3>
                </div>
                <span className={`badge ${
                  round.status === 'active' ? 'badge-success' :
                  round.status === 'completed' ? 'badge-neutral' :
                  'badge-warning'
                }`}>
                  {round.status === 'active' ? 'Active' : round.status === 'completed' ? 'Ended' : 'Pending'}
                </span>
              </div>

              {/* Score & Progress */}
              <div className="flex items-center gap-6 mb-3">
                <div>
                  <p className="text-xl font-bold text-accent">{round.score}</p>
                  <p className="text-text-muted text-xs">Points</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-text-primary">{round.tasksCompleted}<span className="text-text-muted text-sm">/{round.totalTasks}</span></p>
                  <p className="text-text-muted text-xs">Tasks</p>
                </div>
              </div>

              <div className="progress-bar mb-2">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>

              {/* Qualification Status */}
              {round.isQualified === true && (
                <div className="mt-3 p-3 rounded-lg bg-success-light flex items-center gap-2">
                  <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-success text-sm font-semibold">Qualified for next round!</p>
                </div>
              )}
              {round.isQualified === false && (
                <div className="mt-3 p-3 rounded-lg bg-error-light flex items-center gap-2">
                  <svg className="w-5 h-5 text-error flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-error text-sm font-semibold">Did not qualify</p>
                </div>
              )}

              {/* Task List */}
              {round.tasks && round.tasks.length > 0 && (
                <div className="mt-4 space-y-2">
                  {round.tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 py-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        task.isCompleted ? 'bg-success-light text-success' : task.isUnlocked ? 'bg-accent-light text-accent' : 'bg-bg-hover text-text-muted'
                      }`}>
                        {task.isCompleted ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : task.isUnlocked ? (
                          task.taskOrder
                        ) : (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.isCompleted ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{task.title}</p>
                        <p className="text-text-muted text-xs">{task.points} pts · {task.attempts} attempts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {rounds.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary">No rounds available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
