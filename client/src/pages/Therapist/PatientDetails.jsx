import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { FiArrowLeft, FiCpu, FiEdit2 } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, post } = useApi();
  const [patient, setPatient] = useState(null);
  const [plans, setPlans] = useState([]);
  const [baseline, setBaseline] = useState(null);
  const [notes, setNotes] = useState([]);
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    get(`/patients/${id}`).then(setPatient).catch(() => {});
    get(`/plans/patient/${id}`).then(setPlans).catch(() => {});
    get(`/patients/baseline-results?patient_id=${id}`).then((res) => {
      // The endpoint returns an array or single object. Handle both.
      const baselineData = Array.isArray(res) ? res[0] : res;
      setBaseline(baselineData);
    }).catch(() => {});
    get(`/notes/${id}`).then(setNotes).catch(() => {});
  }, [id]);

  // Direct plan generation — uses the approved_task_ids already stored on the patient record
  const generatePlan = async () => {
    setGenerating(true);
    try {
      // Send the patient's stored approved_task_ids (already set during registration)
      const taskIds = (patient.approved_task_ids || []).map(t => String(t));
      await post(`/plans/generate?patient_id=${id}`, { approved_task_ids: taskIds });
      const updated = await get(`/plans/patient/${id}`);
      setPlans(updated);
    } catch {}
    setGenerating(false);
  };

  const tabs = ['overview', 'baseline', 'plans', 'notes'];
  if (!patient) return (
    <div className="text-center py-12">
      <div className="neo-badge bg-neo-secondary animate-bounce-subtle inline-block">LOADING...</div>
    </div>
  );

  return (
    <div>
      <button onClick={() => navigate('/therapist/patients')} className="flex items-center gap-2 mb-4 text-sm font-black uppercase text-black/60 hover:text-black transition-colors">
        <FiArrowLeft className="w-4 h-4" strokeWidth={3} /> Back to Patients
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 border-4 border-black bg-neo-accent shadow-[4px_4px_0px_0px_#000] flex items-center justify-center text-black font-black text-2xl uppercase -rotate-2">
            {patient.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black">{patient.name}</h1>
            <p className="font-bold text-sm text-black/60 uppercase">{patient.email} · {patient.age}y</p>
          </div>
        </div>
        <Button onClick={generatePlan} disabled={generating}>
          <FiCpu className="w-4 h-4" strokeWidth={3} /> {generating ? 'Generating...' : 'AI Plan'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-4 border-black inline-flex">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-6 py-3 text-sm font-black uppercase tracking-wide transition-all duration-100 border-r-2 border-black last:border-r-0 ${
              tab === t ? 'bg-neo-accent text-black' : 'bg-white text-black/60 hover:bg-neo-muted'
            }`}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Clinical Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[['Severity', patient.severity], ['Language', patient.language],
                ['Category', patient.category]].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b-2 border-black/10 pb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-black/50">{k}</span>
                  <span className="font-bold text-black uppercase">{v || '—'}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between border-b-2 border-black/10 pb-2">
                <span className="text-xs font-black uppercase tracking-widest text-black/50">Baseline</span>
                <span className={`neo-badge ${patient.baseline_completed ? 'neo-badge-done' : 'neo-badge-pending'}`}>
                  {patient.baseline_completed ? 'DONE' : 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between border-b-2 border-black/10 pb-2">
                <span className="text-xs font-black uppercase tracking-widest text-black/50">Active Plans</span>
                <span className="font-black text-black text-lg">{plans.filter(p => p.status === 'approved').length}</span>
              </div>
              <div className="flex justify-between border-b-2 border-black/10 pb-2">
                <span className="text-xs font-black uppercase tracking-widest text-black/50">Defects</span>
                <span className="font-black text-black text-lg">{(patient.selected_defects || []).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-black/50">Approved Tasks</span>
                <span className="font-black text-black text-lg">{(patient.approved_task_ids || []).length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'baseline' && (
        <Card>
          <CardContent className="p-6">
            {baseline ? (
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-neo-accent border-4 border-black shadow-[6px_6px_0px_0px_#000] p-6 text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-2">Final Baseline Score</p>
                  <p className="text-5xl font-black text-black">{baseline.final_score}%</p>
                </div>
                {baseline.items && baseline.items.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xl font-black uppercase mb-4">Item Results</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {baseline.items.map(item => (
                        <div key={item.item_id} className="border-2 border-black p-3 bg-white">
                          <p className="text-xs font-bold text-black/60">{item.item_id}</p>
                          <p className="text-lg font-black">{item.score_given}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="font-bold text-black/40 text-center py-8 uppercase">No baseline results yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'plans' && (
        <div className="space-y-4">
          {plans.length === 0 ? (
            <p className="font-bold text-black/40 text-center py-8 uppercase">No therapy plans yet</p>
          ) : (
            plans.map(p => (
              <Card key={p.id}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-black text-black uppercase">Weekly Plan</p>
                    <p className="font-bold text-xs text-black/50 mt-1 uppercase">{p.created_at} · {p.task_count} tasks</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`neo-badge ${
                      p.status === 'approved' ? 'neo-badge-approved' :
                      p.status === 'rejected' ? 'neo-badge-rejected' : 'neo-badge-pending'
                    }`}>{p.status}</span>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/therapist/planner?plan=${p.id}`)}>
                      <FiEdit2 className="w-3 h-3" strokeWidth={3} /> View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-3">
          {notes.length === 0 ? (
            <p className="font-bold text-black/40 text-center py-8 uppercase">No therapy notes</p>
          ) : (
            notes.map(n => (
              <Card key={n.id}>
                <CardContent className="p-4">
                  <p className="font-bold text-black">{n.note_text}</p>
                  <p className="font-bold text-xs text-black/40 mt-2 uppercase">{n.created_at}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
