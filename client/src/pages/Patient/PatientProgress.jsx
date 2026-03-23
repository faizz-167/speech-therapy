import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Target, Activity, Flame, Award } from 'lucide-react';
import { patientsAPI } from '../../api/patients';
import LoadingState from '../../components/shared/LoadingState';

export default function PatientProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [emotions, setEmotions] = useState(null);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      patientsAPI.getProgress(user.id).catch(() => null),
      patientsAPI.getEmotionTrends(user.id, 30).catch(() => null),
      patientsAPI.getStreak(user.id).catch(() => null)
    ]).then(([p, e, s]) => {
      if (p) setProgress(p);
      if (e) setEmotions(e);
      if (s) setStreak(s);
      setLoading(false);
    });
  }, [user.id]);

  if (loading) return <LoadingState message="LOADING PROGRESS..." />;

  const tasks = progress?.tasks || [];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-12 pt-8 px-4 pb-16">
      {/* HEADER */}
      <div className="flex flex-col border-b-2 border-neo-border pb-8">
        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-black leading-none">
          My Progress
        </h1>
        <p className="font-mono text-sm uppercase font-bold text-black/50 mt-4 tracking-widest max-w-xl">
          Track your improvement over time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {streak && (
            <div className="bh-panel bg-neo-accent p-10 flex items-center gap-8">
              <Flame size={56} className="text-black fill-current opacity-20" />
              <div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-sans text-6xl md:text-7xl font-black tracking-tighter leading-none">{streak.current_streak || 0}</span>
                  <span className="font-sans text-xl font-bold uppercase tracking-tight text-black">Days</span>
                </div>
                <p className="font-mono text-sm text-black/60 mt-3 font-bold uppercase tracking-widest">
                  Best: {streak.longest_streak || 0} days
                </p>
              </div>
            </div>
         )}

        <div className="bh-panel bg-black text-white p-10 flex items-center gap-8">
           <Award size={56} className="text-white opacity-20" />
           <div>
             <span className="font-sans text-6xl md:text-7xl font-black tracking-tighter leading-none break-all">
                {tasks.length > 0 ? `${Math.round(tasks.reduce((acc, t) => acc + t.overall_accuracy, 0) / tasks.length)}%` : 'N/A'}
             </span>
             <p className="font-mono text-sm text-white/50 mt-3 font-bold uppercase tracking-widest">
               Avg. Accuracy
             </p>
           </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 mt-4">
        <h3 className="text-4xl font-black uppercase tracking-tighter text-black">Mastery</h3>
        
        {tasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((t, i) => (
              <div key={i} className="bh-panel bg-neo-surface p-6 flex flex-col justify-between hover:bg-white hover:border-black transition-colors">
                <div>
                  <span className="font-sans font-black uppercase leading-tight line-clamp-2 text-xl mb-4 block tracking-tight">{t.task_name}</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-block px-3 py-1 border-2 font-black text-[10px] uppercase tracking-widest ${
                      t.current_level === 'advanced' ? 'bg-black text-white border-black' :
                      t.current_level === 'medium' ? 'bg-[#CCFF00] text-black border-neo-border' :
                      'bg-white text-black border-neo-border'
                    }`}>{t.current_level || 'easy'}</span>
                  </div>
                </div>
                <div className="mt-8 pt-4 border-t-2 border-neo-border flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-black/50 uppercase tracking-widest">Accuracy</span>
                  <span className={`font-sans text-4xl font-black tracking-tighter ${
                     t.overall_accuracy >= 80 ? 'text-black' :
                     t.overall_accuracy >= 55 ? 'text-black/70' :
                     'text-[#FF2E2E]'
                  }`}>{Math.round(t.overall_accuracy || 0)}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bh-panel bg-neo-surface p-12 text-center min-h-[300px] flex items-center justify-center">
             <p className="font-bold text-black/50 uppercase tracking-widest">Complete exercises to see progress.</p>
          </div>
        )}
      </div>
    </div>
  );
}
