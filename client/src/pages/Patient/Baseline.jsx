import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import {
  Mic, Square, ArrowRight, ChevronRight,
  Image, Volume2, Trophy, Sparkles, RotateCcw,
  Star, Zap, Target, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_ITEMS_PER_SECTION = 7;

const RECORDABLE_TYPES = new Set([
  'read_aloud', 'picture_naming', 'word_repetition', 'sentence_repetition',
  'non_word_repetition', 'syllable_repetition', 'minimal_pairs',
  'sentence_reading', 'paragraph_reading', 'free_speech',
  'free_description', 'story_retell', 'sequence_recitation', 'repetition'
]);

const MOTIVATIONAL = [
  { min: 90, msg: 'ABSOLUTELY CRUSHED IT', emoji: '🎯', bg: '#22C55E' },
  { min: 75, msg: 'SOLID PERFORMANCE', emoji: '💪', bg: '#34D399' },
  { min: 60, msg: 'GREAT EFFORT', emoji: '🌟', bg: '#FFD93D' },
  { min: 40, msg: 'KEEP PUSHING', emoji: '🔥', bg: '#FF6B6B' },
  { min: 0,  msg: 'EVERY TRY COUNTS', emoji: '✨', bg: '#C4B5FD' },
];

function getFeedback(score) {
  return MOTIVATIONAL.find(m => score >= m.min) || MOTIVATIONAL[MOTIVATIONAL.length - 1];
}

function getUnsplashUrl(keyword) {
  if (!keyword) return null;
  return `https://source.unsplash.com/480x360/?${encodeURIComponent(keyword)}`;
}

// ── Decorative floating shape ──
function FloatingShape({ className, children }) {
  return (
    <div className={`absolute pointer-events-none select-none ${className}`}>
      {children}
    </div>
  );
}

export default function Baseline() {
  const { user } = useAuth();
  const { get, upload, post } = useApi();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('loading');
  const [exercises, setExercises] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scores, setScores] = useState({});
  const [lastResult, setLastResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pulseKey, setPulseKey] = useState(0); // forces re-mount for animations

  const {
    isRecording, audioBlob, startRecording, stopRecording, error: recError
  } = useAudioRecorder();

  // ── Load exercises ──
  useEffect(() => {
    const load = async () => {
      try {
        const baselines = await get('/baselines');
        if (!baselines?.length) {
          toast.error('No baseline assessments available.');
          navigate('/patient/home');
          return;
        }
        const primaryId = baselines[0].baseline_id;
        const sections = await get(`/baselines/${primaryId}/sections`);
        let allExercises = [];
        for (const section of sections) {
          const items = (section.items || [])
            .filter(item => RECORDABLE_TYPES.has(item.response_type))
            .slice(0, MAX_ITEMS_PER_SECTION);
          items.forEach((item, idx) => {
            allExercises.push({
              ...item,
              sectionName: section.section_name || section.name || 'Assessment',
              sectionItemIndex: idx,
              sectionItemTotal: items.length,
            });
          });
        }
        if (allExercises.length === 0) {
          toast.error('No exercises found for this assessment.');
          navigate('/patient/home');
          return;
        }
        setExercises(allExercises);
        setPhase('exercise');
      } catch (err) {
        console.error(err);
        toast.error('Failed to load assessment.');
        navigate('/patient/home');
      }
    };
    load();
  }, []);

  // ── Auto-submit when recording stops ──
  useEffect(() => {
    if (audioBlob && !isRecording && phase === 'exercise') {
      handleSubmitAudio(audioBlob);
    }
  }, [audioBlob, isRecording]);

  const currentExercise = exercises[currentIdx] || null;
  const progress = exercises.length > 0 ? ((currentIdx) / exercises.length) * 100 : 0;

  const handleMicClick = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const handleSubmitAudio = async (blob) => {
    if (!currentExercise) return;
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'baseline.webm');
      const expectedText = currentExercise.display_content
        || currentExercise.stimulus_content
        || currentExercise.item_label || '';
      formData.append('expected_text', expectedText);
      const res = await upload('/patients/baseline-analyze', formData);
      const itemId = currentExercise.item_id || currentExercise.id;
      setScores(prev => ({
        ...prev,
        [itemId]: {
          accuracy: res.accuracy || 0,
          fluency: res.fluency || 0,
          speech_score: res.speech_score || 0,
          final_score: res.final_score || 0,
          transcription: res.transcription || '',
        }
      }));
      setLastResult({
        score: Math.round(res.final_score || res.accuracy || 0),
        transcription: res.transcription || '',
        accuracy: Math.round(res.accuracy || 0),
      });
      setPhase('feedback');
    } catch (err) {
      console.error(err);
      setLastResult({ score: 50, transcription: '', accuracy: 50 });
      setPhase('feedback');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = () => {
    setLastResult(null);
    setPulseKey(k => k + 1);
    if (currentIdx < exercises.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setPhase('exercise');
    } else {
      handleComplete();
    }
  };

  const handleRetry = () => {
    setLastResult(null);
    setPulseKey(k => k + 1);
    setPhase('exercise');
  };

  const handleComplete = async () => {
    setPhase('submitting');
    try {
      const allScores = Object.values(scores);
      const avg = (key) => {
        const vals = allScores.map(s => s[key] || 0);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      };
      const tasksData = {};
      for (const [itemId, s] of Object.entries(scores)) {
        tasksData[itemId] = { accuracy: s.accuracy, fluency: s.fluency, speech_score: s.speech_score };
      }
      await post('/patients/baseline-results', {
        accuracy: parseFloat(avg('accuracy').toFixed(1)),
        fluency: parseFloat(avg('fluency').toFixed(1)),
        emotional_tone: 70, phoneme_accuracy: 0, speech_rate: 0,
        engagement_score: 0,
        speech_score: parseFloat(avg('speech_score').toFixed(1)),
        tasks_data: tasksData,
      });
      setPhase('complete');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save results.');
      setPhase('feedback');
    }
  };

  const playTTS = (text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  // ═══════════════════════════════════════════════
  //  LOADING
  // ═══════════════════════════════════════════════
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFFDF5] bg-grid flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-8">
          <div className="w-24 h-24 bg-[#FF6B6B] border-4 border-black shadow-[8px_8px_0px_0px_#000] flex items-center justify-center animate-bounce rotate-12">
            <Zap size={48} className="text-black" strokeWidth={3} />
          </div>
          <div className="bg-black text-[#FFD93D] px-8 py-4 border-4 border-black shadow-[6px_6px_0px_0px_#FFD93D] -rotate-2">
            <p className="font-black text-2xl uppercase tracking-widest animate-pulse">Loading Assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //  COMPLETE
  // ═══════════════════════════════════════════════
  if (phase === 'complete') {
    const totalScore = Object.values(scores).length > 0
      ? Math.round(Object.values(scores).reduce((acc, s) => acc + (s.final_score || s.accuracy || 0), 0) / Object.values(scores).length)
      : 0;
    const fb = getFeedback(totalScore);

    return (
      <div className="min-h-screen bg-[#FFFDF5] bg-halftone flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative shapes */}
        <FloatingShape className="top-10 left-10 animate-spin" style={{animationDuration: '10s'}}>
          <Star size={64} className="text-[#FFD93D] fill-[#FFD93D]" strokeWidth={3} />
        </FloatingShape>
        <FloatingShape className="bottom-20 right-16">
          <div className="w-20 h-20 bg-[#C4B5FD] border-4 border-black rotate-45 shadow-[4px_4px_0px_0px_#000]" />
        </FloatingShape>
        <FloatingShape className="top-1/4 right-10">
          <div className="w-12 h-12 bg-[#FF6B6B] border-4 border-black rounded-full shadow-[3px_3px_0px_0px_#000]" />
        </FloatingShape>

        <div className="max-w-lg w-full flex flex-col items-center gap-8 relative z-10">
          {/* Trophy box */}
          <div className="w-36 h-36 bg-[#FFD93D] border-4 border-black flex items-center justify-center rotate-3 shadow-[12px_12px_0px_0px_#000]">
            <Trophy size={72} className="text-black" strokeWidth={2.5} />
          </div>

          {/* Title with text-stroke */}
          <div className="text-center">
            <h1 className="text-stroke-2 text-6xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Assessment
            </h1>
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-[#FF6B6B] -mt-2 -rotate-2">
              Complete!
            </h1>
          </div>

          {/* Score card */}
          <div className="w-full bg-white border-4 border-black p-8 shadow-[10px_10px_0px_0px_#000] -rotate-1 relative">
            {/* Corner badge */}
            <div className="absolute -top-5 -right-5 bg-[#FF6B6B] border-4 border-black px-4 py-2 shadow-[4px_4px_0px_0px_#000] rotate-6">
              <span className="font-black text-white text-sm uppercase tracking-widest">{fb.emoji} {fb.msg}</span>
            </div>

            <div className="flex items-end justify-between mb-6 pb-4 border-b-4 border-black">
              <span className="font-black uppercase tracking-widest text-sm text-black">Overall Score</span>
              <span className="text-6xl font-black leading-none" style={{ color: fb.bg }}>
                {totalScore}<span className="text-3xl">%</span>
              </span>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="flex-1 bg-[#F5F5F0] border-4 border-black p-4 text-center shadow-[3px_3px_0px_0px_#000]">
                <span className="block font-black text-3xl text-black">{exercises.length}</span>
                <span className="font-bold text-xs uppercase tracking-widest text-black/60">Exercises</span>
              </div>
              <div className="flex-1 bg-[#F5F5F0] border-4 border-black p-4 text-center shadow-[3px_3px_0px_0px_#000]">
                <span className="block font-black text-3xl text-black">{Object.keys(scores).length}</span>
                <span className="font-bold text-xs uppercase tracking-widest text-black/60">Recorded</span>
              </div>
            </div>

            <p className="font-bold text-base text-black/70 leading-relaxed">
              Your therapist will review your results and create a personalized therapy plan.
            </p>
          </div>

          <button
            onClick={() => navigate('/patient/home')}
            className="w-full py-5 px-8 bg-black text-[#FFFDF5] border-4 border-black font-black uppercase text-xl tracking-widest flex items-center justify-center gap-3 shadow-[6px_6px_0px_0px_#FFD93D] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#FFD93D] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all duration-100"
          >
            Dashboard <ArrowRight size={24} strokeWidth={3} />
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //  SUBMITTING
  // ═══════════════════════════════════════════════
  if (phase === 'submitting') {
    return (
      <div className="fixed inset-0 bg-[#FFFDF5] bg-halftone z-50 flex flex-col items-center justify-center gap-8">
        <div className="w-24 h-24 bg-black border-4 border-[#FFD93D] flex items-center justify-center shadow-[8px_8px_0px_0px_#FFD93D]"
             style={{ animation: 'spin 1.5s linear infinite' }}>
          <Sparkles size={40} className="text-[#FFD93D]" strokeWidth={3} />
        </div>
        <div className="bg-[#FFD93D] border-4 border-black px-10 py-5 shadow-[8px_8px_0px_0px_#000] -rotate-1">
          <p className="font-black text-2xl uppercase tracking-widest text-black animate-pulse">
            Saving Results...
          </p>
        </div>
      </div>
    );
  }

  if (!currentExercise) return null;

  const responseType = currentExercise.response_type || 'read_aloud';
  const displayContent = currentExercise.display_content || currentExercise.stimulus_content || currentExercise.item_label || '';
  const taskName = currentExercise.task_name || currentExercise.item_label || 'Exercise';
  const instruction = currentExercise.instruction || '';
  const imageKeyword = currentExercise.image_keyword || currentExercise.item_label;
  const isPictureNaming = responseType === 'picture_naming';
  const isRepetitionType = ['word_repetition', 'sentence_repetition', 'non_word_repetition', 'syllable_repetition'].includes(responseType);

  // ═══════════════════════════════════════════════
  //  FEEDBACK
  // ═══════════════════════════════════════════════
  if (phase === 'feedback' && lastResult) {
    const fb = getFeedback(lastResult.score);
    const isLast = currentIdx >= exercises.length - 1;

    return (
      <div className="min-h-screen bg-[#FFFDF5] bg-grid p-4 md:p-8 relative overflow-hidden">
        {/* Decorative */}
        <FloatingShape className="top-8 right-8">
          <Star size={40} className="text-[#FFD93D] fill-[#FFD93D]" strokeWidth={3} />
        </FloatingShape>
        <FloatingShape className="bottom-16 left-8">
          <div className="w-16 h-16 bg-[#C4B5FD] border-4 border-black -rotate-12 shadow-[3px_3px_0px_0px_#000]" />
        </FloatingShape>

        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 relative z-10">
          {/* Progress */}
          <div className="w-full">
            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-black/60 mb-2">
              <span>Exercise {currentIdx + 1}/{exercises.length}</span>
              <span>{Math.round(((currentIdx + 1) / exercises.length) * 100)}%</span>
            </div>
            <div className="h-5 border-4 border-black bg-white overflow-hidden">
              <div className="h-full transition-all duration-500" style={{ width: `${((currentIdx + 1) / exercises.length) * 100}%`, backgroundColor: fb.bg }} />
            </div>
          </div>

          {/* Score card */}
          <div className="w-full bg-white border-4 border-black shadow-[12px_12px_0px_0px_#000] relative overflow-hidden">
            {/* Color band top */}
            <div className="h-3 w-full" style={{ backgroundColor: fb.bg }} />

            <div className="p-8 md:p-12 flex flex-col items-center gap-6">
              {/* Score circle */}
              <div className="relative">
                <div
                  className="w-40 h-40 border-4 border-black flex flex-col items-center justify-center rotate-2 shadow-[8px_8px_0px_0px_#000]"
                  style={{ backgroundColor: fb.bg }}
                >
                  <span className="text-7xl font-black text-black leading-none">{lastResult.score}</span>
                  <span className="text-2xl font-black text-black/60">%</span>
                </div>
                {/* Emoji sticker */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_#000] rotate-12 text-xl">
                  {fb.emoji}
                </div>
              </div>

              {/* Message banner */}
              <div className="bg-black text-white px-8 py-4 border-4 border-black shadow-[6px_6px_0px_0px_#FFD93D] -rotate-1 w-full max-w-md text-center">
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
                  {fb.msg}
                </h2>
              </div>

              {/* Transcription */}
              {lastResult.transcription && (
                <div className="w-full bg-[#F5F5F0] border-4 border-black p-5 shadow-[4px_4px_0px_0px_#000] rotate-1">
                  <span className="block font-black text-xs uppercase tracking-widest text-black/50 mb-2 border-b-2 border-black pb-1">
                    What we heard
                  </span>
                  <p className="font-bold text-lg text-black italic leading-relaxed">
                    "{lastResult.transcription}"
                  </p>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="p-6 border-t-4 border-black bg-[#F5F5F0] flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleRetry}
                className="flex-1 py-4 px-6 bg-white border-4 border-black font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100 text-black"
              >
                <RotateCcw size={18} strokeWidth={3} /> Retry
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-4 px-6 bg-[#FF6B6B] text-white border-4 border-black font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
              >
                {isLast ? 'Finish' : 'Next'} <ChevronRight size={18} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //  ANALYZING
  // ═══════════════════════════════════════════════
  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] bg-halftone flex flex-col items-center justify-center gap-8 p-6">
        <div className="relative">
          <div className="w-28 h-28 bg-[#FF6B6B] border-4 border-black shadow-[8px_8px_0px_0px_#000] flex items-center justify-center"
               style={{ animation: 'spin 2s linear infinite' }}>
            <Target size={48} className="text-white" strokeWidth={3} />
          </div>
          {/* Pulsing ring */}
          <div className="absolute inset-0 w-28 h-28 border-4 border-[#FF6B6B] animate-ping opacity-30" />
        </div>
        <div className="bg-black px-10 py-5 border-4 border-black shadow-[8px_8px_0px_0px_#FFD93D] -rotate-1">
          <p className="font-black text-2xl uppercase tracking-widest text-[#FFD93D] animate-pulse">
            Analyzing Speech...
          </p>
        </div>
        <p className="font-bold text-sm uppercase tracking-widest text-black/40">
          AI is evaluating your pronunciation
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //  EXERCISE SCREEN
  // ═══════════════════════════════════════════════
  return (
    <div key={pulseKey} className="min-h-screen bg-[#FFFDF5] bg-grid relative overflow-hidden">
      {/* ── Floating decorative shapes ── */}
      <FloatingShape className="top-16 right-4 md:right-12 opacity-40">
        <Star size={32} className="text-[#FFD93D] fill-[#FFD93D]" strokeWidth={3} />
      </FloatingShape>
      <FloatingShape className="bottom-32 left-4 opacity-30">
        <div className="w-14 h-14 bg-[#C4B5FD] border-4 border-black rotate-45 shadow-[3px_3px_0px_0px_#000]" />
      </FloatingShape>
      <FloatingShape className="top-1/3 left-2 opacity-20">
        <div className="w-8 h-8 bg-[#FF6B6B] border-4 border-black rounded-full" />
      </FloatingShape>

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-20 flex flex-col gap-6 relative z-10">

        {/* ═══ TOP BAR: Title + Step counter ═══ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-black leading-none">
            Baseline Assessment
          </h1>
          <div className="bg-[#C4B5FD] border-4 border-black px-5 py-2 shadow-[4px_4px_0px_0px_#000] rotate-2 font-black text-sm uppercase tracking-widest text-black whitespace-nowrap">
            Step {currentIdx + 1}/{exercises.length}
          </div>
        </div>

        {/* ═══ PROGRESS BAR with section name ═══ */}
        <div>
          <div className="flex justify-between text-xs font-black uppercase tracking-widest text-black/50 mb-2">
            <span>{currentExercise.sectionName}</span>
            <span>Item {currentExercise.sectionItemIndex + 1}/{currentExercise.sectionItemTotal}</span>
          </div>
          <div className="h-6 border-4 border-black bg-white overflow-hidden relative">
            <div
              className="h-full bg-[#FF6B6B] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
            {/* Progress percentage inside bar */}
            <span className="absolute inset-0 flex items-center justify-center font-black text-xs text-black/70 uppercase tracking-widest">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* ═══ TASK HEADER — sticker style ═══ */}
        <div className="bg-black text-[#FFFDF5] border-4 border-black p-6 -rotate-1 shadow-[8px_8px_0px_0px_#FFD93D] relative">
          {/* Target phoneme badge */}
          {currentExercise.target_phoneme && (
            <div className="absolute -top-4 -right-4 bg-[#FF6B6B] text-white border-4 border-black px-3 py-1 shadow-[3px_3px_0px_0px_#000] rotate-6 font-black text-xs uppercase tracking-widest z-10">
              {currentExercise.target_phoneme}
            </div>
          )}

          <h2 className="font-black text-2xl md:text-3xl uppercase tracking-tighter leading-tight text-[#FFFDF5]">
            {taskName}
          </h2>
          {instruction && (
            <p className="font-bold text-sm md:text-base text-[#FFFDF5]/70 mt-2 uppercase tracking-wide leading-snug">
              {instruction}
            </p>
          )}
        </div>

        {/* ═══ TYPE BADGE ═══ */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bg-[#C4B5FD] text-black font-black text-xs uppercase tracking-widest px-4 py-2 border-4 border-black shadow-[3px_3px_0px_0px_#000] rotate-1">
            {responseType.replace(/_/g, ' ')}
          </span>
        </div>

        {/* ═══ STIMULUS CARD ═══ */}
        <div className="w-full bg-white border-4 border-black min-h-[320px] md:min-h-[360px] flex flex-col items-center justify-center shadow-[10px_10px_0px_0px_#000] relative overflow-hidden">
          {/* Top color strip */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#FFD93D]" />

          <div className="p-8 md:p-12 w-full flex flex-col items-center justify-center gap-6">
            {isPictureNaming ? (
              /* ── PICTURE NAMING ── */
              <div className="flex flex-col items-center gap-6 w-full">
                <div className="w-full max-w-sm aspect-[4/3] bg-[#F5F5F0] border-4 border-black overflow-hidden shadow-[6px_6px_0px_0px_#000] rotate-1 relative">
                  <img
                    src={getUnsplashUrl(imageKeyword)}
                    alt="Name this"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-full h-full items-center justify-center bg-[#F5F5F0] p-4 absolute inset-0">
                    <Image size={64} className="text-black/20" />
                  </div>
                </div>
                <div className="bg-[#FFD93D] border-4 border-black px-6 py-3 shadow-[4px_4px_0px_0px_#000] -rotate-1">
                  <p className="font-black text-base uppercase tracking-widest text-black">
                    Name what you see
                  </p>
                </div>
              </div>
            ) : isRepetitionType ? (
              /* ── REPETITION ── */
              <div className="flex flex-col items-center gap-8 w-full">
                <button
                  onClick={() => playTTS(displayContent)}
                  className="w-20 h-20 rounded-full border-4 border-black bg-[#FF6B6B] flex items-center justify-center shadow-[4px_4px_0px_0px_#000] hover:scale-105 active:scale-95 active:shadow-none transition-all duration-100"
                  aria-label="Listen to word"
                >
                  <Volume2 size={36} className="text-white" strokeWidth={3} />
                </button>
                <div className="bg-[#F5F5F0] border-4 border-black p-6 md:p-8 w-full text-center shadow-[4px_4px_0px_0px_#000]">
                  <h3 className="text-5xl md:text-7xl font-black text-black tracking-tighter leading-none">
                    {displayContent}
                  </h3>
                </div>
                <div className="bg-black px-6 py-2 border-4 border-black shadow-[3px_3px_0px_0px_#FFD93D] rotate-1">
                  <p className="font-black text-sm uppercase tracking-widest text-[#FFD93D]">
                    Listen, then repeat
                  </p>
                </div>
              </div>
            ) : (
              /* ── READ ALOUD / FREE SPEECH / DEFAULT ── */
              <div className="flex flex-col items-center gap-6 w-full">
                {responseType === 'paragraph_reading' || responseType === 'sentence_reading' ? (
                  <div className="w-full bg-[#F5F5F0] border-4 border-black p-6 md:p-8 shadow-[6px_6px_0px_0px_#000]">
                    <p className="font-bold text-xl md:text-2xl text-black leading-relaxed text-center whitespace-pre-line">
                      {displayContent}
                    </p>
                  </div>
                ) : (
                  <h3 className="text-4xl md:text-6xl font-black text-black text-center tracking-tighter leading-tight px-4">
                    {displayContent}
                  </h3>
                )}
                <div className="bg-black px-6 py-2 border-4 border-black shadow-[3px_3px_0px_0px_#C4B5FD] -rotate-1">
                  <p className="font-black text-sm uppercase tracking-widest text-[#C4B5FD]">
                    {responseType === 'free_speech' || responseType === 'free_description' || responseType === 'story_retell'
                      ? 'Speak freely'
                      : 'Read aloud clearly'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ MICROPHONE SECTION ═══ */}
        <div className="flex flex-col items-center gap-5 mt-2">
          {/* Mic button */}
          <div className="relative">
            <button
              onClick={handleMicClick}
              disabled={isAnalyzing}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              className={`
                relative z-10 w-32 h-32 rounded-full border-4 border-black flex items-center justify-center
                transition-all duration-100
                ${isRecording
                  ? 'bg-[#EF4444] rotate-6 shadow-[6px_6px_0px_0px_#000] scale-110'
                  : 'bg-black shadow-[8px_8px_0px_0px_#000] hover:-translate-y-2 hover:shadow-[10px_10px_0px_0px_#000] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none'
                }
              `}
            >
              {isRecording ? (
                <Square size={44} className="text-white fill-white" />
              ) : (
                <Mic size={44} className="text-[#FFFDF5]" strokeWidth={2.5} />
              )}
            </button>
            {/* Ping ring when recording */}
            {isRecording && (
              <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-[#EF4444] animate-ping opacity-30 -z-10" />
            )}
          </div>

          {/* Status label */}
          <div className={`
            px-8 py-3 border-4 border-black font-black uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_#000]
            transition-all duration-100
            ${isRecording ? 'bg-[#EF4444] text-white rotate-1 shadow-[4px_4px_0px_0px_#FFD93D]' : 'bg-[#FFD93D] text-black -rotate-1'}
          `}>
            {isRecording ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-white rounded-full animate-pulse" /> Recording... Tap to Stop
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Mic size={16} strokeWidth={3} /> Tap to Record
              </span>
            )}
          </div>

          {recError && (
            <div className="bg-[#FF6B6B] border-4 border-black px-4 py-2 shadow-[3px_3px_0px_0px_#000]">
              <p className="font-bold text-sm text-white uppercase tracking-widest">{recError}</p>
            </div>
          )}
        </div>

        {/* ═══ SEGMENT DOTS ═══ */}
        <div className="flex gap-[3px] justify-center mt-6 flex-wrap px-4">
          {exercises.map((_, i) => (
            <div
              key={i}
              className={`
                h-3 border-2 border-black transition-all duration-200
                ${i < currentIdx
                  ? 'bg-[#22C55E] w-3'
                  : i === currentIdx
                    ? 'bg-[#FFD93D] w-6 scale-110'
                    : 'bg-white w-3'
                }
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
