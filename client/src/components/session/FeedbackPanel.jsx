import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import AdaptiveAction from './AdaptiveAction';

/* ── Animated ScoreGauge ── */
const ScoreGauge = ({ score = 0, advanceThreshold = 75, dropThreshold = 50, size = 180 }) => {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 400; // Bauhaus fast mechanical snap
    const from = 0;
    const to = score || 0;

    const animate = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4); // sharper ease out
      setDisplayed(Math.round(from + (to - from) * ease));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [score]);

  const r = (size - 32) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (displayed / 100) * circumference;

  const arcColor = displayed >= advanceThreshold ? '#CCFF00'
    : displayed >= dropThreshold ? '#FFFFFF'
    : '#FF2E2E';

  return (
    <div className="flex flex-col items-center bg-neo-surface border-4 border-neo-border p-8 relative overflow-hidden group shadow-[8px_8px_0px_0px_#000] -rotate-1">
      {/* Decorative corner */}
      <div className="absolute -left-8 -top-8 w-16 h-16 bg-neo-bg border-4 border-neo-border rotate-45 group-hover:rotate-90 transition-transform duration-300" />
      
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-neo-bg)" strokeWidth="24" className="drop-shadow-[2px_2px_0px_#000]" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={arcColor} strokeWidth="24" strokeLinecap="butt"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke 0.2s ease-out' }}
        />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          className="font-sans font-black" style={{ fontSize: '4rem', stroke: 'black', strokeWidth: '2px' }} fill="white">
          {displayed}
        </text>
      </svg>
    </div>
  );
};

/* ── Horizontal Bar ── */
const Bar = ({ value = 0, max = 100, color = 'var(--color-neo-accent)', label }) => (
  <div className="flex flex-col gap-2 w-full">
    <div className="flex justify-between items-end">
      {label && <span className="font-sans text-sm font-black text-neo-text uppercase tracking-widest drop-shadow-[1px_1px_0px_var(--color-neo-accent)]">{label}</span>}
      <span className="font-sans font-black text-2xl text-neo-text leading-none mb-1 text-stroke-1 drop-shadow-[2px_2px_0px_#FFF]">{typeof value === 'number' ? (value > 1 ? Math.round(value) : (value * 100).toFixed(0) + '%') : value}</span>
    </div>
    <div className="w-full h-8 bg-neo-bg border-4 border-neo-border overflow-hidden shadow-[4px_4px_0px_0px_#000] -rotate-1">
      <div className="h-full transition-all duration-200 ease-out border-r-4 border-neo-border" style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }}></div>
    </div>
  </div>
);

/* ── Result Badge ── */
const ResultBadge = ({ result, adaptiveAction }) => {
  const badges = {
    pass: { text: 'PASS', bg: '#CCFF00', textColor: '#000000' },
    partial: { text: 'PARTIAL', bg: '#FFFFFF', textColor: '#000000' },
    low_confidence: { text: 'LOW QUALITY AUDIO', bg: '#000000', textColor: '#FFFFFF' },
  };

  let badge;
  if (result === 'fail') {
    badge = adaptiveAction === 'drop'
      ? { text: 'LEVEL DOWN', bg: '#FF2E2E', textColor: '#FFFFFF' }
      : { text: 'TRY AGAIN', bg: '#FFFFFF', textColor: '#000000' };
  } else {
    badge = badges[result] || badges.partial;
  }

  return (
    <span className="inline-block font-sans text-2xl font-black uppercase px-8 py-3 border-4 border-neo-border shadow-[4px_4px_0px_0px_#000] rotate-2"
      style={{ backgroundColor: badge.bg, color: badge.textColor }}>
      {badge.text}
    </span>
  );
};

/* ── Main FeedbackPanel ── */
const FeedbackPanel = ({ result, prompt, advanceThreshold = 75, dropThreshold = 50, onNext, onRetry }) => {
  const [activeTab, setActiveTab] = useState('pronunciation');

  if (!result) return null;

  const {
    accuracy_score, result: resultType, feedback_message, adaptive_action,
    low_confidence_flag, review_recommended, breakdown = {}
  } = result;

  const isLowConf = low_confidence_flag === true;
  const isWarmup = prompt?.prompt_type === 'warmup' || resultType === 'warmup_complete';

  // Don't show for warmup
  if (isWarmup) return null;

  // ── Build tabs ──
  const tabs = [];
  tabs.push({ id: 'pronunciation', label: 'Pronunciation' });
  tabs.push({ id: 'fluency', label: 'Fluency' });
  if (breakdown?.emotion) tabs.push({ id: 'engagement', label: 'Engagement' });
  if (breakdown?.nlp) tabs.push({ id: 'nlp', label: 'NLP' });

  const renderTab = () => {
    switch (activeTab) {
      case 'pronunciation': {
        const ph = breakdown?.phoneme;
        return (
          <div className="flex flex-col gap-8">
            <Bar value={ph?.phoneme_accuracy || 0} label="Phoneme Accuracy" color="var(--color-neo-accent)" />
            {ph?.per_word_results?.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-2 p-6 border-4 border-neo-border bg-neo-surface shadow-[4px_4px_0px_0px_#000]">
                <span className="w-full font-sans font-black text-sm uppercase tracking-widest text-neo-text">Word Breakdown</span>
                {ph.per_word_results.map((w, i) => {
                  const c = w.status === 'correct' ? 'bg-neo-bg text-neo-text border-neo-border'
                    : w.status === 'distortion' ? 'bg-neo-accent text-neo-text border-neo-border'
                    : 'bg-[#FF2E2E] text-white border-[#000]';
                  return (
                    <span key={i} className={`font-sans font-black text-base px-4 py-2 border-4 shadow-[2px_2px_0px_0px_#000] -rotate-1 hover:rotate-2 transition-transform ${c}`}
                      title={`Expected: ${w.expected_phoneme || '?'} → Produced: ${w.produced_phoneme || '?'}`}>
                      {w.word || w.expected_phoneme || '?'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
      case 'fluency': {
        const asr = breakdown?.asr;
        return (
          <div className="flex flex-col gap-8">
            <Bar value={asr?.fluency_score || 0} label="Fluency Score" color="var(--color-neo-accent)" />
            <div className="flex gap-8">
              <div className="flex-1 bg-neo-bg border-4 border-neo-border p-6 text-center shadow-[4px_4px_0px_0px_#000] rotate-1">
                <span className="font-sans font-black text-sm text-neo-text uppercase block tracking-widest border-b-4 border-neo-border pb-2 mb-3">WPM</span>
                <span className="font-sans text-5xl font-black text-neo-text">{asr?.wpm || 0}</span>
              </div>
              <div className="flex-1 bg-neo-bg border-4 border-neo-border p-6 text-center shadow-[4px_4px_0px_0px_#000] -rotate-2">
                <span className="font-sans font-black text-sm text-neo-text uppercase block tracking-widest border-b-4 border-neo-border pb-2 mb-3">Disfluencies</span>
                <span className="font-sans text-5xl font-black text-[#FF2E2E]">{asr?.disfluency_count || 0}</span>
              </div>
            </div>
            <Bar value={asr?.confidence_score || 0} label="Confidence" color="var(--color-neo-text)" />
          </div>
        );
      }
      case 'engagement': {
        const em = breakdown?.emotion;
        if (!em) return null;
        return (
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4 mb-2 bg-neo-text text-neo-bg p-4 border-4 border-neo-border shadow-[4px_4px_0px_0px_var(--color-neo-accent)] rotate-1">
              <span className="font-sans text-sm font-black uppercase tracking-widest">Emotion:</span>
              <span className="font-sans text-2xl font-black uppercase text-neo-accent tracking-tighter">{em.label || 'neutral'}</span>
            </div>
            <Bar value={em.behavioral_score || 0} label="Behavioral Score" color="var(--color-neo-accent)" />
            <Bar value={em.engagement_score || 0} label="Engagement Score" color="var(--color-neo-accent)" />
            {/* Frustration warning */}
            {em.frustration_score > 0.40 ? (
              <div className="flex items-center gap-4 p-4 border-4 border-neo-border bg-neo-bg shadow-[8px_8px_0px_0px_#000] -rotate-1 mt-4">
                <div className="bg-[#FF2E2E] p-4 border-4 border-neo-border shrink-0 rotate-6 drop-shadow-[2px_2px_0px_#000]">
                  <AlertTriangle size={32} className="text-white fill-white" />
                </div>
                <span className="font-sans font-black text-xl text-neo-text uppercase tracking-wide">High frustration detected — consider taking a short break</span>
              </div>
            ) : (
              <Bar value={em.frustration_score || 0} max={1} label="Frustration" color="#FF2E2E" />
            )}
          </div>
        );
      }
      case 'nlp': {
        const nlp = breakdown?.nlp;
        if (!nlp) return null;
        return (
          <div className="flex flex-col gap-8">
            <Bar value={nlp.topic_score || 0} label="Topic Coverage" />
            <Bar value={nlp.who_score || 0} label="Who/Subject Clarity" />
            <Bar value={nlp.outcome_score || 0} label="Outcome/Conclusion" />
          </div>
        );
      }
      default: return null;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto border-4 border-neo-border p-8 md:p-12 bg-neo-bg flex flex-col items-center gap-10 shadow-[12px_12px_0px_0px_#000]">
      {/* Score gauge */}
      <ScoreGauge score={accuracy_score || 0} advanceThreshold={advanceThreshold} dropThreshold={dropThreshold} />

      {/* Result badge */}
      {resultType && <ResultBadge result={resultType} adaptiveAction={adaptive_action} />}

      {/* Low confidence banner */}
      {isLowConf && (
        <div className="w-full p-6 border-4 border-neo-border bg-neo-surface shadow-[8px_8px_0px_0px_#000]">
          <p className="font-sans text-xl font-black text-neo-text uppercase tracking-wide">
            Recording quality was too low to score this attempt. It has not been counted toward your progress.
            <br/><br/>Try again in a quieter environment with the mic closer to you.
          </p>
        </div>
      )}

      {/* Feedback message */}
      {feedback_message && (
        <div className="w-full border-4 border-neo-border p-8 bg-neo-surface text-center shadow-[8px_8px_0px_0px_#000] rotate-1">
          <p className="font-sans font-black text-2xl md:text-3xl text-neo-text">"{feedback_message}"</p>
        </div>
      )}

      {/* Adaptive Action — hidden on low confidence */}
      {!isLowConf && <AdaptiveAction action={adaptive_action} />}

      {/* Breakdown tabs */}
      <div className="w-full border-4 border-neo-border bg-neo-bg shadow-[8px_8px_0px_0px_#000]">
        <div className="flex border-b-4 border-neo-border overflow-x-auto bg-neo-surface">
          {tabs.map(tab => (
             <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-5 px-4 font-sans text-sm md:text-base font-black uppercase tracking-widest transition-colors whitespace-nowrap focus:outline-none ${
                activeTab === tab.id ? 'bg-neo-text text-neo-bg border-b-4 border-neo-text' : 'bg-neo-surface text-neo-text hover:bg-neo-bg hover:text-neo-text border-b-4 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6 md:p-8 bg-neo-bg min-h-[300px]">{renderTab()}</div>
      </div>

      {/* Next / Retry button */}
      <button
         onClick={isLowConf ? onRetry : onNext}
         className="w-full py-8 mt-6 border-4 border-neo-border bg-neo-accent text-neo-text font-sans font-black text-4xl uppercase tracking-widest shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#000] active:translate-y-1 active:shadow-[4px_4px_0px_0px_#000] transition-all focus:outline-none"
      >
        {isLowConf ? 'TRY AGAIN' : 'NEXT'}
      </button>
    </div>
  );
};

export default FeedbackPanel;
