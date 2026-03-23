import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { dismissAlert } from '../../api/patients';
import toast from 'react-hot-toast';

const AlertsBanner = ({ alerts = [], onDismiss }) => {
  if (!alerts || alerts.length === 0) return null;

  const handleDismiss = async (progressId) => {
    try {
      await dismissAlert(progressId);
      if (onDismiss) onDismiss(progressId);
    } catch (err) {
      toast.error('Failed to dismiss alert');
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 mb-8">
      {alerts.map(a => (
        <div key={a.id} className="w-full bg-[#D02020] border-4 border-[#121212] flex items-start p-4 md:p-6 gap-4 animate-in slide-in-from-top-4 shadow-[6px_6px_0px_0px_#121212]">
          <div className="p-3 bg-white border-4 border-[#121212] text-[#D02020]">
            <AlertTriangle size={24} strokeWidth={3} />
          </div>
          <div className="flex-1 mt-1">
            <h3 className="font-sans text-xl font-black text-white uppercase tracking-widest">Regression Alert</h3>
            <p className="font-sans text-white mt-2 font-bold text-lg md:text-xl leading-tight">
              Patient ID: {a.patient_id} has dropped performance by {a.progress_delta}% on Task {a.task_id}.
            </p>
          </div>
          <button 
            onClick={() => handleDismiss(a.id)}
            className="p-3 border-4 border-[#121212] bg-white text-[#121212] hover:bg-[#F0F0F0] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#121212] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertsBanner;
