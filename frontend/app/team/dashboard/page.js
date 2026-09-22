'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

export default function TeamDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.team.getDashboard();
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
        <div className="skeleton h-8 w-40"></div>
        <div className="skeleton h-24 w-full"></div>
        <div className="skeleton h-16 w-full"></div>
        <div className="skeleton h-16 w-full"></div>
      </div>
    );
  }

  const currentRound = data?.currentRound;
  const tasks = data?.tasks || [];
  const eventStatus = data?.event?.status;
  const progress = currentRound ? (currentRound.teamTasksCompleted / (currentRound.totalTasks || 1)) * 100 : 0;
  const isRound2 = currentRound?.roundType === 'questions';
  const round2State = data?.round2State;

  // Check qualification status
  const qualifiedRound = data?.rounds?.find(r => r.isQualified === true && r.status === 'completed');
  const eliminatedRound = data?.rounds?.find(r => r.isQualified === false && r.status === 'completed');

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Welcome back</p>
            <h1 className="text-xl font-bold text-text-primary">{user?.teamName || 'Team'}</h1>
          </div>
          <button
            onClick={logout}
            className="w-9 h-9 rounded-full bg-bg-hover flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
        <p className="text-text-muted text-xs font-mono">{user?.teamId}</p>
      </div>

      {/* Event Status */}
      {(!eventStatus || eventStatus === 'draft') && (
        <div className="mx-5 mb-4 p-4 card text-center animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-warning-light flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-text-primary mb-1">Event Not Started</h3>
          <p className="text-text-secondary text-sm">The event hasn't started yet. Please wait for the organizer.</p>
        </div>
      )}

      {eventStatus === 'paused' && (
        <div className="mx-5 mb-4 p-4 card text-center bg-warning-light border-warning/20 animate-fade-in">
          <h3 className="font-semibold text-warning mb-1">Event Paused</h3>
          <p className="text-warning/70 text-sm">The event is temporarily paused. Please wait.</p>
        </div>
      )}

      {/* Current Round Card */}
      {currentRound && eventStatus === 'active' && (
        <div className="mx-5 mb-4 card p-5 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Current Round</p>
              <h2 className="text-lg font-bold text-text-primary">{currentRound.name}</h2>
            </div>
            <span className={`badge ${currentRound.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
              {currentRound.status === 'active' ? 'Live' : currentRound.status}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-6 mb-4">
            <div>
              <p className="text-2xl font-bold text-accent">{currentRound.teamScore}</p>
              <p className="text-text-muted text-xs">Points</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{currentRound.teamTasksCompleted}<span className="text-text-muted text-base">/{currentRound.totalTasks}</span></p>
              <p className="text-text-muted text-xs">Tasks</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-text-muted text-xs mt-2">{Math.round(progress)}% completed</p>
        </div>
      )}

      {/* Qualification Banner */}
      {eliminatedRound && (
        <div className="mx-5 mb-4 card p-5 text-center animate-fade-in-up">
          <p className="text-lg font-bold text-text-primary mb-1">Round Completed</p>
          <p className="text-text-secondary text-sm">Your team did not qualify for the next round.</p>
          <p className="text-text-muted text-xs mt-2">Thank you for participating!</p>
        </div>
      )}

      {/* Round 2 CTA */}
      {currentRound && currentRound.status === 'active' && isRound2 && !eliminatedRound && (
        <div className="mx-5 mb-4 animate-fade-in-up">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Current Round</p>
                <h2 className="text-lg font-bold text-text-primary">{currentRound.name}</h2>
              </div>
              <span className="badge badge-success">Live</span>
            </div>
            {round2State && (
              <div className="mb-4">
                <div className="flex items-center gap-4 mb-2">
                  <p className="text-xl font-bold text-text-primary">{round2State.completedQuestions}<span className="text-text-muted text-sm">/{round2State.totalQuestions}</span></p>
                  <p className="text-text-muted text-xs">Questions</p>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${round2State.totalQuestions > 0 ? (round2State.completedQuestions / round2State.totalQuestions) * 100 : 0}%` }}></div>
                </div>
              </div>
            )}
            <button
              onClick={() => router.push('/team/round2')}
              className="btn btn-primary btn-full btn-lg gap-3 mt-2"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
              {round2State?.completedQuestions > 0 ? 'Continue Round 2' : 'Start Round 2'}
            </button>
          </div>
        </div>
      )}

      {/* Task List — Round 1 only */}
      {currentRound && currentRound.status === 'active' && !isRound2 && (
        <div className="mx-5 mb-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Tasks</h3>
          <div className="space-y-2 stagger-children">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`card p-4 flex items-center gap-3 ${task.isCompleted ? 'opacity-70' : task.isUnlocked ? 'card-interactive cursor-pointer' : 'opacity-40'}`}
                onClick={() => {
                  if (task.isUnlocked && !task.isCompleted) {
                    router.push(`/team/scan`);
                  }
                }}
              >
                {/* Status Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  task.isCompleted ? 'bg-success-light text-success' : task.isUnlocked ? 'bg-accent-light text-accent' : 'bg-bg-hover text-text-muted'
                }`}>
                  {task.isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : task.isUnlocked ? (
                    <span className="text-sm font-bold">{task.taskOrder}</span>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                </div>

                {/* Task Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary text-sm">{task.title}</p>
                  <p className="text-text-muted text-xs">
                    {task.isCompleted ? 'Completed' : task.isUnlocked ? 'Scan QR to start' : 'Locked'}
                    {task.points > 0 && ` · ${task.points} pts`}
                  </p>
                </div>

                {/* Arrow */}
                {task.isUnlocked && !task.isCompleted && (
                  <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan QR CTA — Round 1 only */}
      {currentRound && currentRound.status === 'active' && !isRound2 && !eliminatedRound && (
        <div className="mx-5 mt-6 mb-4">
          <button
            onClick={() => router.push('/team/scan')}
            className="btn btn-primary btn-full btn-lg gap-3"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
            </svg>
            Scan QR Code
          </button>
        </div>
      )}
    </div>
  );
}
