import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Flame, Play, Clock, AlertTriangle, FileText, ClipboardList, ArrowRight } from 'lucide-react';
import { patientsAPI } from '../../api/patients';
import { getPlans } from '../../api/plans';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import LoadingState from '../../components/shared/LoadingState';

export default function PatientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [streak, setStreak] = useState(null);
  const [baselines, setBaselines] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pData, sData, bData, plansData] = await Promise.all([
          patientsAPI.getPatient(user.id),
          patientsAPI.getStreak(user.id),
          patientsAPI.getBaselineResults(user.id).catch(() => []),
          getPlans(user.id).catch(() => [])
        ]);
        setPatient(pData);
        setStreak(sData);
        setBaselines(bData);
        if (plansData?.length > 0) {
          // Assume the latest or first plan is the active one
          setActivePlan(plansData[0]);
        }
      } catch (error) {
        console.error("Error fetching patient home data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchData();
  }, [user.id]);

  const handleStartSession = async () => {
    if (!activePlan?.plan_id) {
      toast.error('No active therapy plan assigned.');
      return;
    }
    setStarting(true);
    try {
      const res = await api.post('/sessions', {
        patient_id: user.id,
        plan_id: activePlan.plan_id
      });
      navigate(`/patient/session/${res.data.session_id}`);
    } catch (error) {
      toast.error('Could not start session.');
      setStarting(false);
    }
  };

  const handleTakeBaseline = () => {
    navigate('/patient/baseline');
  };

  if (loading) return <LoadingState message="LOADING DASHBOARD..." />;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-12 pt-8 px-4 pb-16">
      {/* HEADER */}
      <div className="flex flex-col border-b-4 border-black pb-8 rotate-1">
        <p className="font-mono text-xl uppercase font-bold text-black/70 tracking-widest mb-2">
          Patient Portal
        </p>
        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-black leading-none drop-shadow-[4px_4px_0px_#FFD93D]">
          Welcome,<br/>{user?.name?.split(' ')[0]}.
        </h1>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* MAIN PANEL */}
        <div className="lg:col-span-2 bh-panel p-8 md:p-12 flex flex-col justify-between min-h-[400px] -rotate-1 relative z-10 bg-white">
          <div className="absolute -top-4 -left-4 scale-125 bg-[#FFD93D] text-black font-black uppercase text-sm border-4 border-black px-3 py-1 shadow-[4px_4px_0px_0px_#000] -rotate-[10deg] z-20">
            Action Req
          </div>
          {baselines.length === 0 ? (
            <div className="flex flex-col h-full justify-between items-start gap-12 bg-[#C4B5FD] p-8 md:p-12 border-4 border-black shadow-[8px_8px_0px_0px_#000]">
              <div>
                <ClipboardList size={64} className="text-black mb-6 stroke-[3]" />
                <h2 className="text-5xl md:text-6xl font-black uppercase text-black leading-none tracking-tighter mb-4">
                  Assessment<br/>Required
                </h2>
                <p className="text-xl font-bold text-black/80 max-w-md">
                  We need to understand your current speech patterns before building your therapy plan.
                </p>
              </div>
              <button 
                onClick={handleTakeBaseline}
                className="bh-button w-full md:w-auto bg-[#FFD93D] text-black border-4 border-black flex items-center justify-between gap-4 text-xl py-5 px-8 shadow-[6px_6px_0px_0px_#000] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] active:translate-y-[6px] active:translate-x-[6px] active:shadow-none transition-all"
              >
                <span className="font-black uppercase tracking-widest">Begin Assessment</span>
                <Play size={28} fill="currentColor" className="stroke-[3]" />
              </button>
            </div>
          ) : !activePlan ? (
             <div className="flex flex-col h-full justify-center items-center text-center p-8 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000]">
               <div className="w-24 h-24 bg-[#FFD93D] border-4 border-black flex items-center justify-center mb-8 rotate-3 shadow-[4px_4px_0px_0px_#000]">
                 <FileText size={48} className="text-black" />
               </div>
               <h2 className="text-4xl font-black uppercase text-black mb-4 tracking-tighter">Analysis Complete</h2>
               <p className="text-lg font-bold text-black/80 max-w-md">
                 Your clinical provider is currently reviewing your baseline and generating a customized therapy plan. Please check back later.
               </p>
             </div>
          ) : (
            <div className="flex flex-col h-full justify-between gap-12 p-4">
              <div className="max-w-md">
                <div className="inline-flex items-center gap-2 bg-[#FF6B6B] text-white font-black uppercase tracking-widest px-3 py-1 text-sm border-4 border-black mb-6 shadow-[4px_4px_0px_0px_#000]">
                  <span className="w-3 h-3 bg-white border-2 border-black rounded-full animate-pulse" /> Active Plan
                </div>
                <h2 className="text-5xl md:text-7xl font-black uppercase text-black leading-none tracking-tighter mb-4">
                  Today's<br/>Exercises
                </h2>
                <p className="text-xl font-bold text-black/80">
                  Complete your daily circuit to maintain your streak and accelerate recovery.
                </p>
              </div>
              <button 
                onClick={handleStartSession}
                disabled={starting}
                className="bh-button bg-[#FFD93D] text-black w-full md:w-auto text-2xl py-6 px-10 flex items-center justify-between group border-4 border-black shadow-[6px_6px_0px_0px_#000] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] active:translate-y-[6px] active:translate-x-[6px] active:shadow-none transition-all"
              >
                <span className="font-black uppercase tracking-widest">{starting ? 'PREPARING...' : 'START EXERCISES'}</span>
                {!starting && <Play size={32} fill="currentColor" className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          )}
        </div>

        {/* SIDE PANELS */}
        <div className="flex flex-col gap-12 z-0">
          {/* STREAK */}
          <div className="bh-panel bg-black text-[#FFFDF5] p-8 flex flex-col items-center justify-center min-h-[200px] rotate-2">
            <Flame size={64} className="text-[#FF6B6B] fill-[#FF6B6B] mb-4" />
            <span className="text-8xl font-black tracking-tighter leading-none mb-2">
              {streak?.current_streak || 0}
            </span>
            <span className="font-mono text-sm font-bold uppercase tracking-widest text-[#FFFDF5] block px-4 py-1 border-4 border-[#FFFDF5] mt-2 shadow-[4px_4px_0px_0px_#FFD93D]">
              Day Streak
            </span>
          </div>

          {/* ACTION ITEMS */}
          <div className="bh-panel p-8 bg-white flex flex-col gap-6 flex-1 -rotate-2 border-4 border-black shadow-[8px_8px_0px_0px_#000]">
            <h3 className="font-black uppercase tracking-widest text-xl text-black border-b-4 border-black pb-4">
              Actions
            </h3>
            <button 
              onClick={handleTakeBaseline}
              className="w-full py-4 px-6 bg-[#FFD93D] border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all font-bold uppercase text-sm flex items-center justify-between group text-black"
            >
              <span className="flex items-center gap-3">
                <Clock size={20} className="stroke-[3]" /> Update Baseline
              </span>
              <ArrowRight size={20} className="stroke-[3] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
