import React from 'react';
import { AlertTriangle } from 'lucide-react';
import LevelBadge from '../shared/LevelBadge';

const typeColors = {
  articulation: 'bg-[#D02020] text-white border-2 border-[#121212]',
  fluency: 'bg-[#1040C0] text-white border-2 border-[#121212]',
  cognition: 'bg-[#F0C020] text-[#121212] border-2 border-[#121212]',
};

const DashboardTaskCard = ({ task_name, task_type, level_name, overall_accuracy, consecutive_passes, clinician_alert }) => {
  const typeStyle = typeColors[task_type?.toLowerCase()] || 'bg-white text-[#121212] border-2 border-[#121212]';
  const streakDots = Math.min(consecutive_passes || 0, 3);
  
  // Decide geometric shape randomly or based on name length for visual interest
  const isCircle = task_name?.length % 2 === 0;

  return (
    <div className="neo-panel p-6 bg-white border-4 border-[#121212] relative flex flex-col gap-4 shadow-[8px_8px_0px_0px_#121212] hover:-translate-y-1 transition-transform duration-200 mt-2 mr-2">
      {/* Bauhaus Decorative Corner Element */}
      <div className={`absolute -top-3 -right-3 w-6 h-6 border-2 border-[#121212] shadow-[2px_2px_0px_0px_#121212] z-10 ${isCircle ? 'rounded-full bg-[#D02020]' : 'rounded-none bg-[#1040C0]'}`} />

      {clinician_alert && (
        <div className="absolute top-2 right-4" title="Therapist has been notified">
          <AlertTriangle size={24} className="text-[#D02020] fill-white" />
        </div>
      )}

      <div className="flex items-center gap-2 pr-6">
        <h3 className="font-sans font-black text-2xl uppercase tracking-tighter text-[#121212] line-clamp-2 leading-[0.9] pt-1">{task_name}</h3>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-2">
        <LevelBadge level={level_name || 'easy'} />
        <span className={`font-sans text-xs font-black uppercase px-2 py-0.5 shadow-[2px_2px_0px_0px_#121212] ${typeStyle}`}>
          {task_type}
        </span>
      </div>

      {/* Accuracy bar */}
      <div className="flex flex-col gap-1 mt-auto pt-4">
        <div className="flex justify-between items-end mb-1">
          <span className="font-sans text-sm font-bold text-[#121212] uppercase tracking-wider">Accuracy</span>
          <span className="font-sans text-xl font-black">{overall_accuracy ?? 0}%</span>
        </div>
        <div className="w-full h-4 bg-[#F0F0F0] border-2 border-[#121212] relative overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-[#1040C0] border-r-2 border-[#121212] transition-all duration-300 ease-out"
            style={{ width: `${overall_accuracy ?? 0}%` }}
          />
        </div>
      </div>

      {/* Streak dots */}
      <div className="flex items-center gap-2 mt-1">
        <span className="font-sans text-sm font-bold text-[#121212] uppercase tracking-wider mr-1">Streak</span>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`w-4 h-4 border-2 border-[#121212] ${i < streakDots ? 'bg-[#F0C020] shadow-[2px_2px_0px_0px_#121212]' : 'bg-[#E0E0E0]'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardTaskCard;
