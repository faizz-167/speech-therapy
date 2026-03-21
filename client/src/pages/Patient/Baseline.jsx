import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { FiCheck, FiArrowRight } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import AudioRecorder from '../../components/AudioRecorder';
import StimulusCard from '../../components/StimulusCard';

import { useAuth } from '../../context/AuthContext';
export default function Baseline() {
  const { user } = useAuth();
  const { get, post, upload } = useApi();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [stimulusIdx, setStimulusIdx] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scores, setScores] = useState({});
  const [completed, setCompleted] = useState(false);

  useEffect(() => { 
    // Fetch available baselines, pick first, then fetch its sections
    get('/baselines').then((data) => {
      if (data && data.length > 0) {
        const primaryBaseline = data[0].baseline_id;
        get(`/baselines/${primaryBaseline}/sections`).then((sections) => {
          let mappedTasks = [];
          for (const section of sections) {
            const baseTasks = (section.items || []).map((item) => ({
              id: item.item_id,
              name: item.display_content || item.task_name || section.section_name || 'Assessment Item',
              instructions: item.instruction || section.instructions || 'Complete the following task.',
              stimuli: [item.display_content || 'No stimulus associated with this item.'],
              response_type: item.response_type || 'read_aloud',
              scoring_method: item.scoring_method || 'ai_speech_analysis',
              itemData: item
            }));
            mappedTasks = [...mappedTasks, ...baseTasks];
          }
          setTasks(mappedTasks);
        });
      }
    }).catch(() => {});
  }, []);

  const currentTask = tasks[currentIdx];
  const stimuli = currentTask?.stimuli || [];
  const currentStimulus = stimuli[stimulusIdx];

  const handleRecordingComplete = async (blob) => {
    if (!blob) {
       // Non-audio item (e.g. picture_naming) — add fallback scores and advance
       const taskScores = scores[currentTask.id] || { accuracy: [], fluency: [], emotional: [], phoneme_accuracy: [], speech_rate: [], engagement: [], speech_score: [] };
       taskScores.accuracy.push(0);
       taskScores.fluency.push(0);
       taskScores.emotional.push(0);
       taskScores.phoneme_accuracy.push(0);
       taskScores.speech_rate.push(0);
       taskScores.engagement.push(0);
       taskScores.speech_score.push(0);
       setScores({ ...scores, [currentTask.id]: taskScores });
       setHasRecorded(true);
       return;
    }
    
    setIsAnalyzing(true);
    setHasRecorded(true);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'baseline.webm');
      
      const textToAnalyze = typeof currentStimulus === 'string' 
        ? currentStimulus 
        : currentStimulus?.prompt || (currentStimulus?.pair ? currentStimulus.pair.join(' ') : JSON.stringify(currentStimulus));
      
      formData.append('expected_text', textToAnalyze);

      // Call new real AI endpoint
      const res = await upload('/patients/baseline-analyze', formData);
      
      const taskScores = scores[currentTask.id] || { accuracy: [], fluency: [], emotional: [], phoneme_accuracy: [], speech_rate: [], engagement: [], speech_score: [] };
      taskScores.accuracy.push(res.accuracy || 0);
      taskScores.fluency.push(res.fluency || 0);
      taskScores.emotional.push(res.emotional_tone || 0);
      taskScores.phoneme_accuracy.push(res.phoneme_accuracy || 0);
      taskScores.speech_rate.push(res.speech_rate || 0);
      taskScores.engagement.push(res.engagement_score || 0);
      taskScores.speech_score.push(res.speech_score || 0);
      
      setScores({ ...scores, [currentTask.id]: taskScores });
    } catch (err) {
      console.error(err);
      // Fallback on error so patient doesn't get stuck
      const taskScores = scores[currentTask.id] || { accuracy: [], fluency: [], emotional: [], phoneme_accuracy: [], speech_rate: [], engagement: [], speech_score: [] };
      taskScores.accuracy.push(50);
      taskScores.fluency.push(50);
      taskScores.emotional.push(50);
      taskScores.phoneme_accuracy.push(0);
      taskScores.speech_rate.push(50);
      taskScores.engagement.push(50);
      taskScores.speech_score.push(50);
      setScores({ ...scores, [currentTask.id]: taskScores });
    }
    
    setIsAnalyzing(false);
  };

  const handleNext = () => {
    setHasRecorded(false);
    if (stimulusIdx < stimuli.length - 1) {
      setStimulusIdx(stimulusIdx + 1);
    } else if (currentIdx < tasks.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setStimulusIdx(0);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    // Aggregate all per-item scores into the format the backend expects
    const allAccuracy = Object.values(scores).flatMap(s => s.accuracy || []);
    const allFluency = Object.values(scores).flatMap(s => s.fluency || []);
    const allEmotional = Object.values(scores).flatMap(s => s.emotional || []);
    const allPhoneme = Object.values(scores).flatMap(s => s.phoneme_accuracy || []);
    const allSpeechRate = Object.values(scores).flatMap(s => s.speech_rate || []);
    const allEngagement = Object.values(scores).flatMap(s => s.engagement || []);
    const allSpeechScore = Object.values(scores).flatMap(s => s.speech_score || []);

    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    // Build per-task breakdown for reference
    const tasksData = {};
    for (const [itemId, s] of Object.entries(scores)) {
      tasksData[itemId] = {
        accuracy: avg(s.accuracy),
        fluency: avg(s.fluency),
        emotional: avg(s.emotional),
        speech_score: avg(s.speech_score),
      };
    }

    try {
      await post('/patients/baseline-results', {
        accuracy: parseFloat(avg(allAccuracy).toFixed(1)),
        fluency: parseFloat(avg(allFluency).toFixed(1)),
        emotional_tone: parseFloat(avg(allEmotional).toFixed(1)),
        phoneme_accuracy: parseFloat(avg(allPhoneme).toFixed(1)),
        speech_rate: parseFloat(avg(allSpeechRate).toFixed(1)),
        engagement_score: parseFloat(avg(allEngagement).toFixed(1)),
        speech_score: parseFloat(avg(allSpeechScore).toFixed(1)),
        tasks_data: tasksData,
      });
      setCompleted(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-24 h-24 border-4 border-black bg-neo-secondary shadow-[8px_8px_0px_0px_#000] flex items-center justify-center mx-auto mb-6 rotate-3">
          <FiCheck className="w-12 h-12 text-black" strokeWidth={3} />
        </div>
        <h2 className="text-5xl font-black uppercase tracking-tight text-black mb-3">Done!</h2>
        <p className="font-bold text-black/60 mb-8">Your therapist will review and create your plan.</p>
        <Button onClick={() => navigate('/patient/home')} size="lg">Go to Home</Button>
      </div>
    );
  }

  if (!currentTask) return <div className="neo-badge bg-neo-secondary animate-bounce-subtle mx-auto block w-fit">LOADING...</div>;

  const displayStimulus = () => {
    if (typeof currentStimulus === 'string') return currentStimulus;
    if (currentStimulus?.pair) return currentStimulus.pair.join(' vs ');
    if (currentStimulus?.prompt) return currentStimulus.prompt;
    if (Array.isArray(currentStimulus)) return currentStimulus.join(', ');
    return JSON.stringify(currentStimulus);
  };

  const totalStimuli = tasks.reduce((acc, t) => acc + (t.stimuli?.length || 0), 0);
  const completedStimuli = tasks.slice(0, currentIdx).reduce((acc, t) => acc + (t.stimuli?.length || 0), 0) + stimulusIdx;
  const progress = totalStimuli > 0 ? (completedStimuli / totalStimuli) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-black uppercase tracking-tight text-black">Baseline Assessment</h1>
        <div className="neo-badge bg-neo-muted rotate-2">STEP {currentIdx + 1}/{tasks.length}</div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-black/60 mb-1">
          <span>{currentTask.name}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-5 border-4 border-black bg-white overflow-hidden">
          <div className="h-full bg-neo-accent transition-all" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Stimulus Card */}
      <Card className="mb-6">
        <CardHeader className="bg-neo-muted/30">
          <CardTitle>{currentTask.name}</CardTitle>
          <p className="font-bold text-sm text-black/60 mt-1">{currentTask.instructions}</p>
        </CardHeader>
        <CardContent>
          <StimulusCard 
            response_type={currentTask.response_type}
            display_content={displayStimulus()}
            image_keyword={currentTask.itemData?.image_keyword}
            instruction={`Stimulus ${stimulusIdx + 1}/${stimuli.length}`}
          />

          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
            {!hasRecorded ? (
               <div className="w-full">
                  {currentTask?.response_type === 'read_aloud' ? (
                    <>
                      <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                      <p className="text-center font-black text-xs uppercase text-black/50 mt-4 tracking-widest">Read the prompt aloud and record</p>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-center font-bold text-sm text-black mb-2 uppercase">
                        Requires action: {currentTask?.response_type?.replace('_', ' ')}
                      </p>
                      <Button onClick={() => handleRecordingComplete(null)} size="lg" className="w-full shadow-[4px_4px_0px_0px_#000] border-4 border-black hover:-translate-y-1">
                        Acknowledge & Continue
                      </Button>
                    </div>
                  )}
               </div>
            ) : isAnalyzing ? (
               <div className="text-center py-8">
                  <div className="w-16 h-16 border-4 border-black bg-neo-accent shadow-[4px_4px_0px_0px_#000] flex items-center justify-center mx-auto mb-4 animate-spin">
                     <div className="w-4 h-4 bg-black rounded-full"></div>
                  </div>
                  <h3 className="text-xl font-black uppercase text-black mb-2 animate-pulse">Analyzing Audio...</h3>
                  <p className="font-bold text-black/60 text-sm uppercase">Please wait</p>
               </div>
            ) : (
               <div className="text-center py-4 w-full">
                  <div className="w-16 h-16 border-4 border-black bg-[#86EFAC] shadow-[4px_4px_0px_0px_#000] flex items-center justify-center mx-auto mb-4">
                     <FiCheck className="w-8 h-8 text-black" strokeWidth={3} />
                  </div>
                  <h3 className="text-2xl font-black uppercase text-black mb-6">Recording Saved!</h3>
                  <Button onClick={handleNext} size="lg" className="w-full text-lg py-6 shadow-[4px_4px_0px_0px_#000] border-4 border-black hover:-translate-y-1">
                    NEXT <FiArrowRight className="w-5 h-5 ml-2" strokeWidth={3} />
                  </Button>
               </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Segment indicator */}
      <div className="flex gap-2">
        {tasks.map((t, i) => (
          <div key={t.id} className={`flex-1 h-3 border-2 border-black ${i < currentIdx ? 'bg-neo-accent' : i === currentIdx ? 'bg-neo-secondary' : 'bg-white'}`}></div>
        ))}
      </div>
    </div>
  );
}
