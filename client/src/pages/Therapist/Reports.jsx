import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { FiBarChart2, FiTrendingUp, FiTarget, FiActivity } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export default function Reports() {
  const { get } = useApi();
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => { get('/therapists/patients').then(setPatients).catch(() => {}); }, []);

  useEffect(() => {
    if (selectedId) get(`/reports/patient/${selectedId}`).then(setReport).catch(() => {});
  }, [selectedId]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-4xl font-black uppercase tracking-tight text-black">Reports</h1>
        <div className="neo-badge bg-neo-accent rotate-2">ANALYTICS</div>
      </div>

      {/* Patient selector */}
      <div className="mb-6">
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="neo-input min-w-[350px]">
          <option value="">SELECT A PATIENT...</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name} — {p.disorder_type || 'No diagnosis'}</option>)}
        </select>
      </div>

      {!report ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 border-4 border-black bg-neo-muted flex items-center justify-center mx-auto mb-4">
              <FiBarChart2 className="w-8 h-8 text-black" strokeWidth={3} />
            </div>
            <p className="font-bold text-black/40 uppercase">Select a patient to view analytics</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-5 mb-8">
            {[
              { label: 'FINAL SCORE', value: `${report.avg_final_score}%`, bg: 'bg-neo-accent', icon: FiTarget },
              { label: 'SPEECH SCORE', value: `${report.avg_speech_score}%`, bg: 'bg-neo-secondary', icon: FiActivity },
              { label: 'ENGAGEMENT', value: `${report.avg_engagement}%`, bg: 'bg-neo-muted', icon: FiTrendingUp },
              { label: 'COMPLETION', value: `${report.completion_rate}%`, bg: 'bg-white', icon: FiBarChart2 },
            ].map(({ label, value, bg, icon: Icon }) => (
              <div key={label} className={`${bg} border-4 border-black shadow-[6px_6px_0px_0px_#000] p-5`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-black/60">{label}</p>
                    <p className="text-4xl font-black text-black mt-1">{value}</p>
                  </div>
                  <div className="w-10 h-10 border-3 border-black bg-white flex items-center justify-center">
                    <Icon className="w-5 h-5 text-black" strokeWidth={3} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary + Progress */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader><CardTitle>Session Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[['Total Sessions', report.total_sessions], ['Total Tasks', report.total_tasks], ['Completed', report.completed_tasks]].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b-2 border-black/10 pb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-black/50">{k}</span>
                    <span className="font-black text-black text-lg">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Score Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Word Accuracy', value: report.avg_accuracy, bg: 'bg-neo-accent' },
                  { label: 'Phoneme Accuracy', value: report.avg_phoneme_accuracy, bg: 'bg-[#93C5FD]' },
                  { label: 'Fluency', value: report.avg_fluency, bg: 'bg-neo-secondary' },
                  { label: 'Engagement', value: report.avg_engagement, bg: 'bg-neo-muted' },
                ].map(({ label, value, bg }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-black uppercase text-xs tracking-widest text-black/60">{label}</span>
                      <span className="font-black text-black">{value}%</span>
                    </div>
                    <div className="h-4 border-3 border-black bg-white overflow-hidden">
                      <div className={`h-full ${bg} transition-all border-r-3 border-black`} style={{ width: `${value}%` }}></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Trend */}
          {report.improvement_trend?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Weekly Trend</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-4 border-black bg-neo-secondary/30">
                      {['Week', 'Accuracy', 'Fluency', 'Speech', 'Engage'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-black">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.improvement_trend.map(t => (
                      <tr key={t.week} className="border-b-2 border-black">
                        <td className="px-5 py-3 font-black text-black text-sm">{t.week}</td>
                        <td className="px-5 py-3 font-bold text-sm"><span className="neo-badge neo-badge-severe text-[10px] px-2 py-0.5 border-2 shadow-[2px_2px_0px_0px_#000]">{t.avg_accuracy.toFixed(1)}%</span></td>
                        <td className="px-5 py-3 font-bold text-sm"><span className="neo-badge neo-badge-moderate text-[10px] px-2 py-0.5 border-2 shadow-[2px_2px_0px_0px_#000]">{t.avg_fluency.toFixed(1)}%</span></td>
                        <td className="px-5 py-3 font-bold text-sm"><span className="neo-badge bg-neo-accent text-[10px] px-2 py-0.5 border-2 shadow-[2px_2px_0px_0px_#000]">{(t.avg_speech_score || 0).toFixed(1)}%</span></td>
                        <td className="px-5 py-3 font-bold text-sm"><span className="neo-badge bg-neo-muted text-[10px] px-2 py-0.5 border-2 shadow-[2px_2px_0px_0px_#000]">{(t.avg_engagement || 0).toFixed(1)}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
