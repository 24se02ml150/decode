'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function Round2Page() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { isCorrect, message }
  const [roundId, setRoundId] = useState(null);

  useEffect(() => {
    findAndLoadRound2();
  }, []);

  const findAndLoadRound2 = async () => {
    try {
      // Get dashboard to find the active questions round
      const dashRes = await api.team.getDashboard();
      const currentRound = dashRes.data.currentRound;

      if (!currentRound || currentRound.roundType !== 'questions') {
        // No active Round 2 — check all rounds
        const activeQuestionsRound = dashRes.data.rounds?.find(
          r => r.roundType === 'questions' && r.status === 'active'
        );
        if (activeQuestionsRound) {
          setRoundId(activeQuestionsRound.id);
          await loadRound2(activeQuestionsRound.id);
        } else {
          setLoading(false);
        }
        return;
      }

      setRoundId(currentRound.id);
      await loadRound2(currentRound.id);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const loadRound2 = async (rid) => {
    try {
      const res = await api.team.getRound2(rid);
      setData(res.data);
      setFeedback(null);
      setAnswer('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim() || !data?.currentQuestion) return;

    setSubmitting(true);
    try {
      const res = await api.team.submitAnswer(data.currentQuestion.id, answer.trim());
      const result = res.data;

      if (result.isCorrect) {
        setFeedback({ isCorrect: true, message: 'Correct!' });
      } else {
        setFeedback({ isCorrect: false, message: result.message || 'Incorrect. Try again.' });
        setAnswer('');
      }
    } catch (err) {
      setFeedback({ isCorrect: false, message: err.message || 'Error submitting answer.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    setAnswer('');
    if (roundId) loadRound2(roundId);
  };

  if (loading) {
    return (
      <div className="p-5 space-y-4">
        <div className="skeleton h-8 w-32"></div>
        <div className="skeleton h-40 w-full"></div>
      </div>
    );
  }

  if (!data || !roundId) {
    return (
      <div className="p-5 text-center">
        <div className="card p-8">
          <p className="text-text-secondary">No active Round 2 found.</p>
          <button onClick={() => router.push('/team/dashboard')} className="btn btn-secondary mt-4">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // All questions completed — show explanation + WhatsApp
  if (data.allCompleted) {
    return (
      <div className="pb-4">
        <div className="px-5 pt-6 pb-4">
          <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Round 2</p>
          <h1 className="text-xl font-bold text-text-primary">Completed!</h1>
        </div>

        <div className="mx-5 animate-fade-in-up">
          <div className="card p-6 text-center">
            {/* Success icon */}
            <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success animate-checkmark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-text-primary mb-2">ROUND 2 COMPLETED</h2>

            <p className="text-text-secondary text-sm mb-1">
              {data.completedQuestions}/{data.totalQuestions} questions answered
            </p>

            {/* Explanation text from admin */}
            {data.config?.explanationText && (
              <div className="mt-6 p-4 bg-bg-hover rounded-lg text-left">
                <p className="text-text-primary text-sm whitespace-pre-wrap">{data.config.explanationText}</p>
              </div>
            )}

            {/* WhatsApp button */}
            {data.config?.whatsappLink && (
              <a
                href={data.config.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg btn-full gap-3 mt-6"
                style={{ background: '#25D366' }}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Join WhatsApp Group
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show current question
  const q = data.currentQuestion;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Round 2</p>
        <h1 className="text-xl font-bold text-text-primary">{data.round?.name || 'Round 2'}</h1>
      </div>

      {/* Progress */}
      <div className="mx-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-text-secondary">
            Question {q.questionNumber} of {data.totalQuestions}
          </span>
          <span className="text-sm text-text-muted">
            {data.completedQuestions}/{data.totalQuestions} done
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${(data.completedQuestions / data.totalQuestions) * 100}%` }}></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="mx-5 animate-fade-in-up">
        <div className="card p-6">
          {/* Question */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-text-primary mb-3">{q.title}</h2>
            <div className="p-4 bg-bg-hover rounded-lg border border-border/50">
              <p className="text-text-primary">{q.question}</p>
            </div>
          </div>

          {/* Correct Feedback */}
          {feedback?.isCorrect && (
            <div className="mb-6 p-4 rounded-lg bg-success-light text-center animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-success animate-checkmark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-success font-bold text-lg">✓ Correct</p>
              <button onClick={handleNextQuestion} className="btn btn-primary mt-4">
                {data.completedQuestions + 1 >= data.totalQuestions ? 'View Results' : 'Next Question'}
              </button>
            </div>
          )}

          {/* Wrong Feedback */}
          {feedback && !feedback.isCorrect && (
            <div className="mb-4 p-3 rounded-lg bg-error-light text-error text-sm text-center animate-fade-in">
              {feedback.message}
            </div>
          )}

          {/* Answer Form */}
          {!feedback?.isCorrect && (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="label">Your Answer</label>
                <input
                  type="text"
                  className="input input-lg"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  autoFocus
                  disabled={submitting}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={submitting || !answer.trim()}
              >
                {submitting ? 'Checking...' : 'Submit'}
              </button>
            </form>
          )}

          {/* Points info */}
          {q.points > 0 && (
            <p className="text-text-muted text-xs mt-4 text-center">{q.points} points</p>
          )}
        </div>
      </div>
    </div>
  );
}
