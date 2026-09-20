'use client';

import { useState, useEffect, use } from 'react';
import api from '@/lib/api';
import { Plus, Trash2, Edit, ChevronLeft, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RoundConfigPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [round, setRound] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

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
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const res = await api.admin.getRound(id);
      setRound(res.data.round);
      setTasks(res.data.tasks);

      // Load locations for the event
      if (res.data.round.eventId) {
        const locRes = await api.admin.getLocations(res.data.round.eventId);
        setLocations(locRes.data);
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
      title: `Task ${tasks.length + 1}`,
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

  if (loading) return <div className="p-8 text-center text-text-muted">Loading round...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link href={`/admin/events/${round?.eventId}`} className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-accent mb-4 transition-colors">
          <ChevronLeft size={16} className="mr-1" /> Back to Event
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{round?.name} Tasks</h1>
            <p className="text-text-secondary mt-1">Configure tasks and questions for this round</p>
          </div>
          <button onClick={openNewTask} className="btn btn-primary gap-2">
            <Plus size={18} /> Add Task
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="card p-12 text-center text-text-secondary">
            No tasks created yet. Teams cannot progress without tasks.
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
                    <span className="flex items-center gap-1"><MapPin size={14} /> {task.locationHint || 'No next location hint'}</span>
                    <span>{task.points} pts</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button 
                    onClick={() => openEditTask(task)}
                    className="btn btn-secondary btn-sm p-2"
                    title="Edit Task"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="btn btn-secondary btn-sm p-2 text-error hover:text-error hover:border-error"
                    title="Delete Task"
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
            <h2 className="text-xl font-bold mb-4">{editingTask ? 'Edit Task' : 'Create Task'}</h2>
            <form onSubmit={handleSaveTask}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Task Order / Step</label>
                  <input type="number" min="1" className="input" required value={taskForm.taskOrder} onChange={e => setTaskForm({...taskForm, taskOrder: e.target.value})} />
                </div>
                <div>
                  <label className="label">Title</label>
                  <input type="text" className="input" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="e.g. The Library Riddle" />
                </div>
              </div>

              <div className="mb-4">
                <label className="label">Question to Solve</label>
                <textarea className="input min-h-[80px]" required value={taskForm.question} onChange={e => setTaskForm({...taskForm, question: e.target.value})} placeholder="Enter the riddle or question..." />
              </div>

              <div className="mb-4">
                <label className="label">Correct Answer</label>
                <input type="text" className="input font-mono bg-success-light/30 border-success/30" required value={taskForm.correctAnswer} onChange={e => setTaskForm({...taskForm, correctAnswer: e.target.value})} placeholder="Exact answer text" />
                <p className="text-xs text-text-muted mt-1">Answers are checked case-insensitively by default.</p>
              </div>

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

              <div className="flex gap-3 justify-end mt-6">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
