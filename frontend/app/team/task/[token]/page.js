'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function TaskPage({ params }) {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [task, setTask] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.resolve(params).then(p => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (token) {
      loadTask(token);
    }
  }, [token]);

  const loadTask = async (taskToken) => {
    try {
      const res = await api.team.getTask(taskToken);
      setTask(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load task.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim() || submitting) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await api.team.submitAnswer(task.id, answer.trim());
      setResult(res.data);
      if (res.data.isCorrect) {
        setAnswer('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-bg p-5 space-y-4">
        <div className="skeleton h-6 w-24"></div>
        <div className="skeleton h-10 w-48"></div>
        <div className="skeleton h-32 w-full"></div>
        <div className="skeleton h-14 w-full"></div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="min-h-dvh bg-bg flex flex-col items-center justify-center p-5 text-center">
        <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">Cannot Access Task</h2>
        <p className="text-text-secondary text-sm mb-6">{error}</p>
        <button onClick={() => router.push('/team/dashboard')} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Correct answer modal is rendered over the active task view

  // Already completed
  if (task.isCompleted) {
    return (
      <div className="min-h-dvh bg-bg flex flex-col">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => router.push('/team/dashboard')} className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center">
            <svg className="w-4 h-4 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <p className="text-sm text-text-secondary">{task.roundName}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
          <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-2">Already Completed</h2>
          <p className="text-text-secondary text-sm mb-4">You've already completed this task.</p>
          
          {task.locationHint && (
            <div className="card p-4 w-full max-w-sm mb-6">
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Next Location Hint</p>
              <p className="text-text-primary font-medium">"{task.locationHint}"</p>
            </div>
          )}

          <button onClick={() => router.push('/team/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Active task view
  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-center gap-3">
        <button onClick={() => router.push('/team/dashboard')} className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center">
          <svg className="w-4 h-4 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <p className="text-sm text-text-secondary">{task.roundName}</p>
        <div className="ml-auto">
          <span className="badge badge-accent">{task.progress.completed}/{task.progress.total}</span>
        </div>
      </div>

      {/* Task Content */}
      <div className="flex-1 px-5 py-4">
        <div className="animate-fade-in-up">
          {/* Task Title */}
          <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-1">Task {task.taskOrder}</p>
          <h1 className="text-xl font-bold text-text-primary mb-6">{task.title}</h1>

          {/* Question */}
          <div className="card p-5 mb-6">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Question</p>
            <p className="text-text-primary text-lg leading-relaxed font-medium">{task.question}</p>
          </div>

          {/* Points */}
          <div className="flex items-center gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              <span>{task.points} points</span>
            </div>
            {task.attemptsRemaining !== null && (
              <div className="flex items-center gap-2 text-text-secondary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                <span>{task.attemptsRemaining} attempts left</span>
              </div>
            )}
          </div>

          {/* Answer Form */}
          <form onSubmit={handleSubmit}>
            <label className="label" htmlFor="answer">Your Answer</label>
            <input
              id="answer"
              type="text"
              className="input input-lg mb-4"
              placeholder="Enter your answer"
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setResult(null); setError(''); }}
              autoFocus
              autoComplete="off"
            />

            {/* Wrong Answer Feedback */}
            {result && !result.isCorrect && (
              <div className="p-3 rounded-lg bg-error-light text-error text-sm font-medium mb-4 animate-fade-in flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <p>{result.message}</p>
                  {result.attemptsRemaining !== null && (
                    <p className="text-xs mt-1 opacity-80">{result.attemptsRemaining} attempt{result.attemptsRemaining !== 1 ? 's' : ''} remaining</p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-error-light text-error text-sm font-medium mb-4 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!answer.trim() || submitting}
              className="btn btn-primary btn-full btn-lg"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Checking...
                </span>
              ) : (
                'Submit Answer'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Success Modal Overlay */}
      {result?.isCorrect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up flex flex-col items-center text-center">
            
            {/* Success Icon */}
            <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mb-5 animate-checkmark">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-success mb-2">
              {result.roundComplete ? 'ROUND COMPLETED!' : 'TASK COMPLETED!'}
            </h2>
            <p className="text-accent font-semibold text-lg mb-6">+{result.pointsEarned} points</p>

            {/* Location Hint */}
            {result.locationHint && !result.roundComplete && (
              <div className="w-full bg-bg rounded-xl p-5 mb-6 border border-border shadow-sm">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Next Location Clue</p>
                <p className="text-text-primary font-medium text-lg leading-relaxed">
                  "{result.locationHint}"
                </p>
              </div>
            )}

            {/* Round Complete Message */}
            {result.roundComplete && (
              <div className="w-full bg-bg rounded-xl p-5 mb-6 border border-border shadow-sm">
                <p className="text-text-secondary text-sm">You've successfully completed all tasks in this round. Great job!</p>
              </div>
            )}

            <button
              onClick={() => router.push('/team/dashboard')}
              className="btn btn-primary btn-lg w-full"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
