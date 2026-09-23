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
  const isQuestionsRound = currentRound?.roundType === 'questions';
  const qualifiedRound = data?.rounds?.find(r => r.isQualified === true && r.status === 'completed');
  const eliminatedRound = data?.rounds?.find(r => r.isQualified === false && r.status === 'completed');
  const activeStartingClue = tasks.find(t => t.startingClue)?.startingClue;
  const firstAssignedToken = tasks.find(t => t.firstTaskToken)?.firstTaskToken || null;

  const total = currentRound?.totalTasks > 0 ? currentRound.totalTasks : 1;
  const progress = currentRound ? (currentRound.teamTasksCompleted / total) * 100 : 0;
  const questionsState = data?.round2State;

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

      {/* Questions Round CTA */}
      {currentRound && eventStatus === 'active' && isQuestionsRound && !eliminatedRound && (
        <div className="mx-5 mb-4 animate-fade-in-up">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Current Round</p>
                <h2 className="text-lg font-bold text-text-primary">{currentRound.name}</h2>
              </div>
              <span className="badge badge-success">Live</span>
            </div>
            {questionsState && (
              questionsState?.allCompleted ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-success animate-checkmark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-text-primary mb-1">Round Completed</h3>
                  <p className="text-text-secondary text-sm mb-4">
                    {questionsState.config?.explanationText || 'You have answered all questions in this round.'}
                  </p>
                  {questionsState.config?.whatsappLink && (
                    <a
                      href={questionsState.config.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-full gap-3"
                      style={{ background: '#25D366', color: '#fff', border: 'none' }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Join WhatsApp Group
                    </a>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <h4 className="font-semibold text-text-primary text-sm">Round Progress</h4>
                    <p className="text-text-muted text-xs">Questions</p>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${questionsState.totalQuestions > 0 ? (questionsState.completedQuestions / questionsState.totalQuestions) * 100 : 0}%` }}></div>
                  </div>
                </div>
              )
            )}

            {!questionsState?.allCompleted && (
              <button
                onClick={() => router.push('/team/round2')}
                className="btn btn-primary btn-full btn-lg gap-3 mt-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
                {questionsState?.completedQuestions > 0 ? 'Continue Round 2' : 'Start Round 2'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Task List — Round 1 only */}
      {currentRound && currentRound.status === 'active' && !isQuestionsRound && !eliminatedRound && (
        <div className="mx-5 mb-4">
          {activeStartingClue && firstAssignedToken ? (
            <div className="card p-6 text-center animate-fade-in border-2 border-accent/30 bg-accent-light/10">
              <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Your First Destination</h3>
              <p className="text-text-secondary mb-4">{activeStartingClue}</p>
              <button
                onClick={() => window.location.href = `/team/task/${firstAssignedToken}`}
                className="btn btn-primary btn-full btn-lg gap-3"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                Go to First Task
              </button>
            </div>
          ) : firstAssignedToken && !activeStartingClue ? (
            <div className="card p-6 text-center animate-fade-in border-2 border-accent/30 bg-accent-light/10">
              <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Your Task is Ready!</h3>
              <p className="text-text-secondary mb-4">Your first task has been assigned. Tap below to start.</p>
              <button
                onClick={() => window.location.href = `/team/task/${firstAssignedToken}`}
                className="btn btn-primary btn-full btn-lg gap-3"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                Go to First Task
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Tasks</h3>
              <div className="space-y-2 stagger-children">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`card p-4 flex items-center gap-3 ${task.isCompleted ? 'opacity-70' : task.isUnlocked ? 'card-interactive cursor-pointer' : 'opacity-40'}`}
                    onClick={() => {
                      if (task.isUnlocked && !task.isCompleted) {
                        if (task.firstTaskToken) {
                          window.location.href = `/team/task/${task.firstTaskToken}`;
                        } else {
                          router.push(`/team/scan`);
                        }
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
                        {task.isCompleted ? 'Completed' : task.isUnlocked ? (task.firstTaskToken ? 'Tap to start' : 'Scan QR to start') : 'Locked'}
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
            </>
          )}
        </div>
      )}

      {/* Scan QR CTA — Round 1 only */}
      {currentRound && currentRound.status === 'active' && !isQuestionsRound && !eliminatedRound && (
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
