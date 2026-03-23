import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientsAPI } from '../../api/patients';
import { ArrowLeft, AlertTriangle, Flame, Save, ChevronDown, ChevronUp, Clock, FileEdit, Quote, Activity, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingState from '../../components/shared/LoadingState';

const SEVERITY_LABEL = (score) => {
  if (score < 40) return { label: 'Severe', color: 'bg-[#FF2E2E] text-white border-2 border-[#FF2E2E]' };
  if (score < 60) return { label: 'Moderate', color: 'bg-neo-accent text-black border-2 border-neo-border' };
  if (score < 80) return { label: 'Mild', color: 'bg-neo-surface text-black border-2 border-neo-border' };
  return { label: 'Optimal', color: 'bg-black text-white border-2 border-black' };
};

const SEVERITY_COLORS = {
  critical: 'bg-[#FF6B6B] text-white',
  warning: 'bg-neo-accent text-neo-text',
  info: 'bg-[#C4B5FD] text-neo-text'
};

export default function PatientPage() {
  const { patientId } = useParams();
  const pid = patientId;
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [tab, setTab] = useState('baseline'); // Renamed to activeTab for the new structure
  const [loading, setLoading] = useState(true);

  // Tab data
  const [baseline, setBaseline] = useState(null);
  const [progress, setProgress] = useState(null);
  const [emotions, setEmotions] = useState(null);
  const [streak, setStreak] = useState(null);
  const [notes, setNotes] = useState('');
  const [latestNote, setLatestNote] = useState('');
  const [notesHistory, setNotesHistory] = useState([]);
  const [notesSaving, setNotesSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // New state variables for the refactored tabs
  const [activeTab, setActiveTab] = useState('baseline');
  const [isLoadingBaseline, setIsLoadingBaseline] = useState(true);
  const [baselineResults, setBaselineResults] = useState(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [progressData, setProgressData] = useState(null);
  const [isLoadingEmotions, setIsLoadingEmotions] = useState(true);
  const [emotionData, setEmotionData] = useState(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [allNotes, setAllNotes] = useState([]); // Renamed to avoid conflict with existing 'notes'
  const [newNote, setNewNote] = useState({ category: 'general', severity: 'info', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    const load = async () => {
      try {
        const p = await patientsAPI.getPatient(pid);
        setPatient(p);
      } catch {
        toast.error('Failed to load patient');
      } finally {
        setLoading(false);
      }
    };
    if (pid) load();
  }, [pid]);

  // Load tab-specific data (adapted for new state variables)
  useEffect(() => {
    if (!pid) return;

    const loadBaseline = async () => {
      setIsLoadingBaseline(true);
      try {
        const res = await patientsAPI.getBaselineResults(pid);
        // Assuming res is an array of categories with items
        setBaselineResults(res);
      } catch (error) {
        console.error("Failed to load baseline results:", error);
        setBaselineResults(null);
      } finally {
        setIsLoadingBaseline(false);
      }
    };

    const loadProgress = async () => {
      setIsLoadingProgress(true);
      try {
        const res = await patientsAPI.getProgress(pid);
        setProgressData(res?.tasks || []); // Assuming progress has a 'tasks' array
      } catch (error) {
        console.error("Failed to load progress data:", error);
        setProgressData(null);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    const loadEmotions = async () => {
      setIsLoadingEmotions(true);
      try {
        const res = await patientsAPI.getEmotionTrends(pid, 30);
        setEmotionData(res?.trends || []); // Assuming emotion trends has a 'trends' array
      } catch (error) {
        console.error("Failed to load emotion data:", error);
        setEmotionData(null);
      } finally {
        setIsLoadingEmotions(false);
      }
    };

    const loadNotes = async () => {
      setIsLoadingNotes(true);
      try {
        const res = await patientsAPI.getNotes(pid);
        setAllNotes(res?.history || []); // Assuming notes has a 'history' array
      } catch (error) {
        console.error("Failed to load notes:", error);
        setAllNotes([]);
      } finally {
        setIsLoadingNotes(false);
      }
    };

    if (activeTab === 'baseline') {
      loadBaseline();
    } else if (activeTab === 'progress') {
      loadProgress();
    } else if (activeTab === 'emotion') {
      loadEmotions();
    } else if (activeTab === 'notes') {
      loadNotes();
    }
  }, [activeTab, pid]);


  const handleSaveNotes = async () => {
    if (notes.trim() === latestNote.trim()) {
      toast('No changes to save', { icon: '📝' });
      return;
    }
    setNotesSaving(true);
    try {
      await patientsAPI.saveNotes(pid, notes);
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
    toast('Not implemented', { icon: 'ℹ️' });
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.content.trim()) {
      toast.error("Note content cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Assuming an API call to save the new note
      const savedNote = await patientsAPI.addNote(pid, newNote); // This API call needs to be implemented
      setAllNotes(prev => [savedNote, ...prev]);
      setNewNote({ category: 'general', severity: 'info', content: '' });
      toast.success('Note added successfully!');
    } catch (error) {
      console.error("Failed to add note:", error);
      toast.error('Failed to add note.');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (loading) return <LoadingState message="LOADING PATIENT..." />;
  if (!patient) return <div className="text-center py-12 font-black uppercase text-xl text-black/50">Patient not found</div>;

  const tabs = ['baseline', 'plan', 'progress', 'notes']; // Original tabs, kept for reference if needed

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-12 pt-8 px-4 pb-16">
      <button onClick={() => navigate('/therapist/patients')} className="flex items-center gap-2 text-sm font-black uppercase text-black/50 hover:text-black transition-colors cursor-pointer w-fit">
        <ArrowLeft size={16} strokeWidth={3} /> Back to Roster
      </button>

      {/* Header and Status */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-8 border-b-8 border-neo-border gap-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase text-neo-text tracking-tighter drop-shadow-[3px_3px_0px_var(--color-neo-accent)]">{patient.name || patient.full_name}</h1>
          <p className="text-neo-text font-black mt-4 uppercase tracking-widest bg-neo-surface px-4 py-2 border-4 border-neo-border shadow-[4px_4px_0px_#000] inline-block -rotate-1">
            {patient.age && `${patient.age}y`} {patient.gender && ` // ${patient.gender}`} {patient.email && ` // ${patient.email}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-4">
          <span className={`px-4 py-2 font-black uppercase tracking-widest text-sm border-4 border-neo-border shadow-[4px_4px_0px_0px_#000] rotate-2 ${
            patient.baseline_completed
              ? (patient.has_plan ? 'bg-[#C4B5FD] text-neo-text' : 'bg-neo-accent text-neo-text')
              : 'bg-[#FF6B6B] text-white'
          }`}>
            {patient.baseline_completed ? (patient.has_plan ? 'Active Plan' : 'Plan Needed') : 'Baseline Pending'}
          </span>
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/therapist/patients/${pid}/plan`)}
              className="px-6 py-2 bg-neo-accent text-neo-text border-4 border-neo-border font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
            >
              <FileEdit size={18} strokeWidth={3} />
              Manage Plan
            </button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-4 mb-8 pb-6 border-b-4 border-neo-border border-dashed">
        {['baseline', 'progress', 'emotion', 'notes'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-8 py-3 font-black uppercase tracking-widest text-lg border-4 border-neo-border hover:-translate-y-1 transition-all shadow-[6px_6px_0px_0px_#000] active:translate-y-1 active:shadow-none ${
              activeTab === t
                ? 'bg-neo-text text-neo-bg -rotate-1 scale-105'
                : 'bg-neo-surface text-neo-text hover:bg-neo-accent rotate-1'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="mt-8 transition-opacity duration-300">

        {/* BASELINE TAB */}
        {activeTab === 'baseline' && (
          <div className="space-y-8">
            {isLoadingBaseline ? (
              <div className="p-12 text-center text-neo-text/50 font-black uppercase tracking-widest border-4 border-neo-border bg-neo-surface shadow-[8px_8px_0px_0px_#000]">Loading baseline data...</div>
            ) : baselineResults && baselineResults.length > 0 ? (
              <div className="space-y-12">
                {baselineResults.map((category) => (
                  <div key={category.section_id} className="relative">
                    <h3 className="text-3xl font-black uppercase mb-6 text-neo-text bg-neo-bg inline-block px-4 py-2 border-4 border-neo-border shadow-[4px_4px_0px_0px_var(--color-neo-accent)] rotate-1 z-10 relative left-4">
                      {category.section_name}
                    </h3>
                    <div className="bg-neo-surface border-4 border-neo-border p-8 md:p-12 shadow-[12px_12px_0px_0px_#000] pt-16 -mt-8 relative z-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {category.items.map((item) => (
                          <div key={item.item_id} className="p-6 bg-neo-bg border-4 border-neo-border flex flex-col justify-between shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-transform group">
                            <div>
                              <p className="text-sm font-black uppercase text-neo-text/60 tracking-widest mb-2 border-b-4 border-neo-border pb-1 w-fit">{item.item_label}</p>
                              <p className="font-bold text-xl mb-4 group-hover:text-neo-text break-words">"{item.stimulus_content}"</p>
                            </div>
                            <div className="mt-auto">
                              <span className={`inline-block px-4 py-2 font-black border-2 border-neo-border uppercase text-sm shadow-[2px_2px_0px_0px_#000] ${
                                item.is_correct ? 'bg-[#FFD93D] text-neo-text' : 'bg-[#FF6B6B] text-white'
                              }`}>
                                {item.is_correct ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 border-4 border-neo-border bg-neo-surface text-center shadow-[8px_8px_0px_0px_#000] rotate-1">
                <p className="font-sans font-black uppercase tracking-widest text-neo-text/50 text-xl">Baseline assessment not completed yet.</p>
              </div>
            )}
          </div>
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'progress' && (
          <div className="space-y-8">
            {isLoadingProgress ? (
              <div className="p-12 text-center text-neo-text/50 font-black uppercase tracking-widest border-4 border-neo-border bg-neo-surface shadow-[8px_8px_0px_0px_#000]">Loading progress data...</div>
            ) : progressData && progressData.length > 0 ? (
              <>
                {/* Visual Overview */}
                <div className="bg-neo-bg border-4 border-neo-border p-8 md:p-12 shadow-[12px_12px_0px_0px_#000]">
                  <h3 className="text-3xl font-black uppercase mb-8 text-neo-text border-b-8 border-neo-border pb-4 inline-block drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">Score Distribution</h3>
                  <div className="h-64 flex items-end justify-between gap-4 border-b-4 border-neo-border pb-4 overflow-x-auto relative">
                    {/* Background grid lines */}
                    <div className="absolute inset-x-0 bottom-4 top-0 border-l-4 border-neo-border/20 flex flex-col justify-between z-0 pointer-events-none">
                      {[100, 75, 50, 25].map(tick => (
                        <div key={tick} className="border-b-2 border-neo-border/20 w-full flex items-center">
                          <span className="absolute -left-12 font-black text-neo-text/40">{tick}</span>
                        </div>
                      ))}
                    </div>
                    {progressData.map((session, idx) => {
                      const height = `${Math.max(10, session.overall_accuracy || 0)}%`; // Using overall_accuracy from original progress data
                      return (
                        <div key={session.progress_id || idx} className="relative group flex flex-col items-center flex-shrink-0 w-16 md:w-24 z-10 transition-transform hover:-translate-y-2">
                          <div
                            className="w-full bg-neo-text border-4 border-neo-border border-b-0"
                            style={{ height }}
                          >
                            <div className="absolute top-0 opacity-0 group-hover:opacity-100 -translate-y-full pb-4 whitespace-nowrap transition-opacity pointer-events-none z-20">
                              <div className="bg-neo-accent text-neo-text text-sm font-black px-4 py-2 border-4 border-neo-border shadow-[4px_4px_0px_0px_#000]">
                                {session.task_name ? session.task_name : `${session.overall_accuracy || 0}%`}
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-black mt-4 text-neo-text uppercase tracking-widest">S{idx + 1}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Session Details */}
                <h3 className="text-3xl font-black uppercase mb-6 text-neo-text border-b-8 border-neo-border pb-4 inline-block drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">Detailed History</h3>
                <div className="space-y-6">
                  {progressData.map((session, idx) => (
                    <div key={session.progress_id || idx} className="bg-neo-surface border-4 border-neo-border p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-[8px_8px_0px_0px_#000] hover:-translate-y-2 transition-transform cursor-default">
                      <div className="flex items-center gap-6">
                        <div className="bg-neo-bg text-neo-text w-16 h-16 border-4 border-neo-border flex items-center justify-center font-black text-2xl shadow-[4px_4px_0px_0px_#000] -rotate-3">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-sans font-black uppercase text-xl text-neo-text mb-1">{new Date(session.created_at).toLocaleDateString()}</p>
                          <p className="text-sm font-black uppercase tracking-widest text-neo-text/60 bg-neo-bg px-2 py-1 border-2 border-neo-border inline-block shadow-[2px_2px_0px_#000]">Score: {session.overall_accuracy || 0}%</p>
                        </div>
                      </div>

                      {session.task_name && ( // Using task_name as a proxy for notes for now
                        <div className="flex-1 bg-neo-bg p-4 border-4 border-neo-border relative">
                          <Quote className="absolute -top-3 -left-3 text-neo-accent fill-white rotate-12" size={32} strokeWidth={3} />
                          <p className="font-serif italic text-neo-text text-lg pl-6">"{session.task_name}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-12 border-4 border-neo-border bg-neo-surface text-center shadow-[8px_8px_0px_0px_#000] rotate-1">
                <p className="font-sans font-black uppercase tracking-widest text-neo-text/50 text-xl">No progress data available yet.</p>
              </div>
            )}
          </div>
        )}

        {/* EMOTION TAB */}
        {activeTab === 'emotion' && (
          <div className="space-y-8">
            {isLoadingEmotions ? (
              <div className="p-12 text-center text-neo-text/50 font-black uppercase tracking-widest border-4 border-neo-border bg-neo-surface shadow-[8px_8px_0px_0px_#000]">Loading emotional data...</div>
            ) : emotionData && emotionData.length > 0 ? (
              <>
                <div className="bg-neo-bg border-4 border-neo-border p-8 md:p-12 shadow-[12px_12px_0px_0px_#000]">
                  <h3 className="text-3xl font-black uppercase mb-8 text-neo-text border-b-8 border-neo-border pb-4 inline-block drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">Overall Trend</h3>
                  <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                    <div className="w-full md:w-1/2 flex items-center justify-center h-48 border-4 border-neo-border border-dashed bg-neo-surface/50 relative overflow-hidden group">
                       {/* Placeholder for actual chart */}
                       <div className="absolute inset-0 bg-gradient-to-tr from-neo-bg to-transparent opacity-50 pointer-events-none" />
                       <p className="font-sans font-black text-neo-text/40 uppercase tracking-widest text-2xl rotate-[-5deg] group-hover:scale-110 transition-transform">Valence Trend</p>
                       <Activity className="absolute bottom-4 right-4 text-neo-text/20 w-32 h-32" />
                    </div>
                    <div className="w-full md:w-1/2 space-y-4">
                      {emotionData.slice(0,3).map((ed, i) => (
                        <div key={i} className="flex justify-between items-center p-4 border-4 border-neo-border bg-neo-surface shadow-[4px_4px_0px_0px_#000] hover:-rotate-1 transition-transform">
                          <span className="font-black uppercase">{new Date(ed.session_date).toLocaleDateString()}</span> {/* Using session_date from original emotion trends */}
                          <span className={`px-4 py-1 border-2 border-neo-border font-black uppercase shadow-[2px_2px_0px_#000] ${
                            ed.avg_frustration > 0.5 ? 'bg-[#FF6B6B] text-white' : // Example logic for valence
                            ed.avg_frustration < 0.2 ? 'bg-[#FFD93D] text-neo-text' : 'bg-neo-bg text-neo-text'
                          }`}>
                            {ed.avg_frustration > 0.5 ? 'High Frustration' : ed.avg_frustration < 0.2 ? 'Low Frustration' : 'Moderate'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 border-4 border-neo-border bg-neo-surface text-center shadow-[8px_8px_0px_0px_#000] rotate-1">
                <p className="font-sans font-black uppercase tracking-widest text-neo-text/50 text-xl">No emotional engagement data collected yet.</p>
              </div>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-8">
            <div className="bg-neo-bg border-4 border-neo-border p-8 shadow-[8px_8px_0px_0px_#000]">
              <h3 className="text-3xl font-black uppercase mb-6 text-neo-text border-b-8 border-neo-border pb-4 inline-block drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">Add Clinical Note</h3>
              <form onSubmit={handleAddNote} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-black uppercase tracking-widest text-sm mb-2">Category</label>
                    <div className="relative border-4 border-neo-border shadow-[4px_4px_0px_0px_#000] rotate-1 group hover:rotate-0 transition-transform bg-neo-surface">
                      <select
                        className="w-full p-4 font-black uppercase tracking-widest bg-transparent appearance-none focus:outline-none cursor-pointer"
                        value={newNote.category}
                        onChange={e => setNewNote({...newNote, category: e.target.value})}
                      >
                        <option value="general">General</option>
                        <option value="progress">Progress</option>
                        <option value="regression">Regression</option>
                        <option value="behavioral">Behavioral</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" size={24} strokeWidth={3} />
                    </div>
                  </div>
                  <div>
                    <label className="block font-black uppercase tracking-widest text-sm mb-2">Severity</label>
                    <div className="relative border-4 border-neo-border shadow-[4px_4px_0px_0px_#000] -rotate-1 group hover:rotate-0 transition-transform bg-neo-surface">
                      <select
                        className="w-full p-4 font-black uppercase tracking-widest bg-transparent appearance-none focus:outline-none cursor-pointer"
                        value={newNote.severity}
                        onChange={e => setNewNote({...newNote, severity: e.target.value})}
                      >
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" size={24} strokeWidth={3} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-black uppercase tracking-widest text-sm mb-2">Note Content</label>
                  <textarea
                    className="w-full p-6 border-4 border-neo-border font-serif text-lg bg-neo-surface resize-y min-h-[160px] shadow-[4px_4px_0px_0px_#000] focus:outline-none focus:shadow-[8px_8px_0px_0px_var(--color-neo-accent)] transition-shadow"
                    placeholder="ENTER CLINICAL OBSERVATIONS..."
                    value={newNote.content}
                    onChange={e => setNewNote({...newNote, content: e.target.value})}
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bh-button bg-neo-accent text-neo-text border-4 border-neo-border font-black uppercase tracking-widest px-8 py-4 shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 flex items-center gap-3"
                  >
                    {isSubmitting ? 'Saving...' : <><Plus size={20} strokeWidth={3} /> Add Note</>}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <h3 className="text-3xl font-black uppercase text-neo-text border-b-8 border-neo-border pb-4 inline-block drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">History</h3>
              {isLoadingNotes ? (
                <div className="p-8 text-center text-neo-text/50 font-black uppercase tracking-widest">Loading notes...</div>
              ) : allNotes.length === 0 ? (
                <div className="p-12 border-4 border-neo-border bg-neo-surface text-center shadow-[8px_8px_0px_0px_#000] -rotate-1">
                  <p className="font-sans font-black uppercase tracking-widest text-neo-text/50 text-xl">No clinical notes recorded yet.</p>
                </div>
              ) : (
                allNotes.map(note => (
                  <div key={note.id} className="p-6 bg-neo-surface border-4 border-neo-border shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 transition-transform cursor-default flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-neo-border pb-4 gap-4">
                      <div className="flex items-center gap-4">
                        <span className="font-black hover:bg-neo-text hover:text-neo-bg px-2 transition-colors uppercase text-xl">
                          {new Date(note.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-4 py-1 text-sm font-black uppercase tracking-widest border-2 border-neo-border shadow-[2px_2px_0px_#000] ${SEVERITY_COLORS[note.severity] || SEVERITY_COLORS.info}`}>
                          {note.severity}
                        </span>
                        <span className="px-4 py-1 text-sm font-black uppercase tracking-widest border-2 border-neo-border bg-neo-bg text-neo-text shadow-[2px_2px_0px_#000]">
                          {note.category}
                        </span>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-neo-text px-4 border-l-4 border-neo-accent">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
