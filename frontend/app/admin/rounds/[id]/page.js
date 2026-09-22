'use client';

import { useState, useEffect, use } from 'react';
import api from '@/lib/api';
import { Plus, Trash2, Edit, ChevronLeft, MapPin, Users, MessageCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RoundConfigPage({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);

  useEffect(() => {
    Promise.resolve(params).then(p => setId(p.id));
  }, [params]);
  const [round, setRound] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [showAssignments, setShowAssignments] = useState(false);

  // Round 2 config state
  const [round2Config, setRound2Config] = useState({ explanationText: '', whatsappLink: '' });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState('');

  // Round settings
  const [roundSettings, setRoundSettings] = useState({ roundType: 'qr_hunt', assignCount: '' });
  const [savingSettings, setSavingSettings] = useState(false);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    taskOrder: 1,
    question: '',
    correctAnswer: '',
    locationId: '',
    locationHint: '',
    points: 10,
    maxAttempts: '',
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const res = await api.admin.getRound(id);
      setRound(res.data.round);
      setTasks(res.data.tasks);
      setRoundSettings({
        roundType: res.data.round.roundType || 'qr_hunt',
        assignCount: res.data.round.assignCount || '',
      });

      // Load locations for the event
      if (res.data.round.eventId) {
        const locRes = await api.admin.getLocations(res.data.round.eventId);
        setLocations(locRes.data);
      }

      // Load Round 2 config if questions type
      if (res.data.round.roundType === 'questions') {
        try {
          const cfgRes = await api.admin.getRound2Config(id);
          setRound2Config({
            explanationText: cfgRes.data.explanationText || '',
            whatsappLink: cfgRes.data.whatsappLink || '',
          });
        } catch (e) { /* no config yet */ }
      }

      // Load assignments if qr_hunt with assignCount
      if (res.data.round.roundType === 'qr_hunt' && res.data.round.assignCount) {
        try {
          const aRes = await api.admin.getRoundAssignments(id);
          setAssignments(aRes.data);
        } catch (e) { /* no assignments yet */ }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load round details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...taskForm,
        roundId: parseInt(id),
        taskOrder: parseInt(taskForm.taskOrder),
        points: parseInt(taskForm.points),
        locationId: taskForm.locationId ? parseInt(taskForm.locationId) : null,
        maxAttempts: taskForm.maxAttempts ? parseInt(taskForm.maxAttempts) : null,
      };

      if (editingTask) {
        await api.admin.updateTask(editingTask.id, payload);
      } else {
        await api.admin.createTask(payload);
      }
      
      setShowTaskModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openNewTask = () => {
    setEditingTask(null);
    setTaskForm({
      title: roundSettings.roundType === 'questions' ? `Question ${tasks.length + 1}` : `Task ${tasks.length + 1}`,
      taskOrder: tasks.length + 1,
      question: '',
      correctAnswer: '',
      locationId: '',
      locationHint: '',
      points: 10,
      maxAttempts: '',
    });
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title || '',
      taskOrder: task.taskOrder,
      question: task.question,
      correctAnswer: task.correctAnswer,
      locationId: task.locationId || '',
      locationHint: task.locationHint || '',
      points: task.points,
      maxAttempts: task.maxAttempts || '',
    });
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task? The associated QR code will also be deleted.')) return;
    try {
      await api.admin.deleteTask(taskId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteRound = async () => {
    if (!confirm('Are you sure you want to delete this round? All tasks inside will also be deleted.')) return;
    try {
      await api.admin.deleteRound(id);
      router.push(`/admin/events/${round.eventId}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveRoundSettings = async () => {
    setSavingSettings(true);
    try {
      await api.admin.updateRound(id, {
        roundType: roundSettings.roundType,
        assignCount: roundSettings.assignCount ? parseInt(roundSettings.assignCount) : null,
      });
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveRound2Config = async () => {
    setSavingConfig(true);
    setConfigMessage('');
    try {
      await api.admin.updateRound2Config(id, round2Config);
      setConfigMessage('Round 2 config saved!');
      setTimeout(() => setConfigMessage(''), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-text-muted">Loading round...</div>;

  const isQuestions = roundSettings.roundType === 'questions';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link href={`/admin/events/${round?.eventId}`} className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-accent mb-4 transition-colors">
          <ChevronLeft size={16} className="mr-1" /> Back to Event
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{round?.name} {isQuestions ? 'Questions' : 'Tasks'}</h1>
            <p className="text-text-secondary mt-1">Configure {isQuestions ? 'questions' : 'tasks'} for this round</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDeleteRound} 
              className="btn btn-secondary text-error hover:border-error hover:bg-error-light/10"
              title="Delete Round"
            >
              <Trash2 size={18} className="mr-2" /> Delete Round
            </button>
            <button onClick={openNewTask} className="btn btn-primary gap-2">
              <Plus size={18} /> Add {isQuestions ? 'Question' : 'Task'}
            </button>
          </div>
        </div>
      </div>

      {/* Round Type Settings */}
      <div className="card p-5">
        <h2 className="text-lg font-bold text-text-primary mb-4">Round Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Round Type</label>
            <select
              className="input"
              value={roundSettings.roundType}
              onChange={e => setRoundSettings({ ...roundSettings, roundType: e.target.value })}
            >
              <option value="qr_hunt">QR Hunt (Round 1)</option>
              <option value="questions">Questions Only (Round 2)</option>
            </select>
          </div>
          {roundSettings.roundType === 'qr_hunt' && (
            <div>
              <label className="label">Assign Count (Random)</label>
              <input
                type="number"
                min="1"
                className="input"
                placeholder="Leave empty for all tasks"
                value={roundSettings.assignCount}
                onChange={e => setRoundSettings({ ...roundSettings, assignCount: e.target.value })}
              />
              <p className="text-xs text-text-muted mt-1">Each team gets this many random tasks</p>
            </div>
          )}
          <div className="flex items-end">
            <button onClick={handleSaveRoundSettings} className="btn btn-secondary" disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Round 2 Config Panel */}
      {isQuestions && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-accent" />
            <h2 className="text-lg font-bold text-text-primary">Round 2 Config</h2>
          </div>
          {configMessage && (
            <div className="p-3 mb-4 rounded-lg bg-success-light text-success text-sm">{configMessage}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="label">Explanation Text (shown after all questions completed)</label>
              <textarea
                className="input min-h-[120px]"
                value={round2Config.explanationText}
                onChange={e => setRound2Config({ ...round2Config, explanationText: e.target.value })}
                placeholder="Enter explanation text that teams will see after completing all questions..."
              />
            </div>
            <div>
              <label className="label">WhatsApp Group Link</label>
              <input
                type="url"
                className="input"
                value={round2Config.whatsappLink}
                onChange={e => setRound2Config({ ...round2Config, whatsappLink: e.target.value })}
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
            <button onClick={handleSaveRound2Config} className="btn btn-primary gap-2" disabled={savingConfig}>
              <MessageCircle size={18} />
              {savingConfig ? 'Saving...' : 'Save Round 2 Config'}
            </button>
          </div>
        </div>
      )}

      {/* Team Assignments (Round 1 with assignCount) */}
      {!isQuestions && round?.assignCount && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-accent" />
              <h2 className="text-lg font-bold text-text-primary">Team Assignments</h2>
              <span className="badge badge-accent">{assignments.length} teams</span>
            </div>
            <button
              onClick={() => setShowAssignments(!showAssignments)}
              className="btn btn-secondary btn-sm"
            >
              {showAssignments ? 'Hide' : 'Show'} Assignments
            </button>
          </div>
          {assignments.length === 0 && (
            <p className="text-text-secondary text-sm">No assignments yet. Start the round to auto-generate random assignments.</p>
          )}
          {showAssignments && assignments.length > 0 && (
            <div className="space-y-3 mt-4">
              {assignments.map((team) => (
                <div key={team.teamId} className="bg-bg-hover rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-text-primary">{team.teamName}</span>
                    <span className="text-xs font-mono text-text-muted">{team.teamIdCode}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {team.tasks.map((t) => (
                      <span key={t.taskId} className="badge badge-accent">
                        #{t.taskOrder} {t.taskTitle}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks/Questions List */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="card p-12 text-center text-text-secondary">
            No {isQuestions ? 'questions' : 'tasks'} created yet.
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="card p-0 overflow-hidden flex flex-col md:flex-row">
              <div className="bg-bg-hover w-full md:w-16 flex items-center justify-center p-3 md:p-0 border-b md:border-b-0 md:border-r border-border">
                <span className="text-lg font-bold text-text-secondary">#{task.taskOrder}</span>
              </div>
              
              <div className="p-5 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-primary mb-1">{task.title}</h3>
                  <div className="bg-bg-hover/50 p-3 rounded-lg border border-border/50 mb-3">
                    <p className="text-sm font-medium text-text-primary italic">"{task.question}"</p>
                    <p className="text-xs text-success font-bold mt-1">A: {task.correctAnswer}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium text-text-secondary">
                    {!isQuestions && (
                      <span className="flex items-center gap-1"><MapPin size={14} /> {task.locationHint || 'No next location hint'}</span>
                    )}
                    <span>{task.points} pts</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button 
                    onClick={() => openEditTask(task)}
                    className="btn btn-secondary btn-sm p-2"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="btn btn-secondary btn-sm p-2 text-error hover:text-error hover:border-error"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <h2 className="text-xl font-bold mb-4">{editingTask ? 'Edit' : 'Create'} {isQuestions ? 'Question' : 'Task'}</h2>
            <form onSubmit={handleSaveTask}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">{isQuestions ? 'Question' : 'Task'} Order / Step</label>
                  <input type="number" min="1" className="input" required value={taskForm.taskOrder} onChange={e => setTaskForm({...taskForm, taskOrder: e.target.value})} />
                </div>
                <div>
                  <label className="label">Title</label>
                  <input type="text" className="input" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder={isQuestions ? 'e.g. History Question' : 'e.g. The Library Riddle'} />
                </div>
              </div>

              <div className="mb-4">
                <label className="label">{isQuestions ? 'Question' : 'Question to Solve'}</label>
                <textarea className="input min-h-[80px]" required value={taskForm.question} onChange={e => setTaskForm({...taskForm, question: e.target.value})} placeholder={isQuestions ? 'Enter the question...' : 'Enter the riddle or question...'} />
              </div>

              <div className="mb-4">
                <label className="label">Correct Answer</label>
                <input type="text" className="input font-mono bg-success-light/30 border-success/30" required value={taskForm.correctAnswer} onChange={e => setTaskForm({...taskForm, correctAnswer: e.target.value})} placeholder="Exact answer text" />
                <p className="text-xs text-text-muted mt-1">Answers are checked case-insensitively by default.</p>
              </div>

              {!isQuestions && (
                <div className="border-t border-border my-4 pt-4">
                  <h3 className="font-semibold text-text-primary mb-3">Rewards & Next Step</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="label">Points Awarded</label>
                      <input type="number" min="0" className="input" required value={taskForm.points} onChange={e => setTaskForm({...taskForm, points: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">Next Location Hint (Optional)</label>
                      <input type="text" className="input" value={taskForm.locationHint} onChange={e => setTaskForm({...taskForm, locationHint: e.target.value})} placeholder="Hint for the next QR code..." />
                    </div>
                  </div>
                </div>
              )}

              {isQuestions && (
                <div className="border-t border-border my-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="label">Points Awarded</label>
                      <input type="number" min="0" className="input" required value={taskForm.points} onChange={e => setTaskForm({...taskForm, points: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save {isQuestions ? 'Question' : 'Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
