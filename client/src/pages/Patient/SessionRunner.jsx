import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import AudioRecorder from '../../components/AudioRecorder';
import { FiCheckCircle, FiArrowRight, FiActivity, FiRefreshCcw, FiMessageSquare } from 'react-icons/fi';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import StimulusCard from '../../components/StimulusCard';

export default function SessionRunner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, upload } = useApi();
  
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Attempt State
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  
  useEffect(() => {
    get(`/sessions/${id}/queue`)
      .then(data => {
        setQueue(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const currentPrompt = queue[currentIndex];

  const handleRecordingComplete = async (blob) => {
    if (!blob) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'attempt.webm');
      formData.append('attempt_number', attemptNumber);

      const res = await upload(`/sessions/${id}/prompts/${currentPrompt.prompt_id}/submit`, formData);
      setResult(res);
    } catch (err) {
      console.error(err);
    }
    setIsAnalyzing(false);
  };

  const handleNext = () => {
    // Check adaptive decision
    const decision = result?.adaptive_decision || 'stay';
    
    if (result && result.result === 'fail' && attemptNumber < 3) {
        setAttemptNumber(attemptNumber + 1);
        setResult(null);
        return;
    }
    
    // Proceed to next prompt
    setAttemptNumber(1);
    setResult(null);
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finished
      navigate('/patient/home');
    }
  };

  if (loading) return <div className="text-center py-12"><div className="neo-badge bg-neo-accent animate-spin inline-block">LOADING...</div></div>;
  if (!queue.length) return <div className="text-center py-12">No tasks available in this session.</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase text-black">Therapy Session</h1>
          <p className="font-bold text-black/50 text-sm mt-1">Prompt {currentIndex + 1} of {queue.length}</p>
        </div>
        <div className="neo-badge bg-neo-secondary rotate-2">
            ATTEMPT {attemptNumber}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Main Interface */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-4 border-black shadow-[8px_8px_0px_0px_#000] rounded-none">
            <CardContent className="p-8">
              <StimulusCard 
                response_type={currentPrompt?.task_mode}
                display_content={currentPrompt?.display_content}
                image_keyword={null} // Session prompt format might need mapping to image_keyword if applicable 
                instruction={currentPrompt?.task_mode.replace('_', ' ')}
              />

              {!result && !isAnalyzing && (
                <div className="flex flex-col items-center">
                  <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                  <p className="mt-4 font-black uppercase tracking-widest text-xs text-black/50">Press to Record</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-black bg-neo-accent flex items-center justify-center mx-auto mb-4 animate-spin shadow-[4px_4px_0px_0px_#000]">
                    <div className="w-4 h-4 bg-black"></div>
                  </div>
                  <h3 className="text-xl font-black uppercase animate-pulse">Running AI Analysis...</h3>
                  <p className="font-bold text-black/50 text-sm mt-2">Checking Speech, Emotion, and Fluency...</p>
                </div>
              )}

              {result && (
                <div className="text-center py-6 animate-fade-in">
                  <div className={`w-20 h-20 border-4 border-black flex items-center justify-center mx-auto mb-6 shadow-[6px_6px_0px_0px_#000] rotate-3 ${
                    result.result === 'pass' ? 'bg-[#86EFAC]' : 
                    result.result === 'partial' ? 'bg-[#FFE373]' : 'bg-[#FF6B6B]'
                  }`}>
                    {result.result === 'pass' ? <FiCheckCircle className="w-10 h-10" strokeWidth={3} /> : <FiRefreshCcw className="w-10 h-10" strokeWidth={3} />}
                  </div>
                  <h2 className="text-4xl font-black uppercase mb-4">
                    {result.result === 'pass' ? 'Great Job!' : result.result === 'partial' ? 'Almost There!' : 'Let\'s Try Again'}
                  </h2>
                  <Button size="lg" onClick={handleNext} className="w-full text-xl shadow-[4px_4px_0px_0px_#000]">
                    {result.result === 'pass' || attemptNumber >= 3 ? 'CONTINUE' : 'RETRY ATTEMPT'} <FiArrowRight className="w-5 h-5 ml-2" strokeWidth={3} />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feedback Panel */}
        <div className="space-y-6">
           <Card className="border-4 border-black shadow-[8px_8px_0px_0px_#000] rounded-none bg-neo-muted/20">
             <CardContent className="p-6">
                <h3 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                    <FiActivity strokeWidth={3} /> AI Feedback
                </h3>
                
                {!result ? (
                    <div className="bg-white border-4 border-black p-4 rotate-1 text-center py-10 opacity-50">
                        <FiMessageSquare className="w-8 h-8 mx-auto mb-2 text-black/50" />
                        <p className="font-bold text-sm uppercase">Waiting for input...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
                             <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-1">Final Score</p>
                             <p className="text-4xl font-black text-neo-accent">{result.accuracy_score}%</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white border-4 border-black p-3 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-1">Phoneme</p>
                                <p className="text-xl font-black">{result.phoneme_accuracy.toFixed(0)}%</p>
                            </div>
                            <div className="bg-white border-4 border-black p-3 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-1">Speed</p>
                                <p className="text-xl font-black">{result.wpm.toFixed(0)} WPM</p>
                            </div>
                        </div>

                        {result.nlp_score > 0 && (
                            <div className="bg-[#93C5FD] border-4 border-black p-3 text-center shadow-[4px_4px_0px_0px_#000]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-1">Content Score</p>
                                <p className="text-2xl font-black">{result.nlp_score.toFixed(0)}%</p>
                            </div>
                        )}

                        <div className="bg-neo-secondary border-4 border-black p-4 rotate-1 shadow-[4px_4px_0px_0px_#000]">
                             <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-1">Clinical Insight</p>
                             <p className="font-bold text-sm leading-snug">
                                Emotion detected as <span className="uppercase bg-white px-1 border-2 border-black font-black">{result.emotion_label}</span> 
                                with a behavioral engagement score of {result.behavioral_score}.
                             </p>
                        </div>
                    </div>
                )}
             </CardContent>
           </Card>
        </div>

      </div>
    </div>
  );
}
