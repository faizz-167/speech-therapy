import React from 'react';

const DefectProfileCard = ({ defectProfile = [] }) => {
  const significantDefects = defectProfile.filter(d => d.severity_label !== 'Within Normal Limits');
  const displayDefects = significantDefects.length > 0 ? significantDefects : defectProfile;
  const allNormal = significantDefects.length === 0 && defectProfile.length > 0;

  const severityColor = (label) => {
    switch (label) {
      case 'Severe': return { bar: '#FF2E2E', text: 'text-white', bg: 'bg-[#FF2E2E]' };
      case 'Moderate': return { bar: '#CCFF00', text: 'text-black', bg: 'bg-[#CCFF00]' };
      case 'Mild': return { bar: '#000000', text: 'text-white', bg: 'bg-black' };
      default: return { bar: '#F0F0F0', text: 'text-black', bg: 'bg-neo-surface' };
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto border-4 border-neo-border p-8 md:p-12 bg-neo-bg mb-12 mt-8 shadow-[12px_12px_0px_0px_#000] relative z-10">
      <h2 className="text-4xl md:text-6xl font-sans font-black uppercase tracking-tighter mb-6 text-neo-text text-stroke-2 drop-shadow-[2px_2px_0px_var(--color-neo-accent)]" style={{ WebkitTextStrokeColor: 'black', color: 'var(--color-neo-bg)' }}>Your Assessment Results</h2>
      <div className="w-full h-2 bg-neo-border mb-8 border-t-4 border-b-4 border-neo-border border-dashed"></div>

      {allNormal ? (
        <div className="text-center py-16 bg-neo-accent border-4 border-neo-border shadow-[8px_8px_0px_0px_#000] rotate-1">
          <span className="text-neo-text text-8xl font-black block mb-4">✓</span>
          <p className="font-sans font-black text-3xl text-neo-text uppercase tracking-widest">No significant defects identified</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {displayDefects.map((d, i) => {
            const colors = severityColor(d.severity_label);
            return (
              <div key={i} className="border-4 border-neo-border p-6 bg-neo-surface flex flex-col gap-4 shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-sans font-bold text-sm text-neo-text/80 uppercase tracking-widest block mb-1 bg-neo-bg border-2 border-neo-border px-1 inline-block">{d.defect_code}</span>
                    <h3 className="font-sans font-black text-2xl text-neo-text uppercase tracking-tight">{d.defect_name}</h3>
                  </div>
                  <span className={`font-sans text-sm font-black uppercase tracking-widest ${colors.text} ${colors.bg} px-3 py-1 border-4 border-neo-border shadow-[2px_2px_0px_0px_#000] rotate-3`}>{d.severity_label}</span>
                </div>
                <div className="w-full h-6 bg-neo-bg border-4 border-neo-border overflow-hidden shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                  <div className="h-full transition-all duration-500 bg-neo-text border-r-4 border-neo-border flex justify-end" style={{ width: `${d.severity_score}%` }}>
                      <div className="h-full w-2 bg-white opacity-50 mr-1"></div>
                  </div>
                </div>
                <span className="font-sans font-black text-neo-text text-right block text-xl">{d.severity_score}%</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="font-sans font-bold text-black/60 text-sm md:text-base mt-10 text-center uppercase tracking-widest border-t-2 border-neo-border pt-4">
        These results will guide your personalised therapy plan.
      </p>
    </div>
  );
};

export default DefectProfileCard;
