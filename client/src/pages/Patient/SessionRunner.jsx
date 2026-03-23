import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionQueue } from '../../hooks/useSessionQueue';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { submitAttempt, completeSession } from '../../api/sessions';
import toast from 'react-hot-toast';

import PromptCard from '../../components/session/PromptCard';
import AudioRecorder from '../../components/assessment/AudioRecorder';
import FeedbackPanel from '../../components/session/FeedbackPanel';
import AdaptiveAction from '../../components/session/AdaptiveAction';
import LoadingState from '../../components/shared/LoadingState';

const PROCESSING_LABELS = [
  'Checking pronunciation...',
  'Measuring fluency...',
  'Computing your score...',
];

const SessionRunner = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const {
    currentPrompt, currentIndex, totalPrompts, isComplete,
    loading: queueLoading, prompts, fetchQueue, nextPrompt
  } = useSessionQueue(sessionId);

  const {
    isRecording, audioBlob, responseLatencySec,
    startRecording, stopRecording, buildFormData
  } = useAudioRecorder();

  // ── 7-state machine ──
  const [state, setState] = useState('loading');
  const [result, setResult] = useState(null);
  const [processingLabel, setProcessingLabel] = useState(0);
  const [results, setResults] = useState([]); // all exercise results for summary
  const [sessionSummary, setSessionSummary] = useState(null); // from /complete
  const [taskSwitchOverlay, setTaskSwitchOverlay] = useState(null); // task switch transition

  // Adaptive threshold data from queue payload
  const [thresholdData, setThresholdData] = useState({ advance: 75, drop: 50 });

  // ── Init: fetch queue ──
  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // ── Transition from loading to warmup/recording when queue loads ──
  useEffect(() => {
    if (!queueLoading && state === 'loading' && prompts?.length > 0) {
      const first = prompts[0];
      setState(first?.prompt_type === 'warmup' ? 'warmup' : 'recording');
    }
  }, [queueLoading, prompts, state]);

  // ── Processing label cycling ──
  useEffect(() => {
    if (state !== 'processing') return;
    const interval = setInterval(() => {
      setProcessingLabel(prev => (prev + 1) % PROCESSING_LABELS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [state]);

  // ── Audio blob submission ──
  useEffect(() => {
    if (state !== 'processing' || !audioBlob) return;

    const submit = async () => {
      try {
        const formData = buildFormData();
        const isWarmup = currentPrompt?.prompt_type === 'warmup';

        if (isWarmup) {
          // Still submit to backend but don't show feedback
          try {
            await submitAttempt(sessionId, currentPrompt.prompt_id || currentPrompt.id, formData);
          } catch (_) { /* warmup failure is non-blocking */ }
          toast.success('Good practice! Now let\'s try the real one.', { duration: 2000 });

          // Advance to exercise
          const hasNext = nextPrompt();
          setState(hasNext ? 'recording' : 'complete');
          return;
        }

        // Exercise submission
        const res = await submitAttempt(sessionId, currentPrompt.prompt_id || currentPrompt.id, formData);
        setResult(res);
        setResults(prev => [...prev, res]);

        // Extract thresholds from response
        if (res.advance_threshold || res.adaptive_threshold) {
          setThresholdData({
            advance: res.advance_threshold || res.adaptive_threshold?.advance_to_next_level || 75,
            drop: res.drop_threshold || res.adaptive_threshold?.drop_to_easier_level || 50,
          });
        }

        setState('feedback');

        // Check for task switch
        if (res.adaptive_action === 'switched_task') {
          setTaskSwitchOverlay({
            message: res.feedback_message || 'Switching to a related exercise...',
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to process audio.");
        setState('recording');
      }
    };

    submit();
  }, [state, audioBlob]);

  // ── Recording controls ──
  const handleToggleRecording = useCallback(() => {
    if (state === 'warmup' || state === 'recording') {
      if (!isRecording) {
        startRecording();
      } else {
        stopRecording();
        setState('processing');
      }
    }
  }, [state, isRecording, startRecording, stopRecording]);

  // ── Next prompt ──
  const handleNext = useCallback(() => {
    setResult(null);
    const hasNext = nextPrompt();
    if (!hasNext) {
      setState('complete');
      return;
    }
    // Check next prompt type
    const next = prompts?.[currentIndex + 1];
    setState(next?.prompt_type === 'warmup' ? 'warmup' : 'recording');
    setTaskSwitchOverlay(null); // clear overlay
  }, [nextPrompt, prompts, currentIndex]);

  // ── Retry (for low confidence) ──
  const handleRetry = useCallback(() => {
    setResult(null);
    setState('recording');
  }, []);

  // ── Session summary stats ──
  const summary = useMemo(() => {
    const exerciseResults = results.filter(r => r && r.accuracy_score !== null && r.accuracy_score !== undefined);
    const total = results.length;
    const avgScore = exerciseResults.length > 0
      ? Math.round(exerciseResults.reduce((a, r) => a + (r.accuracy_score || 0), 0) / exerciseResults.length)
      : 0;
    const passes = results.filter(r => r?.result === 'pass').length;
    const partials = results.filter(r => r?.result === 'partial').length;
    const fails = results.filter(r => r?.result === 'fail').length;
    return { total, avgScore, passes, partials, fails };
  }, [results]);

  // ── RENDER BY STATE ──

  if (state === 'loading' || queueLoading) {
    return <LoadingState message="PREPARING SESSION..." />;
  }

  // ── COMPLETE ──
  if (state === 'complete' || isComplete) {
    // Fire session complete API call on mount
    if (!sessionSummary) {
      completeSession(sessionId)
        .then(data => setSessionSummary(data))
        .catch(err => console.error('Session complete failed', err));
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 md:p-12 mt-16 max-w-2xl mx-auto bg-neo-bg border-4 border-neo-border shadow-[12px_12px_0px_0px_#000] gap-8 relative z-10 -rotate-1">
        <h2 className="text-5xl md:text-7xl font-sans font-black uppercase text-neo-text tracking-tighter text-center leading-[0.9] text-stroke-2 drop-shadow-[2px_2px_0px_var(--color-neo-accent)]" style={{ WebkitTextStrokeColor: 'black', color: 'var(--color-neo-bg)' }}>Session<br/>Complete</h2>

        <div className="w-full grid grid-cols-2 gap-6 z-10">
          <div className="border-4 border-neo-border p-6 text-center bg-neo-surface shadow-[4px_4px_0px_0px_#000]">
            <span className="font-sans text-5xl md:text-6xl font-black text-neo-text">{summary.total}</span>
            <p className="font-sans font-black text-xs md:text-sm text-neo-text/80 uppercase tracking-widest mt-2 border-t-4 border-neo-border pt-2 bg-neo-bg border-4 border-neo-border inline-block px-2">Prompts</p>
          </div>
          <div className="border-4 border-neo-border p-6 text-center bg-neo-bg shadow-[4px_4px_0px_0px_#000]">
            <span className="font-sans text-5xl md:text-6xl font-black text-neo-text">{summary.avgScore}%</span>
            <p className="font-sans font-black text-xs md:text-sm text-neo-text/80 uppercase tracking-widest mt-2 border-t-4 border-neo-border pt-2 bg-neo-bg border-4 border-neo-border inline-block px-2">Avg Score</p>
          </div>
          <div className="border-4 border-neo-border p-6 text-center bg-neo-text shadow-[4px_4px_0px_0px_var(--color-neo-accent)]">
            <span className="font-sans text-5xl md:text-6xl font-black text-neo-bg">{summary.passes}</span>
            <p className="font-sans font-black text-xs md:text-sm text-neo-bg/80 uppercase tracking-widest mt-2 border-t-4 border-neo-bg pt-2 bg-neo-text border-4 border-neo-bg inline-block px-2">Passes</p>
          </div>
          <div className="border-4 border-neo-border p-6 text-center bg-[#FF2E2E] shadow-[4px_4px_0px_0px_#000]">
            <span className="font-sans text-5xl md:text-6xl font-black text-neo-text">{summary.fails}</span>
            <p className="font-sans font-black text-xs md:text-sm text-neo-text/80 uppercase tracking-widest mt-2 border-t-4 border-neo-text pt-2 bg-[#FF2E2E] border-4 border-neo-text inline-block px-2">Fails</p>
          </div>
        </div>

        {/* Streak Update */}
        {sessionSummary?.streak_updated && (
          <div className="w-full p-4 border-4 border-neo-border bg-neo-text text-neo-bg flex items-center justify-center gap-4 rotate-2 shadow-[4px_4px_0px_0px_#000]">
            <span className="text-4xl">🔥</span>
            <span className="font-sans font-black text-2xl uppercase tracking-widest">{sessionSummary.current_streak} Day Streak!</span>
          </div>
        )}

        {/* Emotion Summary */}
        {sessionSummary?.emotion_summary && (
          <div className="w-full p-4 border-4 border-neo-border bg-neo-surface text-center shadow-[4px_4px_0px_0px_#000] -rotate-1 mt-4">
            <span className="font-sans text-sm font-black uppercase tracking-widest block mb-1 text-neo-text/80 bg-neo-bg border-2 border-neo-border inline-block px-2">Session Mood</span>
            <span className="font-sans text-2xl font-black uppercase text-neo-text drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">{sessionSummary.emotion_summary.dominant_emotion || 'Neutral'}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-8 w-full z-10 mt-8">
          <button onClick={() => navigate(-1)} className="flex-1 bh-button bg-neo-surface text-neo-text border-4 border-neo-border py-4 font-sans font-black tracking-widest uppercase">
            End Session
          </button>
          <button onClick={() => navigate(-1)} className="flex-1 bh-button bg-neo-accent text-neo-text border-4 border-neo-border py-4 font-sans uppercase font-black tracking-widest">
            View Progress
          </button>
        </div>
      </div>
    );
  }

  // ── PROCESSING ──
  if (state === 'processing') {
    return (
      <div className="fixed inset-0 bg-neo-surface z-50 flex flex-col items-center justify-center gap-12">
        <div className="relative w-40 h-40 flex items-center justify-center">
           <div className="absolute w-full h-full border-8 border-neo-border rounded-full border-t-neo-accent border-r-neo-accent animate-spin duration-1000" />
           <div className="w-20 h-20 bg-neo-text rotate-12 animate-pulse" />
        </div>
        <div className="bg-neo-bg border-4 border-neo-border p-6 text-center max-w-sm w-full mx-4 shadow-[8px_8px_0px_0px_#000] rotate-2">
          <p className="font-sans font-black text-neo-text text-2xl uppercase tracking-widest">{PROCESSING_LABELS[processingLabel]}</p>
        </div>
      </div>
    );
  }

  // ── FEEDBACK ──
  if (state === 'feedback' && result) {
    return (
      <div className="w-full flex flex-col pt-8 max-w-3xl mx-auto gap-6">
        <FeedbackPanel
          result={result}
          prompt={currentPrompt}
          advanceThreshold={thresholdData.advance}
          dropThreshold={thresholdData.drop}
          onNext={result?.low_confidence_flag ? handleRetry : handleNext}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  // ── WARMUP / RECORDING ──
  return (
    <div className="w-full flex flex-col pt-4 md:pt-8 min-h-[80vh] px-4 pb-16">
      {/* Progress Header */}
      <div className="w-full max-w-3xl mx-auto flex justify-between items-center mb-12 font-sans font-black text-sm uppercase tracking-widest text-neo-text bg-neo-bg border-4 border-neo-border p-4 shadow-[8px_8px_0px_0px_#000] -rotate-1">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 bg-neo-text rounded-full shadow-[2px_2px_0px_0px_var(--color-neo-accent)]" />
          <span className="bg-white px-2 border-2 border-neo-border">Exercise {currentIndex + 1} of {totalPrompts}</span>
        </div>
        {state === 'warmup' && (
          <span className="bg-neo-accent text-neo-text border-4 border-neo-border px-4 py-2 font-black shadow-[2px_2px_0px_0px_#000] rotate-3">PRACTICE</span>
        )}
      </div>

      <PromptCard prompt={currentPrompt} />

      <div className="w-full max-w-3xl mx-auto mt-6">
        <AudioRecorder
          isRecording={isRecording}
          isProcessing={false}
          onToggleRecording={handleToggleRecording}
        />
      </div>
    </div>
  );
};

export default SessionRunner;
