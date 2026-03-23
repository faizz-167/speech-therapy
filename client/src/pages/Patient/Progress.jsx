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
    { label: 'FINAL SCORE', value: report.avg_final_score, icon: FiTarget, bg: 'bg-[#1040C0]', textColor: 'text-white', iconColor: 'text-[#1040C0]' },
    { label: 'SPEECH SCORE', value: report.avg_speech_score, icon: FiActivity, bg: 'bg-[#FFD93D]', textColor: 'text-neo-text', iconColor: 'text-[#FFD93D]' },
    { label: 'ENGAGEMENT', value: report.avg_engagement, icon: FiSmile, bg: 'bg-[#FF6B6B]', textColor: 'text-white', iconColor: 'text-[#FF6B6B]' },
    { label: 'COMPLETION', value: report.completion_rate, icon: FiCheckCircle, bg: 'bg-neo-surface', textColor: 'text-neo-text', iconColor: 'text-neo-text' },
  ] : [];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-12 pt-8 px-4 pb-16">
      <div className="flex items-center gap-4 border-b-4 border-neo-border pb-8">
        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-neo-text leading-none drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">Progress</h1>
        <div className="font-sans font-black text-sm uppercase px-4 py-2 bg-neo-text text-neo-bg border-4 border-neo-border shadow-[4px_4px_0px_0px_#000] -rotate-2 tracking-widest mt-4">YOUR STATS</div>
      </div>

      {!report || report.total_sessions === 0 ? (
        <Card className="border-4 border-neo-border shadow-[8px_8px_0px_0px_#000] rounded-none rotate-1">
          <CardContent className="p-12 text-center bg-neo-surface">
            <div className="w-20 h-20 border-4 border-neo-border bg-neo-bg flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_#000] -rotate-3 hover:rotate-3 transition-transform">
              <FiActivity className="w-10 h-10 text-neo-text" strokeWidth={3} />
            </div>
            <p className="font-black text-neo-text/80 uppercase tracking-widest text-xl drop-shadow-[1px_1px_0px_#FFF]">Complete tasks to see your progress!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 -rotate-1">
            {metrics.map(({ label, value, icon: Icon, bg, textColor, iconColor }, index) => (
              <div key={label} className={`${bg} border-4 border-neo-border shadow-[6px_6px_0px_0px_#000] p-6 flex flex-col justify-between hover:scale-105 transition-transform ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'} cursor-pointer`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 border-4 border-neo-border bg-neo-bg flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                    <Icon className={`w-6 h-6 ${iconColor === 'text-white' ? 'text-neo-text' : iconColor}`} strokeWidth={3} />
                  </div>
                  <span className={`text-xs font-black uppercase tracking-widest ${textColor} opacity-90 border-b-2 border-black/20 pb-1`}>{label}</span>
                </div>
                <p className={`text-6xl font-black ${textColor} tracking-tighter drop-shadow-[2px_2px_0px_#000]`}>{value}%</p>
                <div className="h-6 border-4 border-neo-border bg-neo-bg mt-6 overflow-hidden shadow-inner flex items-center">
                  <div className={`h-full ${bg === 'bg-neo-bg' || bg === 'bg-neo-surface' ? 'bg-neo-text' : 'bg-neo-text'} border-r-4 border-neo-border`} style={{ width: `${value}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary + Score bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 pl-2">
            <Card className="border-4 border-neo-border shadow-[8px_8px_0px_0px_#000] rounded-none rotate-1 bg-neo-bg">
              <CardHeader className="bg-[#C4B5FD] border-b-4 border-neo-border rounded-none shadow-[0px_4px_0px_0px_#000]">
                <CardTitle className="font-black uppercase tracking-widest text-neo-text text-2xl drop-shadow-[2px_2px_0px_#FFF]">Sessions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                {[['Total Sessions', report.total_sessions], ['Total Tasks', report.total_tasks], ['Completed', report.completed_tasks]].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b-4 border-neo-border pb-4 bg-neo-surface p-2 shadow-[2px_2px_0px_0px_#000]">
                    <span className="text-sm font-black uppercase tracking-widest text-neo-text/90 mt-1">{k}</span>
                    <span className="font-black text-neo-text text-3xl">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-4 border-neo-border shadow-[8px_8px_0px_0px_#000] rounded-none -rotate-1 bg-neo-bg">
              <CardHeader className="bg-[#FF6B6B] border-b-4 border-neo-border rounded-none shadow-[0px_4px_0px_0px_#000]">
                <CardTitle className="font-black uppercase tracking-widest text-neo-text text-2xl drop-shadow-[2px_2px_0px_#FFF]">Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                {[
                  { label: 'Word Accuracy', value: report.avg_accuracy, bg: 'bg-[#FFD93D]' },
                  { label: 'Phoneme Accuracy', value: report.avg_phoneme_accuracy, bg: 'bg-[#C4B5FD]' },
                  { label: 'Fluency', value: report.avg_fluency, bg: 'bg-neo-text' },
                  { label: 'Engagement', value: report.avg_engagement, bg: 'bg-[#FF6B6B]' },
                ].map(({ label, value, bg }) => (
                  <div key={label} className="bg-neo-surface p-3 border-4 border-neo-border shadow-[2px_2px_0px_0px_#000] hover:scale-105 transition-transform cursor-pointer">
                    <div className="flex justify-between text-sm mb-3">
                      <span className="font-black uppercase text-xs tracking-widest text-neo-text bg-neo-bg px-2 py-1 border-2 border-neo-border">{label}</span>
                      <span className="font-black text-neo-text text-lg">{value}%</span>
                    </div>
                    <div className="h-6 border-4 border-neo-border bg-neo-bg overflow-hidden shadow-inner">
                      <div className={`h-full ${bg} border-r-4 border-neo-border`} style={{ width: `${value}%` }}></div>
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
