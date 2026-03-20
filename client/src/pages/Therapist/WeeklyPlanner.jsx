import { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { useSearchParams } from 'react-router-dom';
import { FiCheck, FiX, FiCpu, FiTrash2, FiEdit2, FiPlus, FiSave, FiChevronDown, FiList } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function WeeklyPlanner() {
  const { get, put, del } = useApi();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [planDetail, setPlanDetail] = useState(null);

  // Editable state
  const [editableTasks, setEditableTasks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskIdx, setEditingTaskIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  // Add Task Modal state
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

  // Fetch predefined tasks when patient changes
  useEffect(() => {
    if (selectedPatient) {
      setLoadingTasks(true);
      get(`/defects/tasks-for-patient/${selectedPatient}`)
        .then(data => {
          setPredefinedTasks(data.tasks || []);
          setLoadingTasks(false);
        })
        .catch(() => {
          setPredefinedTasks([]);
          setLoadingTasks(false);
        });
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

  // --- Task CRUD ---
  const deleteTask = (idx) => {
    const updated = editableTasks.filter((_, i) => i !== idx);
    setEditableTasks(updated);
    setEditingTaskIdx(null);
  };

  const updateTask = (idx, field, value) => {
    const updated = [...editableTasks];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditableTasks(updated);
  };

  // Selected task object from predefined list
  const selectedTaskObj = useMemo(() => {
    if (!selectedTaskId) return null;
    return predefinedTasks.find(t => String(t.task_id) === String(selectedTaskId)) || null;
  }, [selectedTaskId, predefinedTasks]);

  // Available levels for the selected task
  const availableLevels = useMemo(() => {
    if (!selectedTaskObj) return [];
    return selectedTaskObj.available_levels || Object.keys(selectedTaskObj.levels || {});
  }, [selectedTaskObj]);

  // Prompts for the selected task + level
  const selectedPrompts = useMemo(() => {
    if (!selectedTaskObj || !selectedLevel) return [];
    const levelData = selectedTaskObj.levels?.[selectedLevel];
    if (!levelData) return [];
    return levelData.prompts || [];
  }, [selectedTaskObj, selectedLevel]);

  // Open add modal for a specific day
  const openAddModal = (day) => {
    setAddingToDay(day);
    setSelectedTaskId('');
    setSelectedLevel('easy');
    setReps(3);
    setShowAddModal(true);
    setEditingTaskIdx(null);
  };

  // Add the selected predefined task
  const addPredefinedTask = () => {
    if (!selectedTaskObj || !addingToDay) return;

    const levelData = selectedTaskObj.levels?.[selectedLevel] || {};
    const prompts = levelData.prompts || [];

    const task = {
      therapy_task_id: selectedTaskObj.task_id,
      task_name: selectedTaskObj.task_name,
      category: selectedTaskObj.task_type || '',
      difficulty: selectedLevel,
      interaction_type: selectedTaskObj.task_type || '',
      prompts,
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

  // Handle level change in inline edit — dynamically update exercises
  const handleEditLevelChange = (idx, newLevel) => {
    const task = editableTasks[idx];
    if (!task.therapy_task_id) {
      updateTask(idx, 'difficulty', newLevel);
      return;
    }

    const taskDef = predefinedTasks.find(t => String(t.task_id) === String(task.therapy_task_id));
    if (!taskDef) {
      updateTask(idx, 'difficulty', newLevel);
      return;
    }

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
    if (!window.confirm("Are you sure you want to delete this entire weekly plan? This action cannot be undone.")) return;
    
    setSaving(true);
    try {
      await del(`/plans/${activePlan}`);
      setPlanDetail(null);
      setEditableTasks([]);
      setActivePlan(null);
      setPlans(await get(`/plans/patient/${selectedPatient}`));
    } catch {
      alert("Failed to delete plan.");
    }
    setSaving(false);
  };

  const handleDragStart = (e, taskIdx) => {
    if (!isEditing) return;
    e.dataTransfer.setData('taskIdx', taskIdx);
  };

  const handleDrop = (e, targetDay) => {
    if (!isEditing) return;
    e.preventDefault();
    const taskIdxStr = e.dataTransfer.getData('taskIdx');
    if (taskIdxStr !== null && taskIdxStr !== '') {
      const idx = parseInt(taskIdxStr, 10);
      updateTask(idx, 'day', targetDay);
    }
  };

  const handleDragOver = (e) => {
    if (!isEditing) return;
    e.preventDefault();
  };

  const hasChanges = planDetail && JSON.stringify(editableTasks) !== JSON.stringify(planDetail.plan_data || []);

  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const groupedByDay = {};
  editableTasks.forEach((t, idx) => {
    const d = t.day || 1;
    if (!groupedByDay[d]) groupedByDay[d] = [];
    groupedByDay[d].push({ ...t, _idx: idx });
  });

  // Get available levels for a task in the inline editor
  const getTaskLevels = (task) => {
    if (!task.therapy_task_id) return ['easy', 'medium', 'advanced'];
    const taskDef = predefinedTasks.find(t => String(t.task_id) === String(task.therapy_task_id));
    if (!taskDef) return ['easy', 'medium', 'advanced'];
    return taskDef.available_levels || Object.keys(taskDef.levels || {});
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-4xl font-black uppercase tracking-tight text-black">Weekly Plans</h1>
        <div className="neo-badge bg-neo-secondary -rotate-1">PLANNER</div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left panel */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Patient</CardTitle></CardHeader>
            <CardContent className="p-2">
              <div className="max-h-48 overflow-y-auto space-y-1">
                {patients.map(p => (
                  <button key={p.id} onClick={() => setSelectedPatient(p.id)}
                    className={`w-full text-left px-3 py-2.5 text-sm font-black uppercase transition-all duration-100 border-2 ${
                      selectedPatient === p.id ? 'border-black bg-neo-accent shadow-[3px_3px_0px_0px_#000]' : 'border-transparent text-black/60 hover:border-black hover:bg-neo-muted'
                    }`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Plans</CardTitle></CardHeader>
            <CardContent className="p-2">
              {plans.length === 0 ? (
                <p className="font-bold text-xs text-black/40 px-3 py-2 uppercase">No plans</p>
              ) : (
                <div className="space-y-1">
                  {plans.map(p => (
                    <button key={p.id} onClick={() => loadPlan(p.id)}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-all duration-100 border-2 flex justify-between items-center ${
                        activePlan === p.id ? 'border-black bg-neo-secondary shadow-[3px_3px_0px_0px_#000] font-black' : 'border-transparent font-bold text-black/60 hover:border-black hover:bg-neo-muted'
                      }`}>
                      <span className="uppercase">Week Plan</span>
                      <span className={`neo-badge text-[9px] px-1.5 py-0.5 border-2 shadow-[2px_2px_0px_0px_#000] ${
                        p.status === 'approved' ? 'neo-badge-approved' :
                        p.status === 'rejected' ? 'neo-badge-rejected' : 'neo-badge-pending'
                      }`}>{p.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Plan detail */}
        <div className="col-span-9">
          {!planDetail ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 border-4 border-black bg-neo-muted flex items-center justify-center mx-auto mb-4">
                  <FiCpu className="w-8 h-8 text-black" strokeWidth={3} />
                </div>
                <p className="font-bold text-black/40 uppercase">Select a patient and generate an AI plan</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Actions Bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <p className="font-black uppercase text-black">Status: <span className={`neo-badge ${
                    planDetail.status === 'approved' ? 'neo-badge-approved' :
                    planDetail.status === 'rejected' ? 'neo-badge-rejected' : 'neo-badge-pending'
                  }`}>{planDetail.status}</span></p>
                  {hasChanges && (
                    <span className="neo-badge bg-neo-accent animate-pulse text-[10px]">UNSAVED</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={deletePlan} disabled={saving} variant="destructive" size="sm" className="mr-8 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                    <FiTrash2 className="w-4 h-4 mr-1" strokeWidth={3} /> Delete Plan
                  </Button>
                  {hasChanges && (
                    <Button onClick={saveChanges} disabled={saving} size="sm">
                      <FiSave className="w-4 h-4" strokeWidth={3} /> {saving ? 'Saving...' : 'Save'}
                    </Button>
                  )}
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                      <FiEdit2 className="w-4 h-4" strokeWidth={3} /> Edit Plan
                    </Button>
                  ) : (
                    <Button onClick={() => { setIsEditing(false); setEditingTaskIdx(null); setShowAddModal(false); }} variant="outline" size="sm">
                      <FiX className="w-4 h-4" strokeWidth={3} /> Done Editing
                    </Button>
                  )}
                  {planDetail.status === 'pending' && (
                    <>
                      <Button onClick={handleReject} variant="destructive" size="sm"><FiX className="w-4 h-4" strokeWidth={3} /> Reject</Button>
                      <Button onClick={handleApprove} variant="secondary" size="sm"><FiCheck className="w-4 h-4" strokeWidth={3} /> Approve</Button>
                    </>
                  )}
                </div>
              </div>

              {/* AI Reasoning */}
              {planDetail.ai_reasoning && (
                <div className="bg-neo-muted/30 border-4 border-black shadow-[4px_4px_0px_0px_#000] p-4 mb-4">
                  <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-1">AI Reasoning</p>
                  <p className="font-bold text-sm text-black leading-relaxed">{planDetail.ai_reasoning}</p>
                </div>
              )}

              {/* 7-day grid */}
              <div className="grid grid-cols-7 gap-2">
                {[1,2,3,4,5,6,7].map(day => (
                  <div key={day} className="space-y-2 min-h-[100px] pb-8"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day)}
                  >
                    <div className="text-center text-xs font-black uppercase tracking-widest py-2 border-4 border-black bg-neo-secondary flex items-center justify-center gap-1">
                      {dayNames[day - 1]}
                      {isEditing && (
                        <button onClick={() => openAddModal(day)}
                          className="w-5 h-5 border-2 border-black bg-neo-accent flex items-center justify-center hover:scale-110 transition-transform"
                          title="Add predefined task">
                          <FiPlus className="w-3 h-3" strokeWidth={3} />
                        </button>
                      )}
                    </div>

                    {/* Task cards */}
                    {(groupedByDay[day] || []).map(task => (
                      <div key={task._idx} className="relative group">
                        {editingTaskIdx === task._idx ? (
                          /* Inline edit form */
                          <div className="bg-neo-secondary/30 border-3 border-black shadow-[3px_3px_0px_0px_#000] p-2 space-y-1.5">
                            <p className="text-[11px] font-black uppercase text-black truncate border-2 border-black px-1.5 py-1 bg-white">{task.task_name}</p>
                            <select
                              value={task.difficulty}
                              onChange={e => handleEditLevelChange(task._idx, e.target.value)}
                              className="w-full text-[10px] font-bold border-2 border-black px-1 py-0.5 bg-white uppercase"
                            >
                              {getTaskLevels(task).map(lvl => (
                                <option key={lvl} value={lvl}>{lvl}</option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-black uppercase text-black/60">Reps:</span>
                              <input
                                type="number"
                                value={task.repetitions || 3}
                                onChange={e => updateTask(task._idx, 'repetitions', parseInt(e.target.value) || 1)}
                                min={1}
                                max={10}
                                className="flex-1 text-[10px] font-bold border-2 border-black px-1 py-0.5 bg-white"
                              />
                            </div>
                            {/* Move to different day */}
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-black uppercase text-black/60">Day:</span>
                              <select
                                value={task.day || day}
                                onChange={e => updateTask(task._idx, 'day', parseInt(e.target.value))}
                                className="flex-1 text-[10px] font-bold border-2 border-black px-1 py-0.5 bg-white uppercase"
                              >
                                {[1,2,3,4,5,6,7].map(d => (
                                  <option key={d} value={d}>{dayNames[d-1]}</option>
                                ))}
                              </select>
                            </div>
                            {/* Preview exercises for current level */}
                            {task.prompts && task.prompts.length > 0 && (
                              <div className="bg-white/60 border border-black/20 p-1.5 mt-1">
                                <p className="text-[8px] font-black uppercase text-black/50 mb-1">Exercises ({task.prompts.length})</p>
                                {task.prompts.slice(0, 2).map((pr, pi) => (
                                  <p key={pi} className="text-[8px] font-bold text-black/60 truncate">
                                    {pr.prompt_type === 'warmup' ? '🔥' : '📝'} {pr.display_content || pr.prompt_text || pr.text || `Prompt ${pi + 1}`}
                                  </p>
                                ))}
                              </div>
                            )}
                            <button onClick={() => setEditingTaskIdx(null)}
                              className="w-full text-[10px] font-black uppercase bg-neo-accent border-2 border-black py-1 mt-1 hover:shadow-[2px_2px_0px_0px_#000] transition-all">
                              Done
                            </button>
                          </div>
                        ) : (
                          /* Normal task card */
                          <div 
                            draggable={isEditing}
                            onDragStart={(e) => handleDragStart(e, task._idx)}
                            className={`bg-white border-3 border-black p-2.5 ${isEditing ? 'neo-lift cursor-grab hover:-translate-y-1 active:scale-95 shadow-[4px_4px_0px_0px_#000] transition-all' : 'neo-lift shadow-[3px_3px_0px_0px_#000]'}`}
                          >
                            <p className="text-black text-[11px] font-black uppercase leading-tight">{task.task_name}</p>
                            <p className="text-black/50 text-[9px] font-bold mt-1 uppercase">{task.difficulty} · {task.repetitions || 3}x</p>
                            {task.reason && (
                              <p className="text-black/35 text-[8px] font-bold mt-0.5 leading-snug">{task.reason}</p>
                            )}
                            {/* Edit/Delete buttons */}
                            {isEditing && (
                              <div className="flex gap-1 mt-2 pt-1.5 border-t-2 border-black/10">
                                <button onClick={() => { setEditingTaskIdx(task._idx); setShowAddModal(false); }}
                                  className="flex-1 flex items-center justify-center gap-0.5 text-[9px] font-black uppercase text-black/70 bg-neo-muted border-2 border-black py-0.5 hover:bg-neo-secondary transition-all">
                                  <FiEdit2 className="w-2.5 h-2.5" /> Edit
                                </button>
                                <button onClick={() => deleteTask(task._idx)}
                                  className="flex-1 flex items-center justify-center gap-0.5 text-[9px] font-black uppercase text-red-700 bg-red-50 border-2 border-red-800 py-0.5 hover:bg-red-100 transition-all">
                                  <FiTrash2 className="w-2.5 h-2.5" /> Del
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {!groupedByDay[day] && !isEditing && (
                      <p className="text-black/30 text-[10px] text-center py-4 font-bold uppercase">Rest</p>
                    )}
                    {!groupedByDay[day] && isEditing && (
                      <button onClick={() => openAddModal(day)}
                        className="w-full border-3 border-dashed border-black/30 py-4 text-black/30 text-[10px] font-bold uppercase hover:border-black hover:text-black hover:bg-neo-muted/30 transition-all flex items-center justify-center gap-1">
                        <FiPlus className="w-3 h-3" /> Add
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="bg-neo-secondary border-b-4 border-black px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiList className="w-5 h-5" strokeWidth={3} />
                <h2 className="font-black uppercase text-lg tracking-tight">Add Task — {dayNames[(addingToDay || 1) - 1]}</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-red-50 transition-colors">
                <FiX className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {loadingTasks ? (
                <p className="font-bold text-black/40 uppercase text-center py-8">Loading tasks...</p>
              ) : predefinedTasks.length === 0 ? (
                <p className="font-bold text-black/40 uppercase text-center py-8">No predefined tasks available for this patient</p>
              ) : (
                <>
                  {/* Task Name Dropdown */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-1 block">Task Name</label>
                    <div className="relative">
                      <select
                        value={selectedTaskId}
                        onChange={(e) => {
                          setSelectedTaskId(e.target.value);
                          const task = predefinedTasks.find(t => String(t.task_id) === e.target.value);
                          if (task) {
                            const levels = task.available_levels || Object.keys(task.levels || {});
                            setSelectedLevel(levels[0] || 'easy');
                          }
                        }}
                        className="w-full text-sm font-bold border-3 border-black px-3 py-2.5 bg-white focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] transition-shadow appearance-none cursor-pointer uppercase"
                      >
                        <option value="">— Select a task —</option>
                        {predefinedTasks.map(t => (
                          <option key={t.task_id} value={String(t.task_id)}>
                            {t.task_name} ({t.task_type})
                          </option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 pointer-events-none" />
                    </div>
                  </div>

                  {/* Level Selection */}
                  {selectedTaskObj && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-1 block">Difficulty Level</label>
                      <div className="flex gap-2">
                        {availableLevels.map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => setSelectedLevel(lvl)}
                            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider border-3 border-black transition-all ${
                              selectedLevel === lvl
                                ? 'bg-neo-accent shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                                : 'bg-white hover:bg-neo-muted'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reps */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-1 block">Repetitions</label>
                    <input
                      type="number"
                      value={reps}
                      onChange={e => setReps(parseInt(e.target.value) || 1)}
                      min={1}
                      max={10}
                      className="w-24 text-sm font-bold border-3 border-black px-3 py-2 bg-white focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] transition-shadow"
                    />
                  </div>

                  {/* Exercise Preview */}
                  {selectedPrompts.length > 0 && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-2 block">
                        Exercises Preview ({selectedPrompts.length} prompts)
                      </label>
                      <div className="max-h-48 overflow-y-auto space-y-2 border-3 border-black/20 p-3 bg-neo-muted/20">
                        {selectedPrompts.map((pr, pi) => (
                          <div key={pi} className="bg-white border-2 border-black/15 p-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border ${
                                pr.prompt_type === 'warmup' ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]' : 'bg-[#DBEAFE] border-[#3B82F6] text-[#1E40AF]'
                              }`}>
                                {pr.prompt_type || 'exercise'}
                              </span>
                              {pr.task_mode && (
                                <span className="text-[8px] font-bold text-black/40 uppercase">{pr.task_mode}</span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-black leading-snug">
                              {pr.display_content || pr.prompt_text || pr.text || `Prompt ${pi + 1}`}
                            </p>
                            {pr.target_response && (
                              <p className="text-[9px] font-bold text-black/40 mt-1">Target: {pr.target_response}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t-4 border-black flex gap-3 justify-end bg-neo-muted/20">
              <Button onClick={() => setShowAddModal(false)} variant="outline" size="sm">
                Cancel
              </Button>
              <Button onClick={addPredefinedTask} disabled={!selectedTaskObj} size="sm">
                <FiPlus className="w-4 h-4" strokeWidth={3} /> Add Task
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
