import React from 'react';

const ScoreGauge = ({ score, label }) => {
  const arcColor = score >= 80 ? '#1040C0' : score >= 50 ? '#F0C020' : '#D02020';

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        className="relative w-32 h-32 rounded-full border-8 border-[#121212] flex items-center justify-center bg-white overflow-hidden shadow-[8px_8px_0px_0px_#121212]"
      >
        <div 
          className="absolute inset-0"
          style={{ 
            background: `conic-gradient(${arcColor} ${score}%, transparent 0)`
          }}
        ></div>
        
        {/* Inner circle for text */}
        <div className="absolute inset-3 rounded-full border-4 border-[#121212] bg-white flex items-center justify-center">
          <span className="font-sans text-4xl font-black text-[#121212]">{score}</span>
        </div>
      </div>
      {label && <span className="font-sans text-sm font-black uppercase tracking-widest text-[#121212] bg-white px-3 py-1 border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212]">{label}</span>}
    </div>
  );
};

export default ScoreGauge;
