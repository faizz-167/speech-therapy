import { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Cpu, Trash2, Pencil, Plus, Save, ChevronDown, List } from 'lucide-react';

export default function WeeklyPlanner() {
  const { get, put, del } = useApi();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [planDetail, setPlanDetail] = useState(null);

  const [editableTasks, setEditableTasks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskIdx, setEditingTaskIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addingToDay, setAddingToDay] = useState(null);
  const [predefinedTasks, setPredefinedTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('easy');
  const [reps, setReps] = useState(3);

  useEffect(() => {
    get('/therapists/patients').then(data => {
      setPatients(data);
      if (data.length > 0 && !selectedPatient) setSelectedPatient(data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      get(`/plans/patient/${selectedPatient}`).then(data => {
        setPlans(data);
        const planId = searchParams.get('plan');
        if (planId) loadPlan(planId);
        else if (data.length > 0) loadPlan(data[0].id);
        else { setPlanDetail(null); setEditableTasks([]); }
      }).catch(() => {});
    }
  }, [selectedPatient]);

  useEffect(() => {
    if (selectedPatient) {
      setLoadingTasks(true);
      get(`/defects/tasks-for-patient/${selectedPatient}`)
        .then(data => { setPredefinedTasks(data.tasks || []); setLoadingTasks(false); })
        .catch(() => { setPredefinedTasks([]); setLoadingTasks(false); });
    }
  }, [selectedPatient]);

  const loadPlan = async (planId) => {
    setActivePlan(planId);
    setIsEditing(false);
    setEditingTaskIdx(null);
    setShowAddModal(false);
    try {
      const detail = await get(`/plans/${planId}`);
      setPlanDetail(detail);
      setEditableTasks(detail.plan_data || []);
    } catch {}
  };

  const handleApprove = async () => {
    if (!activePlan) return;
    await put(`/plans/${activePlan}/approve`);
    loadPlan(activePlan);
    setPlans(await get(`/plans/patient/${selectedPatient}`));
  };

  const handleReject = async () => {
    if (!activePlan) return;
    await put(`/plans/${activePlan}/reject`, { therapist_feedback: 'Rejected by therapist' });
    loadPlan(activePlan);
    setPlans(await get(`/plans/patient/${selectedPatient}`));
  };

  const deleteTask = (idx) => {
    setEditableTasks(editableTasks.filter((_, i) => i !== idx));
    setEditingTaskIdx(null);
  };

  const updateTask = (idx, field, value) => {
    const updated = [...editableTasks];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditableTasks(updated);
  };

  const selectedTaskObj = useMemo(() => {
    if (!selectedTaskId) return null;
    return predefinedTasks.find(t => String(t.task_id) === String(selectedTaskId)) || null;
  }, [selectedTaskId, predefinedTasks]);

  const availableLevels = useMemo(() => {
    if (!selectedTaskObj) return [];
    return selectedTaskObj.available_levels || Object.keys(selectedTaskObj.levels || {});
  }, [selectedTaskObj]);

  const selectedPrompts = useMemo(() => {
    if (!selectedTaskObj || !selectedLevel) return [];
    const levelData = selectedTaskObj.levels?.[selectedLevel];
    return levelData?.prompts || [];
  }, [selectedTaskObj, selectedLevel]);

  const openAddModal = (day) => {
    setAddingToDay(day);
    setSelectedTaskId('');
    setSelectedLevel('easy');
    setReps(3);
    setShowAddModal(true);
    setEditingTaskIdx(null);
  };

  const addPredefinedTask = () => {
    if (!selectedTaskObj || !addingToDay) return;
    const levelData = selectedTaskObj.levels?.[selectedLevel] || {};
    const task = {
      therapy_task_id: selectedTaskObj.task_id,
      task_name: selectedTaskObj.task_name,
      category: selectedTaskObj.task_type || '',
      difficulty: selectedLevel,
      interaction_type: selectedTaskObj.task_type || '',
      prompts: levelData.prompts || [],
      difficulty_score: levelData.difficulty_score || (selectedLevel === 'easy' ? 1 : selectedLevel === 'medium' ? 2 : 3),
      reason: `Predefined: ${selectedTaskObj.task_name} (${selectedLevel})`,
      day: addingToDay,
      repetitions: reps
    };
    setEditableTasks([...editableTasks, task]);
    setShowAddModal(false);
    setAddingToDay(null);
    setSelectedTaskId('');
  };

  const handleEditLevelChange = (idx, newLevel) => {
    const task = editableTasks[idx];
    if (!task.therapy_task_id) { updateTask(idx, 'difficulty', newLevel); return; }
    const taskDef = predefinedTasks.find(t => String(t.task_id) === String(task.therapy_task_id));
    if (!taskDef) { updateTask(idx, 'difficulty', newLevel); return; }
    const levelData = taskDef.levels?.[newLevel] || {};
    const updated = [...editableTasks];
    updated[idx] = {
      ...updated[idx],
      difficulty: newLevel,
      prompts: levelData.prompts || [],
      difficulty_score: levelData.difficulty_score || (newLevel === 'easy' ? 1 : newLevel === 'medium' ? 2 : 3),
      reason: `Predefined: ${taskDef.task_name} (${newLevel})`
    };
    setEditableTasks(updated);
  };

  const saveChanges = async () => {
    if (!activePlan) return;
    setSaving(true);
    try {
      await put(`/plans/${activePlan}/edit`, { plan_data: editableTasks });
      await loadPlan(activePlan);
      setPlans(await get(`/plans/patient/${selectedPatient}`));
    } catch {}
    setSaving(false);
  };

  const deletePlan = async () => {
    if (!activePlan) return;
    if (!window.confirm("Delete this entire weekly plan? This cannot be undone.")) return;
    setSaving(true);
    try {
      await del(`/plans/${activePlan}`);
      setPlanDetail(null);
      setEditableTasks([]);
      setActivePlan(null);
      setPlans(await get(`/plans/patient/${selectedPatient}`));
    } catch { alert("Failed to delete plan."); }
    setSaving(false);
  };

  const handleDragStart = (e, taskIdx) => { if (!isEditing) return; e.dataTransfer.setData('taskIdx', taskIdx); };
  const handleDrop = (e, targetDay) => {
    if (!isEditing) return;
    e.preventDefault();
    const idx = parseInt(e.dataTransfer.getData('taskIdx'), 10);
    if (!isNaN(idx)) updateTask(idx, 'day', targetDay);
  };
  const handleDragOver = (e) => { if (isEditing) e.preventDefault(); };

  const hasChanges = planDetail && JSON.stringify(editableTasks) !== JSON.stringify(planDetail.plan_data || []);
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const groupedByDay = {};
  editableTasks.forEach((t, idx) => {
    const d = t.day || 1;
    if (!groupedByDay[d]) groupedByDay[d] = [];
    groupedByDay[d].push({ ...t, _idx: idx });
  });

  const getTaskLevels = (task) => {
    if (!task.therapy_task_id) return ['easy', 'medium', 'advanced'];
    const taskDef = predefinedTasks.find(t => String(t.task_id) === String(task.therapy_task_id));
    if (!taskDef) return ['easy', 'medium', 'advanced'];
    return taskDef.available_levels || Object.keys(taskDef.levels || {});
  };

  const statusStyle = (s) => s === 'approved' ? 'bg-[#FFD93D] text-neo-text border-neo-border' : s === 'rejected' ? 'bg-[#FF6B6B] text-white border-neo-border' : 'bg-neo-bg text-neo-text border-neo-border';

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 pt-8 px-4 pb-16">
      {/* HEADER */}
      <div className="flex items-center gap-6 border-b-8 border-neo-border pb-8">
        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-neo-text leading-none drop-shadow-[4px_4px_0px_var(--color-neo-accent)]">Weekly Plans</h1>
        <span className="bg-neo-text text-neo-bg font-sans text-sm font-black px-4 py-2 uppercase tracking-widest border-4 border-neo-border shadow-[4px_4px_0px_#000] rotate-2">Planner</span>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* LEFT SIDEBAR */}
        <div className="col-span-12 md:col-span-3 flex flex-col gap-8">
          {/* Patient selector */}
          <div className="bg-neo-surface border-4 border-neo-border p-6 shadow-[8px_8px_0px_0px_#000]">
            <p className="font-mono text-sm text-neo-text/60 uppercase font-black tracking-widest mb-4 border-b-4 border-neo-border pb-2 inline-block">Patient</p>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-2 p-1">
              {patients.map(p => (
                <button key={p.id} onClick={() => setSelectedPatient(p.id)}
                  className={`w-full text-left px-4 py-3 font-sans text-sm font-black uppercase tracking-tight transition-all border-4 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-1 active:translate-y-1 active:shadow-none ${
                    selectedPatient === p.id ? 'border-neo-border bg-[#FFD93D] text-neo-text -rotate-1' : 'border-neo-border bg-neo-bg text-neo-text hover:bg-[#C4B5FD]'
                  }`}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Plans list */}
          <div className="bg-neo-surface border-4 border-neo-border p-6 shadow-[8px_8px_0px_0px_#000]">
            <p className="font-mono text-sm text-neo-text/60 uppercase font-black tracking-widest mb-4 border-b-4 border-neo-border pb-2 inline-block">Plans</p>
            {plans.length === 0 ? (
              <p className="font-black text-sm text-neo-text/40 uppercase py-4">No plans</p>
            ) : (
              <div className="flex flex-col gap-3 p-1">
                {plans.map(p => (
                  <button key={p.id} onClick={() => loadPlan(p.id)}
                    className={`w-full text-left px-4 py-3 text-sm transition-all border-4 flex justify-between items-center shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-1 active:shadow-none ${
                      activePlan === p.id ? 'border-neo-border bg-neo-accent font-black text-neo-text rotate-1' : 'border-neo-border bg-neo-bg font-black text-neo-text hover:bg-neo-surface'
                    }`}>
                    <span className="uppercase font-black text-sm tracking-widest">Plan #{p.id}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 border-2 ${statusStyle(p.status)} shadow-[2px_2px_0px_#000]`}>{p.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: PLAN DETAIL */}
        <div className="col-span-12 md:col-span-9">
          {!planDetail ? (
            <div className="bg-neo-bg border-4 border-neo-border p-16 text-center shadow-[12px_12px_0px_0px_#000] flex flex-col items-center justify-center">
              <div className="w-24 h-24 border-4 border-neo-border bg-neo-surface flex items-center justify-center mx-auto mb-8 shadow-[6px_6px_0px_#000] rotate-3 hover:-rotate-3 transition-transform">
                <Cpu size={48} strokeWidth={3} className="text-neo-text" />
              </div>
              <p className="font-black text-neo-text/60 uppercase tracking-widest text-xl">Select a patient to view their therapy plan</p>
            </div>
          ) : (
            <>
              {/* Actions Bar */}
              <div className="flex flex-wrap items-center justify-between mb-8 pb-6 border-b-8 border-neo-border border-dashed gap-6">
                <div className="flex items-center gap-4">
                  <span className="font-black uppercase text-neo-text text-lg">Status:</span>
                  <span className={`text-sm font-black uppercase px-4 py-2 border-4 bg-neo-surface shadow-[4px_4px_0px_#000] -rotate-2 ${statusStyle(planDetail.status)}`}>{planDetail.status}</span>
                  {hasChanges && <span className="bg-[#FF6B6B] text-white text-[12px] font-black uppercase px-4 py-2 border-4 border-neo-border shadow-[4px_4px_0px_#000] rotate-2 animate-pulse">Unsaved Changes</span>}
                </div>
                <div className="flex gap-4 flex-wrap">
                  <button onClick={deletePlan} disabled={saving}
                    className="bg-[#FF6B6B] text-white hover:bg-neo-text hover:text-white border-4 border-neo-border px-6 py-3 text-sm font-black uppercase tracking-widest flex items-center gap-3 disabled:opacity-50 shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-1 active:shadow-none transition-all">
                    <Trash2 size={18} strokeWidth={3} /> Delete
                  </button>
                  {hasChanges && (
                    <button onClick={saveChanges} disabled={saving}
                      className="bg-[#FFD93D] text-neo-text hover:bg-neo-text hover:text-white border-4 border-neo-border px-6 py-3 text-sm font-black uppercase tracking-widest flex items-center gap-3 disabled:opacity-50 shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-1 active:shadow-none transition-all -rotate-1">
                      <Save size={18} strokeWidth={3} /> {saving ? 'Saving...' : 'Save Plan'}
                    </button>
                  )}
                  {!isEditing ? (
                    <button onClick={() => setIsEditing(true)}
                      className="bg-neo-bg text-neo-text hover:bg-neo-surface hover:text-neo-text border-4 border-neo-border px-6 py-3 text-sm font-black uppercase tracking-widest flex items-center gap-3 shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-1 active:shadow-none transition-all">
                      <Pencil size={18} strokeWidth={3} /> Edit Mode
                    </button>
                  ) : (
                    <button onClick={() => { setIsEditing(false); setEditingTaskIdx(null); setShowAddModal(false); }}
                      className="bg-neo-text text-neo-bg hover:bg-[#FFD93D] hover:text-neo-text border-4 border-neo-text px-6 py-3 text-sm font-black uppercase tracking-widest flex items-center gap-3 shadow-[4px_4px_0px_var(--color-neo-accent)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_var(--color-neo-accent)] active:translate-y-1 active:shadow-none transition-all rotate-1">
                      <X size={18} strokeWidth={3} /> Finish Editing
                    </button>
                  )}
                  {planDetail.status === 'pending' && (
                    <>
                      <button onClick={handleReject}
                        className="bg-neo-bg text-[#FF6B6B] hover:bg-[#FF6B6B] hover:text-white border-4 border-neo-border px-6 py-3 text-sm font-black uppercase tracking-widest flex items-center gap-3 shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-1 active:shadow-none transition-all">
                        <X size={18} strokeWidth={3} /> Reject
                      </button>
                      <button onClick={handleApprove}
                        className="bg-[#FFD93D] text-neo-text hover:bg-neo-text hover:text-white border-4 border-neo-border px-6 py-3 text-sm font-black uppercase tracking-widest flex items-center gap-3 shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-1 active:shadow-none transition-all">
                        <Check size={18} strokeWidth={3} /> Approve
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* AI Reasoning */}
              {planDetail.ai_reasoning && (
                <div className="bg-neo-surface border-4 border-neo-border shadow-[8px_8px_0px_#000] p-8 md:p-10 mb-10 -rotate-1 relative">
                  <div className="absolute -top-4 -left-4 bg-neo-bg border-4 border-neo-border px-4 py-2 font-black uppercase shadow-[4px_4px_0px_#000] rotate-[-5deg] tracking-widest">
                    AI Agent Note
                  </div>
                  <p className="font-serif italic font-bold text-lg text-neo-text leading-relaxed pt-2 ml-4 border-l-4 border-neo-accent pl-6">{planDetail.ai_reasoning}</p>
                </div>
              )}

              {/* 7-DAY GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-cols-[repeat(7,minmax(0,1fr))] gap-4">
                {[1,2,3,4,5,6,7].map(day => (
                  <div key={day} className="flex flex-col gap-4 min-h-[160px] pb-8 bg-neo-bg border-4 border-neo-border p-2 shadow-[8px_8px_0px_0px_#000]"
                    onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, day)}>
                    {/* Day header */}
                    <div className="text-center text-sm font-black uppercase tracking-widest py-3 border-4 border-neo-border bg-neo-text text-neo-bg flex items-center justify-center gap-3 shadow-[4px_4px_0px_#000] -translate-y-4 -mx-4 bg-neo-accent text-neo-text rotate-1">
                      {dayNames[day - 1]}
                      {isEditing && (
                        <button onClick={() => openAddModal(day)}
                          className="w-6 h-6 border-2 border-neo-text bg-neo-text text-neo-bg flex items-center justify-center hover:scale-110 transition-transform shadow-[2px_2px_0px_#fff]">
                          <Plus size={16} strokeWidth={4} />
                        </button>
                      )}
                    </div>

                    {/* Task cards */}
                    {(groupedByDay[day] || []).map(task => (
                      <div key={task._idx} className="relative mt-2">
                        {editingTaskIdx === task._idx ? (
                          /* INLINE EDIT */
                          <div className="bg-neo-surface border-4 border-neo-border p-4 flex flex-col gap-3 shadow-[4px_4px_0px_#000] -rotate-1 z-20 absolute top-0 left-0 right-0 w-[200%] md:w-[150%] max-w-sm rounded-none">
                            <p className="text-sm font-black uppercase text-neo-text truncate border-b-4 border-neo-border pb-2 bg-neo-surface">{task.task_name}</p>
                            <select value={task.difficulty} onChange={e => handleEditLevelChange(task._idx, e.target.value)}
                              className="w-full text-xs font-black border-4 border-neo-border px-3 py-2 bg-neo-bg uppercase focus:outline-none shadow-[2px_2px_0px_#000]">
                              {getTaskLevels(task).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                            </select>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-neo-text/70 shrink-0">Reps:</span>
                              <input type="number" value={task.repetitions || 3} onChange={e => updateTask(task._idx, 'repetitions', parseInt(e.target.value) || 1)}
                                min={1} max={10} className="w-full text-xs font-black border-4 border-neo-border px-3 py-2 bg-neo-bg focus:outline-none shadow-[2px_2px_0px_#000]" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-neo-text/70 shrink-0">Day:</span>
                              <select value={task.day || day} onChange={e => updateTask(task._idx, 'day', parseInt(e.target.value))}
                                className="w-full text-xs font-black border-4 border-neo-border px-3 py-2 bg-neo-bg uppercase focus:outline-none shadow-[2px_2px_0px_#000]">
                                {[1,2,3,4,5,6,7].map(d => <option key={d} value={d}>{dayNames[d-1]}</option>)}
                              </select>
                            </div>
                            {task.prompts?.length > 0 && (
                              <div className="bg-neo-bg border-4 border-neo-border p-3 mt-2">
                                <p className="text-[10px] font-black uppercase text-neo-text mb-2 border-b-2 border-neo-border pb-1">Exercises ({task.prompts.length})</p>
                                {task.prompts.slice(0, 2).map((pr, pi) => (
                                  <p key={pi} className="text-[10px] font-bold text-neo-text/80 truncate mb-1 border-l-2 border-neo-accent pl-2">{pr.display_content || pr.prompt_text || `Prompt ${pi + 1}`}</p>
                                ))}
                              </div>
                            )}
                            <button onClick={() => setEditingTaskIdx(null)}
                              className="w-full text-xs font-black uppercase bg-[#FFD93D] border-4 border-neo-border py-3 mt-2 hover:-translate-y-1 hover:shadow-[4px_4px_0px_#000] transition-all shadow-[2px_2px_0px_#000]">
                              Save Updates
                            </button>
                          </div>
                        ) : (
                          /* NORMAL CARD */
                          <div draggable={isEditing} onDragStart={(e) => handleDragStart(e, task._idx)}
                            className={`bg-[#fffff0] border-4 border-neo-border p-4 shadow-[4px_4px_0px_#000] rotate-1 hover:-rotate-1 relative ${isEditing ? 'cursor-grab hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] transition-all' : ''}`}>
                            <div className="w-full h-3 bg-[#FFD93D] border-b-4 border-neo-border absolute top-0 left-0 right-0 mix-blend-multiply opacity-50"></div>
                            <p className="text-neo-text text-sm font-black uppercase leading-tight mt-2 break-words">{task.task_name}</p>
                            <p className="text-neo-text/70 text-xs font-black mt-3 uppercase border-t-2 border-neo-text/10 pt-2">{task.difficulty} <span className="text-neo-accent">•</span> {task.repetitions || 3}x</p>
                            {isEditing && (
                              <div className="flex gap-2 mt-4 pt-3 border-t-4 border-neo-border border-dashed">
                                <button onClick={() => { setEditingTaskIdx(task._idx); setShowAddModal(false); }}
                                  className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase text-neo-text bg-[#C4B5FD] border-2 border-neo-border py-2 hover:bg-neo-surface transition-all shadow-[2px_2px_0px_#000]">
                                  <Pencil size={12} strokeWidth={3} />
                                </button>
                                <button onClick={() => deleteTask(task._idx)}
                                  className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase text-white bg-[#FF6B6B] border-2 border-neo-border py-2 hover:bg-neo-text transition-all shadow-[2px_2px_0px_#000]">
                                  <Trash2 size={12} strokeWidth={3} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {!groupedByDay[day] && !isEditing && (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-neo-text/30 text-xs text-center py-6 font-black uppercase tracking-widest border-4 border-dashed border-neo-border/20 p-4 -rotate-2">Rest Day</p>
                      </div>
                    )}
                    {!groupedByDay[day] && isEditing && (
                      <button onClick={() => openAddModal(day)}
                        className="w-full h-full min-h-[100px] border-4 border-dashed border-neo-text/20 py-6 text-neo-text/40 text-sm font-black uppercase tracking-widest hover:border-neo-text hover:text-neo-text hover:bg-[#FFD93D] hover:shadow-[4px_4px_0px_#000] transition-all flex items-center justify-center gap-2">
                        <Plus size={16} strokeWidth={4} /> Add Task
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ADD TASK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white border-2 border-neo-border w-full max-w-lg mx-4 bh-panel">
            {/* Header */}
            <div className="bg-black text-white border-b-2 border-neo-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <List size={20} strokeWidth={3} />
                <h2 className="font-sans font-black uppercase text-lg tracking-tight">Add Task — {dayNames[(addingToDay || 1) - 1]}</h2>
              </div>
              <button onClick={() => setShowAddModal(false)}
                className="w-8 h-8 border-2 border-white/30 bg-white text-black flex items-center justify-center hover:bg-[#FF2E2E] hover:text-white transition-all">
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 flex flex-col gap-5">
              {loadingTasks ? (
                <p className="font-bold text-black/40 uppercase text-center py-8 tracking-widest">Loading tasks...</p>
              ) : predefinedTasks.length === 0 ? (
                <p className="font-bold text-black/40 uppercase text-center py-8 tracking-widest">No predefined tasks available</p>
              ) : (
                <>
                  {/* Task dropdown */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-1.5 block">Task Name</label>
                    <div className="relative">
                      <select value={selectedTaskId}
                        onChange={(e) => {
                          setSelectedTaskId(e.target.value);
                          const task = predefinedTasks.find(t => String(t.task_id) === e.target.value);
                          if (task) {
                            const levels = task.available_levels || Object.keys(task.levels || {});
                            setSelectedLevel(levels[0] || 'easy');
                          }
                        }}
                        className="w-full text-sm font-bold border-2 border-neo-border px-4 py-3 bg-white focus:outline-none appearance-none cursor-pointer uppercase">
                        <option value="">— Select a task —</option>
                        {predefinedTasks.map(t => (
                          <option key={t.task_id} value={String(t.task_id)}>{t.task_name} ({t.task_type})</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
                    </div>
                  </div>

                  {/* Level buttons */}
                  {selectedTaskObj && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-1.5 block">Difficulty Level</label>
                      <div className="flex gap-2">
                        {availableLevels.map(lvl => (
                          <button key={lvl} onClick={() => setSelectedLevel(lvl)}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-2 border-neo-border transition-all ${
                              selectedLevel === lvl ? 'bg-[#CCFF00] text-black' : 'bg-white hover:bg-neo-surface'
                            }`}>
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reps */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-1.5 block">Repetitions</label>
                    <input type="number" value={reps} onChange={e => setReps(parseInt(e.target.value) || 1)} min={1} max={10}
                      className="w-24 text-sm font-bold border-2 border-neo-border px-4 py-2 bg-white focus:outline-none" />
                  </div>

                  {/* Prompt preview */}
                  {selectedPrompts.length > 0 && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-2 block">
                        Exercises Preview ({selectedPrompts.length} prompts)
                      </label>
                      <div className="max-h-48 overflow-y-auto flex flex-col gap-2 border-2 border-neo-border p-3 bg-neo-surface">
                        {selectedPrompts.map((pr, pi) => (
                          <div key={pi} className="bg-white border border-neo-border p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 border ${
                                pr.prompt_type === 'warmup' ? 'bg-[#CCFF00] border-neo-border text-black' : 'bg-neo-surface border-neo-border text-black'
                              }`}>{pr.prompt_type || 'exercise'}</span>
                              {pr.task_mode && <span className="text-[8px] font-bold text-black/40 uppercase">{pr.task_mode}</span>}
                            </div>
                            <p className="text-[11px] font-bold text-black leading-snug">
                              {pr.display_content || pr.prompt_text || pr.text || `Prompt ${pi + 1}`}
                            </p>
                            {pr.target_response && <p className="text-[9px] font-bold text-black/40 mt-1">Target: {pr.target_response}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t-2 border-neo-border flex gap-3 justify-end bg-neo-surface">
              <button onClick={() => setShowAddModal(false)}
                className="bh-btn bg-white text-black hover:bg-black hover:text-white border-2 border-neo-border px-6 py-2 text-xs font-black uppercase tracking-widest">
                Cancel
              </button>
              <button onClick={addPredefinedTask} disabled={!selectedTaskObj}
                className="bh-btn bg-[#CCFF00] text-black hover:bg-black hover:text-[#CCFF00] border-2 border-neo-border px-6 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
                <Plus size={14} strokeWidth={3} /> Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
