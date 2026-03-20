import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { FiPlus, FiSearch, FiMoreVertical, FiArrowRight, FiArrowLeft, FiCheck, FiX } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const INITIAL_FORM = {
  name: '', email: '', age: '', gender: '', language: 'English',
  severity: 'moderate', therapist_notes_text: '',
  selected_defects: [], approved_task_ids: [], approved_task_categories: []
};

export default function PatientsList() {
  const { get, post } = useApi();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');

  // --- Wizard state ---
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1=info, 2=defects+tasks, 3=review
  const [form, setForm] = useState(INITIAL_FORM);
  const [availableDefects, setAvailableDefects] = useState([]);
  const [recommendedTasks, setRecommendedTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { get('/therapists/patients').then(setPatients).catch(() => {}); }, []);

  // --- Fetch defects when age changes ---
  const category = form.age ? (parseInt(form.age) >= 18 ? 'adult' : 'child') : '';

  useEffect(() => {
    if (showWizard && category) {
      get(`/defects?category=${category}`).then(setAvailableDefects).catch(() => {});
    }
  }, [showWizard, category]);

  // --- Fetch recommended tasks when selected defects change ---
  const fetchRecommendedTasks = useCallback(async (defectIds) => {
    if (!defectIds.length) { setRecommendedTasks([]); return; }
    setLoadingTasks(true);
    let allTasks = [];
    for (const dId of defectIds) {
      try {
        const res = await get(`/defects/${dId}/recommendations`);
        for (const t of res.therapy_tasks) {
          if (!allTasks.find(existing => existing.task_id === t.task_id)) {
            allTasks.push({ ...t, defect_id: dId, defect_name: res.defect.defect_name });
          }
        }
      } catch {}
    }
    setRecommendedTasks(allTasks);
    // Pre-approve all tasks
    setForm(f => ({
      ...f,
      approved_task_ids: allTasks.map(t => t.task_id),
      approved_task_categories: [...new Set(allTasks.map(t => t.task_category))]
    }));
    setLoadingTasks(false);
  }, [get]);

  // --- Defect toggle handler ---
  const toggleDefect = (defectId) => {
    setForm(f => {
      const exists = f.selected_defects.includes(defectId);
      const newDefects = exists
        ? f.selected_defects.filter(d => d !== defectId)
        : [...f.selected_defects, defectId];
      // Auto-fetch tasks for the new selection
      fetchRecommendedTasks(newDefects);
      return { ...f, selected_defects: newDefects };
    });
  };

  // --- Task approve/remove ---
  const toggleTask = (taskId, taskCategory) => {
    setForm(f => {
      const exists = f.approved_task_ids.includes(taskId);
      const newIds = exists
        ? f.approved_task_ids.filter(id => id !== taskId)
        : [...f.approved_task_ids, taskId];
      // Recalculate categories from currently approved tasks
      const approvedFull = recommendedTasks.filter(t => newIds.includes(t.task_id));
      const cats = [...new Set(approvedFull.map(t => t.task_category))];
      return { ...f, approved_task_ids: newIds, approved_task_categories: cats };
    });
  };

  // --- Navigation ---
  const canGoStep2 = form.name && form.email && form.age;
  const canGoStep3 = form.selected_defects.length > 0;

  // --- Submit ---
  const handleRegister = async () => {
    setSubmitting(true);
    try {
      await post('/therapists/patients', {
        ...form,
        age: parseInt(form.age) || 0,
        approved_task_ids: form.approved_task_ids.map(id => String(id)),
        approved_task_categories: form.approved_task_categories.map(c => String(c)),
      });
      const updated = await get('/therapists/patients');
      setPatients(updated);
      closeWizard();
    } catch {}
    setSubmitting(false);
  };

  const closeWizard = () => {
    setShowWizard(false);
    setWizardStep(1);
    setForm(INITIAL_FORM);
    setAvailableDefects([]);
    setRecommendedTasks([]);
  };

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // --- Get defect name from ID ---
  const getDefectName = (id) => availableDefects.find(d => d.defect_id === id)?.defect_name || id;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-black uppercase tracking-tight text-black">Patients</h1>
          <span className="neo-badge bg-neo-muted rotate-2">{patients.length}</span>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <FiPlus className="w-4 h-4" strokeWidth={3} /> Add Patient
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 w-5 h-5" strokeWidth={3} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="neo-input w-full pl-12" placeholder="SEARCH PATIENTS..." />
      </div>

      {/* Table */}
      <Card className="neo-lift-none">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b-4 border-black bg-neo-secondary/30">
                {['Name', 'Email', 'Age', 'Gender', 'Severity', 'Baseline', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center font-bold text-black/40 uppercase">No patients found</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="border-b-2 border-black hover:bg-neo-secondary/10 transition-colors duration-100 cursor-pointer"
                    onClick={() => navigate(`/therapist/patients/${p.id}`)}>
                    <td className="px-4 py-4 font-black text-black uppercase flex items-center gap-3">
                      <div className="w-8 h-8 border-3 border-black bg-neo-accent flex items-center justify-center font-black text-xs">
                        {p.name?.charAt(0)?.toUpperCase()}
                      </div>
                      {p.name}
                    </td>
                    <td className="px-4 py-4 font-bold text-black/70 text-sm">{p.email}</td>
                    <td className="px-4 py-4 font-bold text-black">{p.age}</td>
                    <td className="px-4 py-4 font-bold text-black uppercase">{p.gender || '—'}</td>

                    <td className="px-4 py-4">
                      <span className={`neo-badge ${
                        p.severity === 'severe' ? 'neo-badge-severe' :
                        p.severity === 'moderate' ? 'neo-badge-moderate' : 'neo-badge-mild'
                      }`}>{p.severity}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`neo-badge ${p.baseline_completed ? 'neo-badge-done' : 'neo-badge-pending'}`}>
                        {p.baseline_completed ? 'DONE' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <button className="w-8 h-8 border-2 border-black flex items-center justify-center hover:bg-neo-muted transition-colors duration-100">
                        <FiMoreVertical strokeWidth={3} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ========== MULTI-STEP WIZARD MODAL ========== */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeWizard}>
          <div className="bg-white border-4 border-black shadow-[16px_16px_0px_0px_#000] w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header with step indicators */}
            <div className="bg-neo-secondary border-b-4 border-black px-6 py-4 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase tracking-tight text-black">Register New Patient</h2>
                <button onClick={closeWizard} className="w-8 h-8 border-2 border-black flex items-center justify-center hover:bg-white/50">
                  <FiX strokeWidth={3} />
                </button>
              </div>
              {/* Step bar */}
              <div className="flex gap-2 mt-3">
                {[
                  { n: 1, label: 'Patient Info' },
                  { n: 2, label: 'Defects & Tasks' },
                  { n: 3, label: 'Review & Register' }
                ].map(s => (
                  <div key={s.n} className={`flex-1 border-2 border-black px-3 py-2 text-center text-xs font-black uppercase tracking-widest transition-colors ${
                    wizardStep === s.n ? 'bg-neo-accent text-black' :
                    wizardStep > s.n ? 'bg-white text-black/60' : 'bg-white/50 text-black/30'
                  }`}>
                    {wizardStep > s.n ? <FiCheck className="inline w-3 h-3 mr-1" strokeWidth={3} /> : null}
                    Step {s.n}: {s.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="p-6 overflow-y-auto flex-1">

              {/* ===== STEP 1: Patient Info ===== */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-1">Full Name *</label>
                      <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required className="neo-input w-full text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-1">Email *</label>
                      <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required className="neo-input w-full text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-1">Age *</label>
                      <input type="number" value={form.age} onChange={e => setForm(p => ({...p, age: e.target.value, selected_defects: [], approved_task_ids: [], approved_task_categories: []}))} required className="neo-input w-full text-sm" />
                      {category && <p className="text-[10px] font-bold text-black/50 mt-1 uppercase">Category: {category}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-1">Gender</label>
                      <select value={form.gender} onChange={e => setForm(p => ({...p, gender: e.target.value}))} className="neo-input w-full text-sm">
                        <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-1">Severity</label>
                      <select value={form.severity} onChange={e => setForm(p => ({...p, severity: e.target.value}))} className="neo-input w-full text-sm">
                        <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 2: Defect Selection + Dynamic Tasks ===== */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  {/* Defect Selection */}
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-black mb-3">Select Clinical Defects ({category})</h3>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border-2 border-black p-3">
                      {availableDefects.map(d => (
                        <label key={d.defect_id}
                          className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition-all ${
                            form.selected_defects.includes(d.defect_id)
                              ? 'border-black bg-neo-accent/30 shadow-[2px_2px_0px_0px_#000]'
                              : 'border-black/20 hover:border-black hover:bg-neo-muted/30'
                          }`}>
                          <input type="checkbox"
                            checked={form.selected_defects.includes(d.defect_id)}
                            onChange={() => toggleDefect(d.defect_id)}
                            className="w-4 h-4 accent-neo-accent border-2 border-black shrink-0" />
                          <div>
                            <p className="font-black text-xs uppercase text-black">{d.defect_name}</p>
                            <p className="text-[10px] text-black/50 font-bold uppercase">{d.defect_type} · {d.defect_id}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-black/40 mt-1 uppercase">{form.selected_defects.length} defect(s) selected</p>
                  </div>

                  {/* Dynamic Task Preview */}
                  {form.selected_defects.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black uppercase tracking-widest text-black">Recommended Therapy Tasks</h3>
                        {loadingTasks && <span className="neo-badge bg-neo-secondary text-[10px] animate-pulse">Loading...</span>}
                      </div>

                      {/* Expected Categories */}
                      {form.approved_task_categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-black/40 mr-1 self-center">Categories:</span>
                          {form.approved_task_categories.map(c => (
                            <span key={c} className="neo-badge bg-neo-muted text-[10px]">{c}</span>
                          ))}
                        </div>
                      )}

                      {/* Task List with checkboxes */}
                      <div className="space-y-2 max-h-52 overflow-y-auto border-2 border-black p-3">
                        {recommendedTasks.length === 0 && !loadingTasks && (
                          <p className="text-sm font-bold text-black/40 text-center py-4 uppercase">No tasks found for selected defects</p>
                        )}
                        {recommendedTasks.map(t => (
                          <label key={t.task_id}
                            className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition-all ${
                              form.approved_task_ids.includes(t.task_id)
                                ? 'border-black bg-white shadow-[2px_2px_0px_0px_#000]'
                                : 'border-black/15 bg-black/5 opacity-60'
                            }`}>
                            <input type="checkbox"
                              checked={form.approved_task_ids.includes(t.task_id)}
                              onChange={() => toggleTask(t.task_id, t.task_category)}
                              className="w-4 h-4 accent-neo-accent border-2 border-black shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-xs uppercase text-black truncate">{t.task_name}</p>
                              <p className="text-[10px] text-black/50 font-bold uppercase">
                                {t.task_category} · {t.interaction_type} · From: {t.defect_name}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <p className="text-[10px] font-bold text-black/40 mt-1 uppercase">
                        {form.approved_task_ids.length}/{recommendedTasks.length} tasks approved — uncheck to remove
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ===== STEP 3: Review & Register ===== */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black">Review Patient Registration</h3>

                  {/* Patient Summary Card */}
                  <div className="border-4 border-black p-5 bg-neo-muted/20">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {[
                        ['Name', form.name], ['Email', form.email], ['Age', form.age],
                        ['Gender', form.gender || '—'], ['Category', category],
                        ['Severity', form.severity]
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-black/10 pb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-black/50">{k}</span>
                          <span className="font-bold text-black uppercase">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Selected Defects */}
                  <div className="border-4 border-black p-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">Selected Defects ({form.selected_defects.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {form.selected_defects.map(id => (
                        <span key={id} className="neo-badge bg-neo-accent text-[10px]">{getDefectName(id)}</span>
                      ))}
                    </div>
                  </div>

                  {/* Approved Tasks */}
                  <div className="border-4 border-black p-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">
                      Approved Tasks ({form.approved_task_ids.length})
                    </h4>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {recommendedTasks.filter(t => form.approved_task_ids.includes(t.task_id)).map(t => (
                        <div key={t.task_id} className="flex items-center gap-2 text-xs">
                          <FiCheck className="w-3 h-3 text-black shrink-0" strokeWidth={3} />
                          <span className="font-bold text-black uppercase truncate">{t.task_name}</span>
                          <span className="text-black/40 font-bold uppercase shrink-0">{t.task_category}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Task Categories */}
                  <div className="border-4 border-black p-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">Therapy Task Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {form.approved_task_categories.map(c => (
                        <span key={c} className="neo-badge bg-neo-secondary text-[10px]">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div className="p-4 border-t-4 border-black flex justify-between shrink-0 bg-white">
              <div>
                {wizardStep > 1 && (
                  <Button variant="outline" onClick={() => setWizardStep(s => s - 1)}>
                    <FiArrowLeft className="w-4 h-4" strokeWidth={3} /> Back
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={closeWizard}>Cancel</Button>
                {wizardStep < 3 ? (
                  <Button
                    onClick={() => setWizardStep(s => s + 1)}
                    disabled={wizardStep === 1 ? !canGoStep2 : !canGoStep3}
                  >
                    Next <FiArrowRight className="w-4 h-4" strokeWidth={3} />
                  </Button>
                ) : (
                  <Button onClick={handleRegister} disabled={submitting}>
                    {submitting ? 'Registering...' : 'Register Patient'} <FiCheck className="w-4 h-4" strokeWidth={3} />
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
