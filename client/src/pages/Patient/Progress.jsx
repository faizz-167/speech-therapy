import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { FiTarget, FiActivity, FiSmile, FiCheckCircle } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { useAuth } from '../../context/AuthContext';

export default function Progress() {
  const { user } = useAuth();
  const { get } = useApi();
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (user?.id) {
        get(`/progress/patients/${user.id}`).then((data) => {
            if (data && data.length > 0) {
                let totalTasks = data.length;
                let completedTasks = data.filter(d => d.consecutive_passes >= 3).length;
                let sumFinal = 0, sumSpeech = 0, sumEngage = 0, sumPhoneme = 0, sumFluency = 0;
                let historyEntries = [];

                data.forEach(taskProg => {
                    if (taskProg.history && taskProg.history.length > 0) {
                        const latest = taskProg.history[taskProg.history.length - 1];
                        sumFinal += latest.accuracy_score || 0;
                        sumSpeech += latest.accuracy_score || 0;
                        sumEngage += latest.behavioral_score || 0;
                        sumPhoneme += latest.phoneme_accuracy || 0;
                        sumFluency += latest.fluency_score || 0;
                        historyEntries.push(latest);
                    }
                });

                const count = historyEntries.length || 1;
                const aggregatedReport = {
                    total_sessions: count > 0 ? historyEntries.length : 0, 
                    total_tasks: totalTasks,
                    completed_tasks: completedTasks,
                    avg_final_score: Math.round(sumFinal / count),
                    avg_speech_score: Math.round(sumSpeech / count),
                    avg_engagement: Math.round(sumEngage / count),
                    avg_phoneme_accuracy: Math.round(sumPhoneme / count),
                    avg_fluency: Math.round(sumFluency / count),
                    avg_accuracy: Math.round(sumSpeech / count), 
                    completion_rate: Math.round((completedTasks/totalTasks)*100) || 0,
                    improvement_trend: []
                };
                setReport(aggregatedReport);
            }
        }).catch(() => {});
    }
  }, [user?.id]);

  const metrics = report ? [
    { label: 'FINAL SCORE', value: report.avg_final_score, icon: FiTarget, bg: 'bg-neo-accent' },
    { label: 'SPEECH SCORE', value: report.avg_speech_score, icon: FiActivity, bg: 'bg-neo-secondary' },
    { label: 'ENGAGEMENT', value: report.avg_engagement, icon: FiSmile, bg: 'bg-neo-muted' },
    { label: 'COMPLETION', value: report.completion_rate, icon: FiCheckCircle, bg: 'bg-white' },
  ] : [];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-4xl font-black uppercase tracking-tight text-black">Progress</h1>
        <div className="neo-badge bg-neo-muted -rotate-2">YOUR STATS</div>
      </div>

      {!report || report.total_sessions === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 border-4 border-black bg-neo-muted flex items-center justify-center mx-auto mb-4">
              <FiActivity className="w-8 h-8 text-black" strokeWidth={3} />
            </div>
            <p className="font-bold text-black/40 uppercase">Complete tasks to see your progress!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-5 mb-8">
            {metrics.map(({ label, value, icon: Icon, bg }) => (
              <div key={label} className={`${bg} border-4 border-black shadow-[6px_6px_0px_0px_#000] p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 border-3 border-black bg-white flex items-center justify-center">
                    <Icon className="w-5 h-5 text-black" strokeWidth={3} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-black/60">{label}</span>
                </div>
                <p className="text-4xl font-black text-black">{value}%</p>
                <div className="h-3 border-2 border-black bg-white mt-3 overflow-hidden">
                  <div className={`h-full ${bg === 'bg-white' ? 'bg-neo-secondary' : bg}`} style={{ width: `${value}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary + Score bars */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader><CardTitle>Sessions</CardTitle></CardHeader>
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
              <CardHeader><CardTitle>Breakdown</CardTitle></CardHeader>
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
                      <div className={`h-full ${bg} border-r-3 border-black`} style={{ width: `${value}%` }}></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
