import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { FiArrowLeft, FiActivity, FiCheck, FiRefreshCw, FiArrowRight, FiMic, FiSquare, FiPlay } from 'react-icons/fi';
import AudioRecorder from '../../components/AudioRecorder';
import { Button } from '../../components/ui/button';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, upload } = useApi();
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State Machine
  // 'intro' -> 'recording' -> 'feedback' -> 'completed'
  const [viewState, setViewState] = useState('intro');
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  
  // Interaction State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const [result, setResult] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null); 
  const [sessionTime, setSessionTime] = useState(0);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    get('/tasks/daily')
      .then(data => {
        const found = data.find(t => t.id === id);
        if (found) {
          setTask(found);
          if (found.status === 'completed') {
             setViewState('completed');
          } else if (found.status === 'in_progress' && found.current_prompt_index > 0) {
             setCurrentPromptIndex(found.current_prompt_index);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle starting the sequence
  const handleStartTask = () => {
     setViewState('recording');
     setStartTime(Date.now());
  };

  const handleRecordingComplete = (blob) => {
    setAudioBlob(blob);
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;
    setIsSubmitting(true);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    setSessionTime(duration);
    
    const isFinal = currentPromptIndex === task.stimuli.length - 1;
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('attempt_number', attempt);
      formData.append('session_duration', duration);
      formData.append('is_final_prompt', isFinal);
      formData.append('prompt_index', currentPromptIndex);

      const res = await upload(`/tasks/${task.id}/submit`, formData);
      
      setResult({
          ...res,
          // New multimodal metrics
          finalScore: res.final_score || 0,
          speechScore: res.speech_score || 0,
          wordAccuracy: res.word_accuracy || res.accuracy_score || 0,
          phonemeAccuracy: res.phoneme_accuracy || 0,
          fluency: res.fluency_score || 0,
          speechRate: res.speech_rate || 0,
          confidence: res.confidence_score || 0,
          engagement: res.engagement_score || 0,
          articulation: res.articulation_score || 0,
          performanceLevel: res.performance_level || '',
          // Legacy compat
          accuracy: res.word_accuracy || res.accuracy_score || 0,
          emotional: res.engagement_score || res.emotional_tone_score || 0,
          emotion_label: res.emotion_label || 'neutral',
          transcription: res.transcription || 'Could not produce transcription.',
          pauseRate: res.pause_rate || 0,
          transcriptPercentage: res.transcript_percentage || 0
      });
      
      setViewState('feedback');
      setIsSubmitting(false);

      if (!res.should_retry && !res.suggest_break) {
        setTimeout(() => {
          if (!isFinal) {
            setCurrentPromptIndex(prev => prev + 1);
            setAttempt(1);
            setResult(null);
            setAudioBlob(null);
            setStartTime(Date.now());
            setViewState('recording');
          } else {
            setViewState('completed');
          }
        }, 3000);
      }

    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAttempt(a => a + 1);
    setResult(null);
    setAudioBlob(null);
    setStartTime(Date.now());
    setViewState('recording');
  };

  const handleNextPrompt = () => {
     if (currentPromptIndex < task.stimuli.length - 1) {
        setCurrentPromptIndex(prev => prev + 1);
        setAttempt(1);
        setResult(null);
        setAudioBlob(null);
        setStartTime(Date.now());
        setViewState('recording');
     } else {
        setViewState('completed');
     }
  };

  const handleLowerDifficulty = () => {
     // In a real app, this might trigger a backend call to fetch a different task.
     // For this mockup, we'll simulate skipping to the next prompt or finishing if it's the last one.
     handleNextPrompt();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 text-center">
         <h2 className="text-2xl font-black uppercase inline-block animate-pulse bg-neo-accent px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Loading Task...</h2>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <h2 className="text-2xl font-black uppercase text-red-500 mb-4 bg-white border-4 border-black p-4 inline-block shadow-[4px_4px_0px_0px_#000]">Task not found</h2>
        <br/>
        <Button onClick={() => navigate('/patient/tasks')} className="mt-4">Back to Tasks</Button>
      </div>
    );
  }

  // ----------- INTRO VIEW -----------
  if (viewState === 'intro') {
     return (
        <div className="max-w-4xl mx-auto pb-12">
            <Button onClick={() => navigate('/patient/tasks')} variant="outline" className="gap-2 mb-8">
               <FiArrowLeft strokeWidth={3} /> BACK TO TASKS
            </Button>
            
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-10 neo-lift text-center max-w-3xl mx-auto">
               <span className="neo-badge bg-neo-secondary uppercase mb-6 inline-block">{task.difficulty}</span>
               
               <h1 className="text-5xl font-black uppercase text-black mb-4 leading-tight">{task.task_name}</h1>
               <p className="font-bold text-xl text-black/70 mb-8 max-w-2xl mx-auto">{task.reason}</p>

               <div className="bg-neo-bg border-4 border-black p-8 mb-10 text-left">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/50 mb-3 flex items-center gap-2">
                     <FiActivity strokeWidth={3} /> Instructions
                  </h3>
                  <p className="font-bold text-black text-xl leading-relaxed">{task.instructions || 'You will be shown prompts one by one. Read them aloud clearly and record your voice.'}</p>
               </div>

               <Button 
                  onClick={handleStartTask}
                  className="bg-neo-accent text-black border-4 border-black border-b-8 hover:bg-[#FFE373] hover:-translate-y-1 transition-transform text-2xl py-8 px-12 shadow-[4px_4px_0px_0px_#000]"
               >
                  START TASK <FiPlay className="ml-3 w-8 h-8 fill-black" />
               </Button>
            </div>
        </div>
     );
  }

  // ----------- COMPLETED VIEW -----------
  if (viewState === 'completed') {
      return (
         <div className="max-w-4xl mx-auto pb-12">
            <Button onClick={() => navigate('/patient/tasks')} variant="outline" className="gap-2 mb-8">
               <FiArrowLeft strokeWidth={3} /> BACK TO TASKS
            </Button>
            <div className="bg-[#86EFAC] border-4 border-black shadow-[8px_8px_0px_0px_#000] p-16 text-center rotate-[0.5deg] max-w-2xl mx-auto">
               <div className="w-24 h-24 border-4 border-black bg-white flex items-center justify-center mx-auto mb-6 -rotate-3">
               <FiCheck strokeWidth={3} className="w-12 h-12 text-black" />
               </div>
               <h3 className="text-4xl font-black uppercase text-black mb-4">Task Complete!</h3>
               <p className="font-bold text-black/70 text-xl mb-8">You finished all prompts for this category.</p>
               <Button onClick={() => navigate('/patient/tasks')} className="bg-black text-white text-lg py-6 px-8 hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_#000]">
                  Return to Dashboard
               </Button>
            </div>
         </div>
      );
  }

  // ----------- RECORDING & FEEDBACK VIEWS -----------
  const currentStimulus = task.stimuli[currentPromptIndex];
  const progressText = `Prompt ${currentPromptIndex + 1} of ${task.stimuli.length}`;

  const renderTaskPrompt = (categoryType, stimulus) => {
    // Extract main text (v3 uses display_content or prompt_text; v1 used text or raw string)
    let mainText = stimulus?.display_content || stimulus?.prompt_text || stimulus?.text || (typeof stimulus === 'string' ? stimulus : JSON.stringify(stimulus)) || '';
    let subText = null;

    // The preferred interaction mode is specified on the stimulus in v3, else fallback to category
    const type = stimulus?.task_mode || categoryType;

    if (type === 'roleplay' || type === 'free_speech' || categoryType === 'roleplay') {
       if (mainText.startsWith('Scenario: ')) {
          subText = mainText.substring(0, 10);
          mainText = mainText.substring(10);
       }
       return (
          <div className="flex flex-col items-center justify-center">
             <div className="flex gap-2">
               {stimulus?.prompt_type === 'warmup' && (
                 <h3 className="text-sm font-black uppercase tracking-widest text-[#92400E] bg-[#FEF3C7] px-4 py-1 mb-6 flex justify-center items-center gap-2 border-2 border-[#F59E0B]">
                    🔥 WARMUP
                 </h3>
               )}
               <h3 className="text-sm font-black uppercase tracking-widest text-[#FDE047] bg-black px-4 py-1 mb-6 flex justify-center items-center gap-2">
                  <FiMic strokeWidth={3} /> {type === 'free_speech' ? 'FREE SPEECH' : 'ROLEPLAY'}
               </h3>
             </div>
             {subText && <p className="font-bold text-xl text-black/60 uppercase mb-4 tracking-widest">{subText}</p>}
             <p className="font-black text-4xl md:text-5xl uppercase tracking-tight text-black leading-tight break-words border-l-8 border-[#FDE047] pl-6 text-left">
                {mainText}
             </p>
          </div>
       );
    } 

    if (type === 'breath_control') {
       return (
          <div className="flex flex-col items-center justify-center">
             <div className="flex gap-2">
               {stimulus?.prompt_type === 'warmup' && (
                 <h3 className="text-sm font-black uppercase tracking-widest text-[#92400E] bg-[#FEF3C7] px-4 py-1 mb-6 flex justify-center items-center gap-2 border-2 border-[#F59E0B]">
                    🔥 WARMUP
                 </h3>
               )}
               <h3 className="text-sm font-black uppercase tracking-widest text-[#86EFAC] bg-black px-4 py-1 mb-6 flex justify-center items-center gap-2">
                  <FiActivity strokeWidth={3} /> BREATH CONTROL
               </h3>
             </div>
             <div className="w-32 h-32 rounded-full border-8 border-black flex items-center justify-center mb-8 animate-pulse bg-[#86EFAC]">
                <FiMic className="w-12 h-12 text-black" />
             </div>
             <p className="font-black text-3xl md:text-4xl uppercase tracking-tight text-black leading-tight break-words">
                {mainText}
             </p>
          </div>
       );
    }
    
    if (type === 'minimal_pairs' || type === 'word_drill') {
      const parts = mainText.includes('-') ? mainText.split('-') : mainText.split('/');
      const p1 = parts[0]?.trim() || mainText;
      const p2 = parts.length > 1 ? parts[1]?.trim() : '';
      return (
          <div className="flex flex-col items-center justify-center">
             <div className="flex gap-2">
               {stimulus?.prompt_type === 'warmup' && (
                 <h3 className="text-sm font-black uppercase tracking-widest text-[#92400E] bg-[#FEF3C7] px-4 py-1 mb-6 flex justify-center items-center gap-2 border-2 border-[#F59E0B]">
                    🔥 WARMUP
                 </h3>
               )}
               <h3 className="text-sm font-black uppercase tracking-widest text-[#FF90E8] bg-black px-4 py-1 mb-6 flex justify-center items-center gap-2">
                  <FiMic strokeWidth={3} /> {type === 'word_drill' ? 'WORD DRILL' : 'MINIMAL PAIRS'}
               </h3>
             </div>
             <p className="font-black text-5xl md:text-7xl uppercase tracking-tighter text-black leading-tight flex items-center space-x-6">
                <span>{p1}</span>
                {p2 && <span className="text-black/20">-</span>}
                {p2 && <span>{p2}</span>}
             </p>
          </div>
       );
    }

    // Default 'read_aloud', 'sentence_read', 'paragraph_read'
    const defaultLabel = type === 'sentence_read' ? 'SENTENCE DRILL' : type === 'paragraph_read' ? 'PARAGRAPH DRILL' : 'READ ALOUD';
    return (
       <div className="flex flex-col items-center justify-center">
          <div className="flex gap-2">
            {stimulus?.prompt_type === 'warmup' && (
              <h3 className="text-sm font-black uppercase tracking-widest text-[#92400E] bg-[#FEF3C7] px-4 py-1 mb-6 flex justify-center items-center gap-2 border-2 border-[#F59E0B]">
                 🔥 WARMUP
              </h3>
            )}
            <h3 className="text-sm font-black uppercase tracking-widest text-black/50 mb-6 flex justify-center items-center gap-2">
               <FiMic strokeWidth={3} /> {defaultLabel}
            </h3>
          </div>
          <p className="font-black text-5xl md:text-6xl uppercase tracking-tight text-black leading-tight break-words">
             "{mainText}"
          </p>
       </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
         <Button onClick={() => navigate('/patient/tasks')} variant="outline" className="gap-2 bg-white">
            <FiArrowLeft strokeWidth={3} /> EXIT TASK
         </Button>
         
         <div className="bg-black text-white border-4 border-black shadow-[4px_4px_0px_0px_#000] px-6 py-2 font-black text-xl uppercase tracking-wider">
            {progressText}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Main Prompt Display */}
         <div className="space-y-6">
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 neo-lift h-full flex flex-col justify-center text-center">
               
               {renderTaskPrompt(task.task_type || 'read_aloud', currentStimulus)}

               {attempt > 1 && (
                  <span className="neo-badge bg-neo-secondary uppercase mx-auto mt-8 inline-block">Attempt {attempt}</span>
               )}
            </div>
         </div>

         {/* Recording / Feedback Sidebar */}
         <div className="space-y-6">
            <div className="bg-neo-muted border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 h-full">
               
               {viewState === 'recording' ? (
                  <div className="flex flex-col h-full bg-white border-4 border-black p-6 relative">
                     <h3 className="text-3xl font-black uppercase mb-2">Record</h3>
                     <p className="font-bold text-sm text-black/60 mb-8 border-b-4 border-black pb-4">Speak clearly into your microphone.</p>
                     
                     <div className="flex-1 flex flex-col items-center justify-center py-8">
                        <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                     </div>

                     <div className="mt-8 pt-6 border-t-4 border-black">
                        <Button 
                           onClick={handleSubmit} 
                           disabled={!audioBlob || isSubmitting}
                           className={`w-full text-xl py-8 uppercase font-black tracking-wider ${!audioBlob ? 'opacity-50' : 'bg-neo-accent text-black border-4 border-black hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_#000]'}`}
                        >
                           {isSubmitting ? 'ANALYZING...' : 'SUBMIT RECORDING'}
                        </Button>
                     </div>
                  </div>
               ) : (
                  // Feedback View
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white border-4 border-black p-6 relative">
                     <h3 className="text-2xl font-black uppercase mb-4">Results</h3>
                     
                     {/* Transcription Block */}
                     <div className="bg-neo-bg border-4 border-black p-4 mb-6 relative">
                        <span className="absolute -top-3 left-4 bg-white border-2 border-black text-[10px] font-black uppercase px-2 py-0.5 tracking-widest">Transcription</span>
                        <p className="font-bold text-lg text-black pt-2">
                           {result.transcription}
                        </p>
                     </div>

                     <div className="space-y-3 mb-8">
                        {/* Final Score Hero */}
                        <div className="bg-neo-bg border-4 border-black p-4 mb-2 relative">
                           <span className="absolute -top-3 left-4 bg-white border-2 border-black text-[10px] font-black uppercase px-2 py-0.5 tracking-widest">Final Score</span>
                           <div className="flex items-center justify-between pt-1">
                              <span className="font-black text-4xl">{result.finalScore}%</span>
                              {result.performanceLevel && (
                                <span className={`neo-badge text-xs uppercase px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] ${
                                  result.performanceLevel === 'Excellent' ? 'bg-[#86EFAC]' :
                                  result.performanceLevel === 'Well Performing' ? 'bg-neo-accent' :
                                  result.performanceLevel === 'Good' ? 'bg-[#FDE047]' : 'bg-neo-secondary'
                                }`}>{result.performanceLevel}</span>
                              )}
                           </div>
                        </div>

                        {/* Metric bars */}
                        {[
                          { label: 'Speech Score', value: result.speechScore, color: 'bg-[#86EFAC]' },
                          { label: 'Phoneme Accuracy', value: result.phonemeAccuracy, color: 'bg-[#93C5FD]' },
                          { label: 'Word Accuracy', value: result.wordAccuracy, color: 'bg-[#86EFAC]' },
                          { label: 'Fluency', value: result.fluency, color: 'bg-[#FDE047]' },
                          { label: 'Speech Rate', value: result.speechRate, color: 'bg-[#C4B5FD]' },
                          { label: 'Engagement', value: result.engagement, color: 'bg-[#FCA5A5]' },
                          { label: 'Articulation', value: result.articulation, color: 'bg-[#93C5FD]' },
                        ].map(metric => (
                          <div key={metric.label}>
                            <div className="flex justify-between font-black uppercase text-xs mb-1 tracking-widest">
                              <span>{metric.label}</span>
                              <span>{metric.value}%</span>
                            </div>
                            <div className="h-5 border-4 border-black bg-neo-bg w-full">
                              <div className={`h-full border-r-4 border-black transition-all duration-1000 ${metric.color}`} style={{ width: `${Math.min(100, metric.value)}%` }}></div>
                            </div>
                          </div>
                        ))}

                        {/* Secondary stats */}
                        <div className="mt-3 pt-3 border-t-4 border-black flex justify-between text-xs font-black uppercase tracking-widest text-black/60">
                           <span>Emotion: {result.emotion_label}</span>
                           <span>Pause Rate: {result.pauseRate}/word</span>
                        </div>
                     </div>

                     {/* Feedback Action Box */}
                     <div className={`border-4 border-black p-6 shadow-[4px_4px_0px_0px_#000] ${result.should_retry || attempt >= 3 || result.suggest_break ? 'bg-neo-secondary' : 'bg-[#86EFAC]'}`}>
                        <p className="font-bold text-black text-lg mb-6 leading-tight">
                           {result.break_message || result.retry_message}
                        </p>
                        
                        {(result.should_retry && attempt < 3 && !result.suggest_break) ? (
                           <Button onClick={handleRetry} className="w-full bg-black text-white gap-2 py-6 text-lg">
                              <FiRefreshCw strokeWidth={3} /> RETRY (ATTEMPT {attempt + 1})   
                           </Button>
                        ) : (result.should_retry && attempt >= 3) || result.suggest_break ? (
                           <div>
                              <p className="font-black text-xs uppercase mb-2 text-black/60">Skipping to easier task/prompt</p>
                              <Button onClick={handleLowerDifficulty} className="w-full bg-black text-white gap-2 py-6 text-lg">
                                 CONTINUE <FiArrowRight strokeWidth={3} />
                              </Button>
                           </div>
                        ) : (
                           <div>
                              <p className="font-black text-xs uppercase mb-2 text-black/60">Auto-advancing...</p>
                              <Button onClick={handleNextPrompt} className="w-full bg-black text-white gap-2 py-6 text-lg">
                                 NEXT PROMPT <FiArrowRight strokeWidth={3} />
                              </Button>
                           </div>
                        )}
                     </div>

                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
