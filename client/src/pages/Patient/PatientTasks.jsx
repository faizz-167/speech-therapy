import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Target, AlertTriangle } from 'lucide-react';
import { patientsAPI } from '../../api/patients';
import api from '../../api/axios';
import LoadingState from '../../components/shared/LoadingState';

export default function PatientTasks() {
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const p = await patientsAPI.getPatient(user.id);
        setPatient(p);
        if (p?.plan_id) {
          const res = await api.get(`/plans/${p.plan_id}/week`);
          setWeekData(res.data);
        }
      } catch (error) {
        console.error("Failed to load tasks", error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchTasks();
  }, [user.id]);

  if (loading) return <LoadingState message="LOADING PLAN..." />;

  const daysOfWeek = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-12 pt-8 px-4 pb-16">
      {/* HEADER */}
      <div className="flex flex-col border-b-4 border-neo-border pb-8">
        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-neo-text leading-none drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">
          Therapy Plan
        </h1>
        <p className="font-sans text-sm uppercase font-black text-neo-text/80 mt-4 tracking-widest max-w-xl">
          Complete your assigned exercises daily to maintain consistent progress.
        </p>
      </div>

      {!patient?.plan_id ? (
        <div className="bg-neo-surface p-12 text-center flex flex-col items-center justify-center min-h-[400px] border-4 border-neo-border shadow-[8px_8px_0px_0px_#000] -rotate-1">
          <AlertTriangle size={64} className="text-neo-text mb-6 opacity-80 drop-shadow-[2px_2px_0px_#FFF]" strokeWidth={2} />
          <h2 className="text-3xl md:text-5xl font-black uppercase text-neo-text mb-4 tracking-tight drop-shadow-[2px_2px_0px_#FFF]">No Active Plan</h2>
          <p className="font-black text-neo-text/80 max-w-md bg-neo-bg px-4 py-2 border-4 border-neo-border rotate-1">Your therapist has not assigned a weekly therapy plan yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {daysOfWeek.map((dayLabel, index) => {
            const dayTasks = weekData.filter(t => t.day_index === index);
            const isToday = patient?.start_date && (Math.max(0, Math.floor((new Date() - new Date(patient.start_date)) / (1000 * 60 * 60 * 24))) % 7) === index;
            
            return (
              <div key={index} className={`flex flex-col h-full border-4 shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] transition-all bg-neo-bg ${isToday ? 'border-neo-text' : 'border-neo-border'} ${isToday ? '-rotate-1' : 'rotate-1'}`}>
                <div className={`p-5 flex justify-between items-center border-b-4 ${isToday ? 'bg-neo-text text-neo-bg border-neo-text' : 'bg-neo-surface text-neo-text border-neo-border'}`}>
                  <h3 className="font-black uppercase tracking-widest text-xl">{dayLabel}</h3>
                  {isToday && <span className="text-xs font-black uppercase bg-neo-accent text-neo-text px-3 py-1 tracking-widest border-4 border-neo-text shadow-[2px_2px_0px_0px_#000] rotate-3">TODAY</span>}
                </div>
                
                <div className={`p-5 flex flex-col gap-4 flex-1 ${isToday ? 'bg-neo-bg' : 'bg-neo-bg'}`}>
                  {dayTasks.length > 0 ? (
                    dayTasks.map(t => (
                      <div key={t.assignment_id} className={`p-4 border-4 flex flex-col gap-2 ${isToday ? 'bg-neo-surface text-neo-text border-neo-border shadow-[2px_2px_0px_0px_#000]' : 'bg-neo-bg border-neo-border shadow-[2px_2px_0px_0px_#000]'} hover:scale-105 transition-transform cursor-pointer`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-sans font-black uppercase text-base leading-tight tracking-tight">{t.task?.task_name || 'Exercise'}</p>
                        </div>
                        <p className={`font-sans text-xs uppercase font-black mt-1 line-clamp-3 bg-white px-2 py-1 border-2 border-neo-border ${isToday ? 'text-neo-text/80' : 'text-neo-text/70'}`}>
                          {t.clinical_rationale || t.task?.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className={`flex flex-col items-center justify-center flex-1 min-h-[120px] border-4 border-dashed bg-neo-surface ${isToday ? 'border-neo-border/50' : 'border-neo-border/30'}`}>
                      <p className={`text-center text-sm font-black uppercase tracking-widest ${isToday ? 'text-neo-text/40' : 'text-neo-text/30'}`}>Rest Day</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
