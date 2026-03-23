import React, { useState } from 'react';
import ScoreGauge from '../shared/ScoreGauge';
import { ChevronRight, RefreshCw, AlertTriangle } from 'lucide-react';

const FeedbackPanel = ({ result, prompt, onNext, onRetry }) => {
  const [activeTab, setActiveTab] = useState('summary');

  if (!result) return null;

  const isWarmup = prompt?.scoring_rules?.active === false;

  if (isWarmup) {
    return (
      <div className="w-full max-w-2xl mx-auto border-4 border-[#121212] p-8 md:p-12 mt-8 flex flex-col items-center bg-white shadow-[12px_12px_0px_0px_#121212]">
        <h3 className="font-sans text-3xl font-black uppercase mb-4 text-[#1040C0] tracking-tighter">Warmup Complete</h3>
        <p className="font-sans text-lg font-bold text-[#121212] mb-10 text-center">Great job! Ready to start the actual exercises?</p>
        <button onClick={onNext} className="w-full max-w-xs py-4 border-4 border-[#121212] bg-[#1040C0] text-white font-sans text-xl font-black uppercase tracking-widest flex items-center justify-center gap-4 shadow-[6px_6px_0px_0px_#121212] hover:bg-[#082080] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all focus:outline-none">
          CONTINUE <ChevronRight size={28} strokeWidth={3} />
        </button>
      </div>
    );
  }

  const {
    final_score = 0,
    adaptive_action,
    clinician_alert,
    feedback_message,
    asr_data = {},
    phoneme_data = {}
  } = result;

  const tabs = [
    { id: 'summary', label: 'OVERVIEW' },
    { id: 'asr', label: 'SPEECH REC' },
    { id: 'phoneme', label: 'PHONETIC' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 bg-white border-4 border-[#121212] shadow-[16px_16px_0px_0px_#121212] flex flex-col">
      {/* Bauhaus Tabs */}
      <div className="flex border-b-4 border-[#121212] overflow-x-auto bg-[#F0F0F0]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 px-6 font-sans font-black text-sm md:text-base tracking-widest border-r-4 border-[#121212] last:border-r-0 transition-colors whitespace-nowrap focus:outline-none
              ${activeTab === tab.id ? 'bg-[#121212] text-white' : 'text-[#121212] hover:bg-white'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6 md:p-10 bg-white min-h-[400px]">
        {activeTab === 'summary' && (
          <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
            <div className="flex-shrink-0">
              <ScoreGauge score={Math.round(final_score)} label="OVERALL" />
            </div>
            <div className="flex-1 flex flex-col gap-6 w-full">
              <div className="p-6 border-4 border-[#121212] bg-[#F0F0F0] shadow-[6px_6px_0px_0px_#121212]">
                <p className="font-sans font-bold text-xl text-[#121212] italic">"{feedback_message || "Good effort."}"</p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                {adaptive_action && (
                  <span className="font-sans font-black text-sm uppercase tracking-widest bg-[#1040C0] text-white px-4 py-2 border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212]">
                    Action: {adaptive_action}
                  </span>
                )}
                {clinician_alert && (
                  <span className="font-sans font-black text-sm uppercase tracking-widest bg-[#D02020] text-white px-4 py-2 border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] flex items-center gap-2">
                    <AlertTriangle size={18} strokeWidth={3} /> ALERT NOTIFIED
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'asr' && (
          <div className="flex flex-col gap-8 font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-4 border-[#121212] p-6 bg-white shadow-[6px_6px_0px_0px_#121212]">
                <span className="block font-bold text-xs uppercase text-[#1040C0] tracking-widest mb-2 border-b-2 border-[#121212] pb-1">Transcript</span>
                <span className="font-bold text-lg text-[#121212]">{asr_data.transcript || 'N/A'}</span>
              </div>
              <div className="border-4 border-[#121212] p-6 bg-[#F0F0F0] shadow-[6px_6px_0px_0px_#121212]">
                <span className="block font-bold text-xs uppercase text-[#121212] tracking-widest mb-2 border-b-2 border-[#121212] pb-1">Target</span>
                <span className="font-bold text-lg text-[#121212]">{prompt?.target_text || 'N/A'}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              <div className="border-4 border-[#121212] p-6 bg-white text-center shadow-[6px_6px_0px_0px_#1040C0]">
                <span className="font-bold text-sm text-[#121212] uppercase tracking-widest block mb-2">WPM</span>
                <span className="font-black text-4xl text-[#121212]">{Math.round(asr_data.wpm || 0)}</span>
              </div>
              <div className="border-4 border-[#121212] p-6 bg-white text-center shadow-[6px_6px_0px_0px_#F0C020]">
                <span className="font-bold text-sm text-[#121212] uppercase tracking-widest block mb-2">Fluency</span>
                <span className="font-black text-4xl text-[#121212]">{Math.round((asr_data.fluency_score || 0) * 100)}%</span>
              </div>
              <div className="border-4 border-[#121212] p-6 bg-white text-center shadow-[6px_6px_0px_0px_#D02020]">
                <span className="font-bold text-sm text-[#121212] uppercase tracking-widest block mb-2">Confidence</span>
                <span className="font-black text-4xl text-[#121212]">{Math.round((asr_data.confidence || 0) * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'phoneme' && (
          <div className="flex flex-col gap-6 font-sans overflow-x-auto">
            <div className="border-4 border-[#121212] bg-white max-h-96 overflow-y-auto shadow-[8px_8px_0px_0px_#121212]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#121212] text-white sticky top-0 z-10">
                  <tr>
                    <th className="p-4 font-black text-sm uppercase tracking-widest border-b-4 border-[#121212]">Target</th>
                    <th className="p-4 font-black text-sm uppercase tracking-widest border-b-4 border-[#121212]">Recognized</th>
                    <th className="p-4 font-black text-sm uppercase tracking-widest border-b-4 border-[#121212]">Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {(phoneme_data.phoneme_alignments || []).map((ph, idx) => (
                    <tr key={idx} className="border-b-4 border-[#121212] last:border-b-0 hover:bg-[#F0F0F0] transition-colors">
                      <td className="p-4 font-black text-lg text-[#121212]">{ph.expected}</td>
                      <td className={`p-4 font-black text-lg ${ph.expected === ph.actual ? 'text-[#121212]' : 'text-[#D02020]'}`}>{ph.actual || '-'}</td>
                      <td className="p-4">
                        <span className={`inline-block px-3 py-1 border-2 border-[#121212] font-black text-sm ${ph.score > 0.8 ? 'bg-[#1040C0] text-white' : ph.score > 0.5 ? 'bg-[#F0C020] text-[#121212]' : 'bg-[#D02020] text-white'}`}>
                          {Math.round(ph.score * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!phoneme_data.phoneme_alignments || phoneme_data.phoneme_alignments.length === 0) && (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-[#121212] font-bold uppercase tracking-widest">No phoneme alignment data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t-4 border-[#121212] bg-[#F0F0F0] flex flex-col sm:flex-row items-center justify-between gap-4">
        <button 
          onClick={onRetry} 
          className="w-full sm:w-auto py-4 px-8 border-4 border-[#121212] bg-white text-[#121212] font-sans font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 shadow-[6px_6px_0px_0px_#121212] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#121212] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all focus:outline-none"
        >
          <RefreshCw size={24} strokeWidth={3} /> RETRY
        </button>
        <button 
          onClick={onNext} 
          className="w-full sm:w-auto py-4 px-10 border-4 border-[#121212] bg-[#1040C0] text-white font-sans font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 shadow-[6px_6px_0px_0px_#121212] hover:bg-[#082080] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#121212] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all focus:outline-none"
        >
          NEXT <ChevronRight size={28} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default FeedbackPanel;
