import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatient, getBaselineResults, getProgress, getEmotionTrends, getStreak, getNotes, saveNotes, dismissAlert } from '../../api/patients';
import { ArrowLeft, AlertTriangle, Flame, Save, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingState from '../../components/shared/LoadingState';

const SEVERITY_LABEL = (score) => {
  if (score < 40) return { label: 'Severe', color: 'bg-[#D02020] text-white' };
  if (score < 60) return { label: 'Moderate', color: 'bg-[#F0C020] text-[#121212]' };
  if (score < 80) return { label: 'Mild', color: 'bg-[#1040C0] text-white' };
  return { label: 'Within Normal Limits', color: 'bg-white text-[#121212] border-2 border-[#121212]' };
};

export default function PatientDetails() {
  const { patientId, id } = useParams();
  const pid = patientId || id;
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [tab, setTab] = useState('baseline');
  const [loading, setLoading] = useState(true);

  // Tab data
  const [baseline, setBaseline] = useState(null);
  const [plans, setPlans] = useState([]);
  const [progress, setProgress] = useState(null);
  const [emotions, setEmotions] = useState(null);
  const [streak, setStreak] = useState(null);
  const [notes, setNotes] = useState('');          // current textarea value
  const [latestNote, setLatestNote] = useState(''); // snapshot from backend (for dupe guard)
  const [notesHistory, setNotesHistory] = useState([]);
  const [notesSaving, setNotesSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await getPatient(pid);
        setPatient(p);
      } catch {
        toast.error('Failed to load patient');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pid]);

  // Load tab-specific data
  useEffect(() => {
    if (!pid) return;
    if (tab === 'baseline') {
      getBaselineResults(pid).then(res => {
        const data = Array.isArray(res) ? res[0] : res;
        setBaseline(data);
      }).catch(() => {});
    }
    if (tab === 'plan') {
      import('../../api/plans').then(mod => {
        // Plans loaded via the useApi hook pattern already in the component
      });
    }
    if (tab === 'progress') {
      Promise.allSettled([
        getProgress(pid),
        getEmotionTrends(pid, 30),
        getStreak(pid)
      ]).then(([prog, emo, str]) => {
        if (prog.status === 'fulfilled') setProgress(prog.value);
        if (emo.status === 'fulfilled') setEmotions(emo.value);
        if (str.status === 'fulfilled') setStreak(str.value);
      });
    }
    if (tab === 'notes') {
      getNotes(pid).then(res => {
        const latest = res?.latest ?? '';
        setNotes(latest);
        setLatestNote(latest);
        setNotesHistory(res?.history ?? []);
      }).catch(() => {});
    }
  }, [tab, pid]);

  const handleSaveNotes = async () => {
    if (notes.trim() === latestNote.trim()) {
      toast('No changes to save', { icon: '📝' });
      return;
    }
    setNotesSaving(true);
    try {
      await saveNotes(pid, notes);
      // Move old latest into history, update snapshot
      if (latestNote.trim()) {
        setNotesHistory(prev => [{ id: Date.now(), note_text: latestNote, created_at: new Date().toISOString() }, ...prev]);
      }
      setLatestNote(notes);
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setNotesSaving(false);
    }
  };

  const handleDismissAlert = async (progressId) => {
    try {
      await dismissAlert(progressId);
      setProgress(prev => ({
        ...prev,
        tasks: prev.tasks?.map(t => t.progress_id === progressId ? { ...t, clinician_alert: false } : t)
      }));
      toast.success('Alert dismissed');
    } catch {
      toast.error('Failed to dismiss alert');
    }
  };

  if (loading) return <LoadingState message="LOADING PATIENT..." />;
  if (!patient) return <div className="text-center py-12 font-black uppercase">Patient not found</div>;

  const tabs = ['baseline', 'plan', 'progress', 'notes'];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 mt-2">
      {/* Back button */}
      <button onClick={() => navigate('/therapist/patients')} className="flex items-center gap-2 text-sm font-black uppercase text-neo-muted hover:text-[#121212] transition-colors cursor-pointer w-fit">
        <ArrowLeft size={16} strokeWidth={3} /> Back to Patients
      </button>

      {/* Patient Header */}
      <div className="border-4 border-[#121212] p-6 md:p-8 bg-white shadow-[8px_8px_0px_0px_#121212] flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="w-16 h-16 border-4 border-[#121212] bg-[#F0C020] shadow-[4px_4px_0px_0px_#121212] flex items-center justify-center font-black text-2xl -rotate-2 shrink-0">
          {patient.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-sans font-black uppercase tracking-tight text-[#121212]">{patient.name}</h1>
          <p className="font-mono text-sm text-neo-muted mt-1">
            {patient.age && `${patient.age}y`}{patient.gender && ` · ${patient.gender}`}{patient.email && ` · ${patient.email}`}
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-0 border-4 border-[#121212] inline-flex w-fit">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 text-sm font-black uppercase tracking-wide transition-all duration-100 border-r-2 border-[#121212] last:border-r-0 cursor-pointer ${
              tab === t ? 'bg-[#F0C020] text-[#121212]' : 'bg-white text-neo-muted hover:bg-[#F0F0F0]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ════════ BASELINE TAB ════════ */}
      {tab === 'baseline' && (
        <div className="flex flex-col gap-6">
          {baseline ? (
            <>
              {/* New schema: defect_profile array */}
              {baseline.defect_profile && baseline.defect_profile.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {baseline.defect_profile.map((d, i) => {
                    const sev = SEVERITY_LABEL(d.severity_score || d.score || 50);
                    return (
                      <div key={i} className="border-4 border-[#121212] p-5 bg-white shadow-[4px_4px_0px_0px_#121212] flex flex-col gap-3">
                        <span className="font-mono text-xs font-bold text-neo-muted">{d.defect_code || d.code}</span>
                        <span className="font-sans text-lg font-black uppercase">{d.defect_name || d.name}</span>
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-3xl font-black">{Math.round(d.severity_score || d.score || 0)}</span>
                          <span className={`px-3 py-1 font-bold text-xs uppercase tracking-wider ${sev.color}`}>{sev.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Old schema: flat score fields */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Accuracy', value: baseline.accuracy },
                    { label: 'Fluency', value: baseline.fluency },
                    { label: 'Phoneme Acc.', value: baseline.phoneme_accuracy },
                    { label: 'Speech Score', value: baseline.speech_score },
                  ].filter(s => s.value != null).map(s => {
                    const sev = SEVERITY_LABEL((s.value || 0) * 100);
                    return (
                      <div key={s.label} className="border-4 border-[#121212] p-5 bg-white shadow-[4px_4px_0px_0px_#121212] flex flex-col gap-2">
                        <span className="font-mono text-xs font-bold text-neo-muted uppercase">{s.label}</span>
                        <span className="font-sans text-3xl font-black">{Math.round((s.value || 0) * 100)}%</span>
                        <span className={`px-2 py-0.5 text-xs font-bold uppercase w-fit ${sev.color}`}>{sev.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="border-4 border-[#121212] border-dashed p-6 bg-[#F0F0F0] text-center">
                <p className="font-mono text-sm font-bold text-neo-muted uppercase">Patient must complete the baseline from their own account.</p>
              </div>

            </>
          ) : (
            <div className="border-4 border-[#121212] p-12 bg-white shadow-[4px_4px_0px_0px_#121212] text-center flex flex-col items-center gap-6">
              <p className="font-sans font-black text-xl uppercase text-neo-muted">No baseline assessment on record.</p>
              <p className="font-mono text-sm text-neo-muted">Ask the patient to complete their baseline from their account.</p>

            </div>
          )}
        </div>
      )}


      {/* ════════ PLAN TAB ════════ */}
      {tab === 'plan' && (
        <div className="flex flex-col gap-6">
          <div className="p-8 border-4 border-[#121212] bg-white shadow-[4px_4px_0px_0px_#121212] text-center">
            <p className="font-sans text-neo-muted uppercase font-bold mb-4">Plan management is available from the Plan Builder</p>
            <button className="neo-btn neo-btn-primary" onClick={() => navigate(`/therapist/patients/${pid}/plan`)}>
              Open Plan Builder
            </button>
          </div>
        </div>
      )}

      {/* ════════ PROGRESS TAB ════════ */}
      {tab === 'progress' && (
        <div className="flex flex-col gap-8">
          {/* Clinician Alerts */}
          {progress?.tasks?.some(t => t.clinician_alert) && (
            <div className="p-4 border-4 border-[#121212] bg-[#D02020] text-white shadow-[6px_6px_0px_0px_#121212] flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} />
                <span className="font-sans font-black uppercase tracking-widest">Clinician Alert — Manual review required</span>
              </div>
              {progress.tasks.filter(t => t.clinician_alert).map(t => (
                <div key={t.progress_id || t.task_id} className="flex items-center justify-between bg-white/10 p-3">
                  <span className="font-bold">{t.task_name}</span>
                  <button onClick={() => handleDismissAlert(t.progress_id)} className="px-4 py-1 bg-white text-[#D02020] font-black text-xs uppercase border-2 border-white cursor-pointer">
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Task Progress */}
          <div className="flex flex-col gap-4">
            <h3 className="font-sans text-2xl font-black uppercase tracking-widest border-b-4 border-[#121212] pb-2">Task Progress</h3>
            {progress?.tasks?.length > 0 ? (
              progress.tasks.map((t, i) => (
                <div key={i} className="border-4 border-[#121212] p-5 bg-white shadow-[4px_4px_0px_0px_#121212] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {t.clinician_alert && <AlertTriangle size={18} className="text-[#D02020]" />}
                    <div>
                      <span className="font-sans font-black uppercase block">{t.task_name}</span>
                      <span className="font-mono text-xs text-neo-muted">{t.current_level || 'easy'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`inline-block px-3 py-1 border-2 border-[#121212] font-black text-sm ${
                      t.current_level === 'advanced' ? 'bg-[#1040C0] text-white' :
                      t.current_level === 'medium' ? 'bg-[#F0C020] text-[#121212]' :
                      'bg-white text-[#121212]'
                    }`}>{(t.current_level || 'easy').toUpperCase()}</span>
                    <span className="font-sans text-2xl font-black">{Math.round(t.overall_accuracy || 0)}%</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="font-bold text-neo-muted uppercase text-center py-6">No progress data yet</p>
            )}
          </div>

          {/* Emotion Trends */}
          {emotions?.trends?.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="font-sans text-2xl font-black uppercase tracking-widest border-b-4 border-[#121212] pb-2">Emotion Trends (30 days)</h3>
              {emotions.chronic_frustration_flag && (
                <div className="p-4 border-4 border-[#121212] bg-[#D02020] text-white font-sans font-bold uppercase shadow-[4px_4px_0px_0px_#121212] flex items-center gap-3">
                  <AlertTriangle size={20} />
                  This patient has shown sustained frustration across recent sessions.
                </div>
              )}
              <div className="bg-white border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] overflow-x-auto">
                <table className="w-full text-left font-sans text-sm min-w-[500px]">
                  <thead className="bg-[#121212] text-white uppercase font-black tracking-widest text-xs">
                    <tr>
                      <th className="p-3 border-r-2 border-[#333]">Date</th>
                      <th className="p-3 border-r-2 border-[#333]">Emotion</th>
                      <th className="p-3 border-r-2 border-[#333]">Frustration</th>
                      <th className="p-3">Drops</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-[#121212]">
                    {emotions.trends.map((t, i) => (
                      <tr key={i} className="hover:bg-[#F0F0F0]">
                        <td className="p-3 border-r-2 border-[#121212] font-bold">{t.session_date}</td>
                        <td className="p-3 border-r-2 border-[#121212] font-black uppercase">{t.dominant_emotion}</td>
                        <td className="p-3 border-r-2 border-[#121212] font-bold">{(t.avg_frustration || 0).toFixed(2)}</td>
                        <td className="p-3 font-bold">{t.drop_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Streak */}
          {streak && (
            <div className="border-4 border-[#121212] p-6 bg-[#D02020] text-white shadow-[6px_6px_0px_0px_#121212] flex items-center gap-6">
              <Flame size={36} className="text-[#F0C020]" />
              <div>
                <span className="font-sans text-4xl font-black">{streak.current_streak || 0}</span>
                <span className="font-sans text-sm font-bold uppercase tracking-widest ml-3">Day Streak</span>
                <p className="font-mono text-xs text-white/60 mt-1">
                  Best: {streak.longest_streak || 0} days · Last session: {streak.last_session_date || '—'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ NOTES TAB ════════ */}
      {tab === 'notes' && (
        <div className="flex flex-col gap-6">
          <h3 className="font-sans text-2xl font-black uppercase tracking-widest border-b-4 border-[#121212] pb-2">Clinical Notes</h3>

          {/* Latest note — editable */}
          <textarea
            className="neo-input min-h-[260px] resize-y font-sans text-base"
            placeholder="Enter clinical notes for this patient..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <button
            onClick={handleSaveNotes}
            disabled={notesSaving}
            className="neo-btn neo-btn-primary w-fit flex items-center gap-2"
          >
            <Save size={16} /> {notesSaving ? 'SAVING...' : 'SAVE NOTE'}
          </button>

          {/* History log */}
          {notesHistory.length > 0 && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setHistoryOpen(o => !o)}
                className="flex items-center gap-2 text-sm font-black uppercase text-neo-muted hover:text-[#121212] transition-colors cursor-pointer w-fit"
              >
                {historyOpen ? <ChevronUp size={16} strokeWidth={3} /> : <ChevronDown size={16} strokeWidth={3} />}
                {historyOpen ? 'Hide' : 'Show'} Previous Notes ({notesHistory.length})
              </button>
              {historyOpen && (
                <div className="flex flex-col gap-3">
                  {notesHistory.map((n, i) => (
                    <div key={n.id ?? i} className="border-4 border-[#121212] bg-[#F0F0F0] p-4 flex flex-col gap-2 shadow-[3px_3px_0px_0px_#121212]">
                      <div className="flex items-center gap-2 font-mono text-xs font-bold text-neo-muted uppercase">
                        <Clock size={12} />
                        {n.created_at ? new Date(n.created_at).toLocaleString() : 'Unknown date'}
                      </div>
                      <p className="font-sans text-sm text-[#121212] whitespace-pre-wrap">{n.note_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
