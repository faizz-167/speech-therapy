import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, TrendingUp, Play, AlertTriangle, Flame, Smile, Frown, Meh } from 'lucide-react';
import { getProgress, getStreak, getEmotionTrends } from '../../api/patients';
import ProgressChart from '../../components/shared/ProgressChart';
import DashboardTaskCard from '../../components/dashboard/TaskCard';
import AlertBanner from '../../components/dashboard/AlertBanner';

const PatientHome = () => {
  const { user } = useAuth();
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [emotionData, setEmotionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prevent therapists from rendering the default patient view and causing 403s
    if (user?.role === 'therapist' && (!patientId || patientId === 'me' || patientId === 'home')) {
      navigate('/therapist/dashboard', { replace: true });
      return;
    }
    
    const load = async () => {
      try {
        let pid = patientId || user?.patient_id || user?.id;
        
        // If pid is "me" or completely missing, try to rescue it from patient_user in localStorage
        if (!pid || pid === 'me') {
          const storedPatient = localStorage.getItem('patient_user');
          if (storedPatient) {
            try {
              const parsed = JSON.parse(storedPatient);
              pid = parsed.patient_id || parsed.id;
            } catch (e) {
              console.error("Local patient storage invalid");
            }
          }
        }

        if (pid && pid !== 'me') {
          // Replace URL if it says 'me'
          if (patientId === 'me') {
            navigate(`/patient/${pid}`, { replace: true });
          }

          const [data, streak, emotions] = await Promise.allSettled([
            getProgress(pid),
            getStreak(pid),
            getEmotionTrends(pid)
          ]);
          if (data.status === 'fulfilled') setProgressData(data.value);
          if (streak.status === 'fulfilled') setStreakData(streak.value);
          if (emotions.status === 'fulfilled') setEmotionData(emotions.value);
        }
      } catch (err) {
        console.error('Failed to load progress', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId, user]);

  const tasks = progressData?.tasks || progressData?.progress || [];
  const alertTasks = tasks.filter(t => t.clinician_alert === true);

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-12 mt-4">
      {/* Patient alert banner — persistent, not dismissible */}
      {alertTasks.length > 0 && (
        <div className="w-full p-4 md:p-6 border-4 border-[#121212] bg-[#F0C020] shadow-[8px_8px_0px_0px_#121212]">
          <p className="font-sans font-bold text-base md:text-lg text-[#121212] uppercase flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="bg-white p-2 border-2 border-[#121212] shrink-0 shadow-[2px_2px_0px_0px_#121212]">
              <AlertTriangle size={24} className="text-[#D02020] fill-[#D02020]" />
            </div>
            Your therapist has been notified about a change in your progress. Continue practising as normal.
          </p>
        </div>
      )}

      {/* Header - Bauhaus Poster Style */}
      <div className="border-4 border-[#121212] p-6 md:p-12 xl:p-16 bg-[#1040C0] shadow-[12px_12px_0px_0px_#121212] flex flex-col justify-between items-start gap-10 relative overflow-hidden group">
        
        {/* Decorative Geometric Overlay */}
        <div className="absolute -right-20 -bottom-20 w-[400px] h-[400px] rounded-full border-[16px] border-[#121212] opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
        <div className="absolute right-1/4 top-10 w-32 h-32 bg-[#F0C020] border-4 border-[#121212] rotate-45 opacity-20 group-hover:rotate-90 transition-transform duration-500 pointer-events-none" />

        <div className="flex flex-col z-10 w-full xl:w-2/3">
          <h1 className="text-5xl sm:text-7xl lg:text-[100px] font-sans font-black uppercase text-white tracking-tighter leading-[0.85] drop-shadow-[4px_4px_0px_#121212]">
            Welcome<br/>Back,
          </h1>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-black text-[#F0C020] uppercase tracking-tighter leading-none mt-4 sm:mt-8 drop-shadow-[2px_2px_0px_#121212] truncate">
            {user?.username || 'Patient'}
          </h2>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 items-stretch z-10 w-full mt-2">
          {/* Streak Counter */}
          <div className="flex flex-col items-center bg-[#D02020] border-4 border-[#121212] p-4 sm:p-6 shadow-[6px_6px_0px_0px_#121212] hover:-translate-y-1 transition-transform flex-1 min-w-[140px] relative overflow-hidden group/card text-center">
            <Flame size={32} className="mb-2 text-[#F0C020] relative z-10" />
            <span className="font-sans text-4xl sm:text-6xl font-black text-white relative z-10">{streakData?.current_streak ?? 0}</span>
            <span className="font-sans text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest mt-2 relative z-10">Day Streak</span>
            {(streakData?.longest_streak || 0) > 0 && (
              <span className="font-mono text-[10px] text-[#F0C020] mt-1 relative z-10 font-bold">Best: {streakData.longest_streak}</span>
            )}
          </div>
          
          <div className="flex flex-col items-center bg-white border-4 border-[#121212] p-4 sm:p-6 shadow-[6px_6px_0px_0px_#121212] hover:-translate-y-1 transition-transform flex-1 min-w-[140px] relative overflow-hidden group/card text-center">
            <div className="absolute -left-4 -top-4 w-12 h-12 bg-[#F0C020] border-2 border-[#121212] rotate-12 group-hover/card:rotate-45 transition-transform" />
            <Calendar size={32} className="mb-2 text-[#D02020] relative z-10" />
            <span className="font-sans text-4xl sm:text-6xl font-black relative z-10">{tasks.length || 0}</span>
            <span className="font-sans text-[10px] sm:text-xs font-bold text-[#121212] uppercase tracking-widest mt-2 relative z-10">Active Tasks</span>
          </div>

          <div className="flex flex-col items-center bg-white border-4 border-[#121212] p-4 sm:p-6 shadow-[6px_6px_0px_0px_#121212] hover:-translate-y-1 transition-transform flex-1 min-w-[140px] relative overflow-hidden group/card text-center">
            <div className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full bg-[#1040C0] border-2 border-[#121212] group-hover/card:scale-125 transition-transform" />
            <TrendingUp size={32} className="mb-2 text-[#F0C020] relative z-10" />
            <span className="font-sans text-4xl sm:text-6xl font-black text-[#D02020] relative z-10">
              {tasks.length > 0 ? Math.round(tasks.reduce((a, t) => a + (t.overall_accuracy || 0), 0) / tasks.length) : 0}%
            </span>
            <span className="font-sans text-[10px] sm:text-xs font-bold text-[#121212] uppercase tracking-widest mt-2 relative z-10">Avg Accuracy</span>
          </div>
        </div>
      </div>

      {/* Progress Chart Container */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <h3 className="font-sans text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-widest text-[#121212] border-b-8 border-[#121212] pb-2">Your Progress</h3>
        <div className="p-4 md:p-8 bg-white border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] w-full overflow-x-auto">
          <div className="min-w-[600px]">
            <ProgressChart
              data={progressData}
              advanceThreshold={tasks[0]?.advance_threshold || 75}
              dropThreshold={tasks[0]?.drop_threshold || 50}
            />
          </div>
        </div>
      </div>

      {/* Emotion Trends Card */}
      {emotionData?.trends?.length > 0 && (
        <div className="flex flex-col gap-4 sm:gap-6">
          <h3 className="font-sans text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-widest text-[#121212] border-b-8 border-[#121212] pb-2">Emotion Trends</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {emotionData.trends.slice(0, 4).map((t, i) => {
              const EmotionIcon = t.dominant_emotion === 'happy' ? Smile : t.dominant_emotion === 'sad' ? Frown : Meh;
              const emotionColor = t.dominant_emotion === 'happy' ? '#1040C0' : t.dominant_emotion === 'sad' ? '#D02020' : '#F0C020';
              return (
                <div key={i} className="border-4 border-[#121212] p-4 bg-white shadow-[4px_4px_0px_0px_#121212] flex flex-col items-center gap-2 text-center hover:-translate-y-1 transition-transform">
                  <EmotionIcon size={32} style={{ color: emotionColor }} />
                  <span className="font-sans text-sm md:text-base font-black uppercase" style={{ color: emotionColor }}>{t.dominant_emotion || 'neutral'}</span>
                  <span className="font-mono text-xs text-[#999]">{t.session_date}</span>
                  <div className="w-full bg-[#F0F0F0] border-2 border-[#121212] h-4 mt-2">
                    <div className="h-full" style={{ width: `${(t.avg_engagement || 50)}%`, backgroundColor: emotionColor }}></div>
                  </div>
                  <span className="font-mono text-[10px] text-[#999] uppercase font-bold mt-1">Engagement</span>
                </div>
              );
            })}
          </div>
          {emotionData.chronic_frustration && (
            <div className="p-4 md:p-6 border-4 border-[#121212] bg-[#D02020] text-white shadow-[6px_6px_0px_0px_#121212] flex items-center gap-4">
              <AlertTriangle size={24} className="shrink-0" />
              <span className="font-sans font-bold uppercase tracking-wide text-sm md:text-base">Chronic Frustration Detected — Please inform your therapist</span>
            </div>
          )}
        </div>
      )}

      {/* Next Session CTA */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <h3 className="font-sans text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-widest text-[#121212] border-b-8 border-[#121212] pb-2">Next Activity</h3>
        <button className="bg-[#D02020] border-4 border-[#121212] flex flex-col md:flex-row items-center justify-center p-6 md:p-10 gap-6 shadow-[12px_12px_0px_0px_#121212] hover:-translate-y-2 hover:bg-[#A01010] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-200 group cursor-pointer w-full relative overflow-hidden">
           {/* Abstract Geometric Deco */}
           <div className="absolute left-0 top-0 h-full w-24 md:w-32 bg-[#F0C020] border-r-4 border-[#121212] hidden md:flex items-center justify-center">
             <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212]" />
           </div>

           <div className="w-20 h-20 md:w-24 md:h-24 bg-white border-4 border-[#121212] rounded-full flex items-center justify-center shadow-[6px_6px_0px_0px_#121212] group-hover:scale-110 group-hover:shadow-[8px_8px_0px_0px_#121212] transition-all duration-200 z-10 md:ml-32 shrink-0">
             <Play size={40} className="text-[#1040C0] fill-[#1040C0] translate-x-1 md:w-12 md:h-12" />
           </div>
           
           <span className="font-sans font-black text-4xl sm:text-5xl md:text-6xl uppercase text-white tracking-widest z-10 drop-shadow-[4px_4px_0px_#121212]">Start Session</span>
           
           <div className="absolute -right-16 top-1/2 -translate-y-1/2 opacity-20 hidden lg:block">
             <div className="w-64 h-64 border-8 border-white bg-transparent bh-triangle rotate-90" />
           </div>
        </button>
      </div>

      {/* Task Cards Grid */}
      {tasks.length > 0 && (
        <div className="flex flex-col gap-6">
          <h3 className="font-sans text-3xl md:text-4xl font-black uppercase tracking-widest text-[#121212] border-b-8 border-[#121212] pb-2">Active Tasks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {tasks.map((t, i) => (
              <DashboardTaskCard
                key={i}
                task_name={t.task_name}
                task_type={t.task_type}
                level_name={t.level_name || t.current_level}
                overall_accuracy={t.overall_accuracy}
                consecutive_passes={t.consecutive_passes}
                clinician_alert={t.clinician_alert}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientHome;
