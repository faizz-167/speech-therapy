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
         <h2 className="text-2xl font-black uppercase inline-block animate-pulse bg-[#F0C020] px-4 py-2 border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212]">Loading Task...</h2>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <h2 className="text-2xl font-black uppercase text-[#D02020] mb-4 bg-white border-4 border-[#121212] p-4 inline-block shadow-[4px_4px_0px_0px_#121212]">Task not found</h2>
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
            
            <div className="bg-white border-4 border-[#121212] shadow-[12px_12px_0px_0px_#121212] p-10 text-center max-w-3xl mx-auto">
               <span className="font-sans font-black text-sm uppercase px-3 py-1 bg-[#F0F0F0] border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] mb-6 inline-block tracking-widest">{task.difficulty}</span>
               
               <h1 className="text-5xl md:text-6xl font-black uppercase text-[#121212] mb-4 leading-none tracking-tighter">{task.task_name}</h1>
               <p className="font-bold text-xl text-[#121212] mb-8 max-w-2xl mx-auto tracking-widest">{task.reason}</p>

               <div className="bg-[#F0F0F0] border-4 border-[#121212] p-8 mb-10 text-left shadow-[6px_6px_0px_0px_#121212]">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#1040C0] mb-3 flex items-center gap-2 border-b-4 border-[#121212] pb-2">
                     <FiActivity strokeWidth={3} size={20} /> Instructions
                  </h3>
                  <p className="font-bold text-[#121212] text-xl md:text-2xl leading-tight">{task.instructions || 'You will be shown prompts one by one. Read them aloud clearly and record your voice.'}</p>
               </div>

               <Button 
                  onClick={handleStartTask}
                  className="bg-[#1040C0] text-white border-4 border-[#121212] hover:bg-[#082080] hover:-translate-y-1 transition-transform text-2xl py-8 px-12 shadow-[6px_6px_0px_0px_#121212] font-black uppercase tracking-widest"
               >
                  START TASK <FiPlay className="ml-3 w-8 h-8 fill-white" />
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
            <div className="bg-[#1040C0] border-4 border-[#121212] shadow-[12px_12px_0px_0px_#121212] p-16 text-center max-w-2xl mx-auto mt-8">
               <div className="w-24 h-24 border-8 border-[#121212] bg-[#F0C020] flex items-center justify-center mx-auto mb-6 shadow-[6px_6px_0px_0px_#121212]">
               <FiCheck strokeWidth={4} className="w-12 h-12 text-[#121212]" />
               </div>
               <h3 className="text-5xl font-black uppercase text-white mb-4 tracking-tighter">Task Complete!</h3>
               <p className="font-bold text-white text-xl mb-8 tracking-widest">You finished all prompts for this category.</p>
               <Button onClick={() => navigate('/patient/tasks')} className="bg-white text-[#121212] text-xl font-black tracking-widest uppercase py-6 px-10 border-4 border-[#121212] hover:-translate-y-1 transition-transform shadow-[6px_6px_0px_0px_#121212]">
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
            <div className="bg-white border-4 border-[#121212] shadow-[12px_12px_0px_0px_#121212] p-8 md:p-12 h-full flex flex-col justify-center text-center">
               
               {renderTaskPrompt(task.task_type || 'read_aloud', currentStimulus)}

               {attempt > 1 && (
                  <span className="font-sans font-black text-sm uppercase px-3 py-1 bg-[#D02020] text-white border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] mx-auto mt-8 inline-block tracking-widest">Attempt {attempt}</span>
               )}
            </div>
         </div>

         {/* Recording / Feedback Sidebar */}
         <div className="space-y-6">
            <div className="bg-[#F0F0F0] border-4 border-[#121212] shadow-[12px_12px_0px_0px_#121212] p-8 h-full">
               
               {viewState === 'recording' ? (
                  <div className="flex flex-col h-full bg-white border-4 border-[#121212] p-6 md:p-8 relative shadow-[6px_6px_0px_0px_#121212]">
                     <h3 className="text-4xl font-black uppercase mb-2 text-[#121212] tracking-tighter">Record</h3>
                     <p className="font-bold text-sm md:text-base text-[#121212] mb-8 border-b-4 border-[#1040C0] pb-4 uppercase tracking-widest">Speak clearly into your microphone.</p>
                     
                     <div className="flex-1 flex flex-col items-center justify-center py-8">
                        <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                     </div>

                     <div className="mt-8 pt-6 border-t-4 border-[#121212]">
                        <Button 
                           onClick={handleSubmit} 
                           disabled={!audioBlob || isSubmitting}
                           className={`w-full text-xl md:text-2xl py-8 uppercase font-black tracking-widest border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] transition-all
                              ${!audioBlob ? 'opacity-50 bg-[#F0F0F0] text-[#121212]' : 'bg-[#1040C0] text-white hover:bg-[#082080] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#121212]'}
                           `}
                        >
                           {isSubmitting ? 'ANALYZING...' : 'SUBMIT RECORDING'}
                        </Button>
                     </div>
                  </div>
               ) : (
                  // Feedback View
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white border-4 border-[#121212] p-6 relative shadow-[6px_6px_0px_0px_#121212]">
                     <h3 className="text-3xl font-black uppercase mb-4 text-[#121212]">Results</h3>
                     
                     {/* Transcription Block */}
                     <div className="bg-[#F0F0F0] border-4 border-[#121212] p-6 mb-8 relative shadow-[4px_4px_0px_0px_#121212]">
                        <span className="absolute -top-4 left-4 bg-[#1040C0] text-white border-4 border-[#121212] shadow-[2px_2px_0px_0px_#121212] text-[10px] md:text-sm font-black uppercase px-3 py-1 tracking-widest">Transcription</span>
                        <p className="font-bold text-xl text-[#121212] pt-2 italic">
                           "{result.transcription}"
                        </p>
                     </div>

                     <div className="space-y-4 mb-8">
                        {/* Final Score Hero */}
                        <div className="bg-white border-4 border-[#121212] p-6 mb-4 relative shadow-[4px_4px_0px_0px_#121212]">
                           <span className="absolute -top-4 left-4 bg-[#121212] text-white border-4 border-[#121212] shadow-[2px_2px_0px_0px_#121212] text-[10px] md:text-sm font-black uppercase px-3 py-1 tracking-widest">Final Score</span>
                           <div className="flex items-center justify-between pt-1">
                              <span className="font-black text-5xl text-[#121212]">{result.finalScore}%</span>
                              {result.performanceLevel && (
                                <span className={`font-sans text-xs md:text-sm font-black uppercase px-3 py-1 border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] ${
                                  result.performanceLevel === 'Excellent' ? 'bg-[#1040C0] text-white' :
                                  result.performanceLevel === 'Well Performing' ? 'bg-[#F0C020] text-[#121212]' :
                                  result.performanceLevel === 'Good' ? 'bg-[#F0F0F0] text-[#121212]' : 'bg-[#D02020] text-white'
                                }`}>{result.performanceLevel}</span>
                              )}
                           </div>
                        </div>

                        {/* Metric bars */}
                        {[
                          { label: 'Speech Score', value: result.speechScore, color: 'bg-[#1040C0]' },
                          { label: 'Phoneme Accuracy', value: result.phonemeAccuracy, color: 'bg-[#D02020]' },
                          { label: 'Word Accuracy', value: result.wordAccuracy, color: 'bg-[#F0C020]' },
                          { label: 'Fluency', value: result.fluency, color: 'bg-[#121212]' },
                          { label: 'Speech Rate', value: result.speechRate, color: 'bg-[#1040C0]' },
                          { label: 'Engagement', value: result.engagement, color: 'bg-[#F0C020]' },
                          { label: 'Articulation', value: result.articulation, color: 'bg-[#D02020]' },
                        ].map(metric => (
                          <div key={metric.label}>
                            <div className="flex justify-between font-black uppercase text-xs md:text-sm border-b-2 border-[#121212] pb-1 mb-1 tracking-widest text-[#121212]">
                              <span>{metric.label}</span>
                              <span>{metric.value}%</span>
                            </div>
                            <div className="h-6 border-4 border-[#121212] bg-[#F0F0F0] w-full">
                              <div className={`h-full border-r-4 border-[#121212] transition-all duration-1000 ${metric.color}`} style={{ width: `${Math.min(100, metric.value)}%` }}></div>
                            </div>
                          </div>
                        ))}

                        {/* Secondary stats */}
                        <div className="mt-6 pt-4 border-t-4 border-[#121212] flex justify-between text-xs md:text-sm font-black uppercase tracking-widest text-[#121212]">
                           <span>Emotion: {result.emotion_label}</span>
                           <span>Pause Rate: {result.pauseRate}/word</span>
                        </div>
                     </div>

                     {/* Feedback Action Box */}
                     <div className={`border-4 border-[#121212] p-8 shadow-[6px_6px_0px_0px_#121212] ${result.should_retry || attempt >= 3 || result.suggest_break ? 'bg-[#D02020]' : 'bg-[#1040C0]'}`}>
                        <p className="font-bold text-white text-xl md:text-2xl mb-8 leading-tight tracking-widest">
                           {result.break_message || result.retry_message}
                        </p>
                        
                        {(result.should_retry && attempt < 3 && !result.suggest_break) ? (
                           <Button onClick={handleRetry} className="w-full bg-white text-[#121212] font-black uppercase tracking-widest border-4 border-[#121212] hover:-translate-y-1 hover:bg-[#F0F0F0] shadow-[6px_6px_0px_0px_#121212] gap-2 py-8 text-xl">
                              <FiRefreshCw strokeWidth={3} size={24} /> RETRY (ATTEMPT {attempt + 1})   
                           </Button>
                        ) : (result.should_retry && attempt >= 3) || result.suggest_break ? (
                           <div>
                              <p className="font-black text-sm uppercase mb-3 text-white tracking-widest border-b-4 border-[#121212] pb-1 inline-block">Skipping to easier task/prompt</p>
                              <Button onClick={handleLowerDifficulty} className="w-full bg-white text-[#121212] font-black uppercase tracking-widest border-4 border-[#121212] hover:-translate-y-1 hover:bg-[#F0F0F0] shadow-[6px_6px_0px_0px_#121212] gap-2 py-8 text-xl">
                                 CONTINUE <FiArrowRight strokeWidth={3} size={24} />
                              </Button>
                           </div>
                        ) : (
                           <div>
                              <p className="font-black text-sm uppercase mb-3 text-white tracking-widest border-b-4 border-[#121212] pb-1 inline-block">Auto-advancing...</p>
                              <Button onClick={handleNextPrompt} className="w-full bg-white text-[#121212] font-black uppercase tracking-widest border-4 border-[#121212] hover:-translate-y-1 hover:bg-[#F0F0F0] shadow-[6px_6px_0px_0px_#121212] gap-2 py-8 text-xl">
                                 NEXT PROMPT <FiArrowRight strokeWidth={3} size={24} />
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
