import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [responseLatencySec, setResponseLatencySec] = useState(0);
  const [audioDurationSec, setAudioDurationSec] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const micActivationTimeRef = useRef(0);
  const firstSpeechTimeRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      setResponseLatencySec(0);
      setAudioDurationSec(0);
      audioChunksRef.current = [];
      firstSpeechTimeRef.current = null;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micActivationTimeRef.current = Date.now();
      recordingStartTimeRef.current = Date.now();

      // Setup audio analysis for latency detection
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const detectSpeech = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Threshold for speech detection
        if (average > 15 && !firstSpeechTimeRef.current) {
          firstSpeechTimeRef.current = Date.now();
          setResponseLatencySec(Math.round((firstSpeechTimeRef.current - micActivationTimeRef.current) / 1000));
        }
        
        if (!firstSpeechTimeRef.current) {
          animationFrameRef.current = requestAnimationFrame(detectSpeech);
        }
      };
      
      detectSpeech();

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const duration = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
        setAudioDurationSec(duration);
        
        if (!firstSpeechTimeRef.current && duration > 0) {
           setError("No speech detected");
        }
        
        // Cleanup stream
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorderRef.current.start(200);
      setIsRecording(true);
      
    } catch (err) {
      console.error(err);
      setError("Microphone access denied or unavailable.");
    }
  }, []); // isRecording removed from deps; avoid re-creating

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (!firstSpeechTimeRef.current && animationFrameRef.current) {
         cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, []);

  const buildFormData = useCallback((extraFields = {}) => {
    const formData = new FormData();
    if (audioBlob) {
      formData.append('audio', audioBlob, `attempt_${Date.now()}.webm`);
    }
    // ensure int parsing
    formData.append('response_latency_sec', responseLatencySec.toString());
    
    Object.keys(extraFields).forEach(key => {
      formData.append(key, String(extraFields[key]));
    });
    
    return formData;
  }, [audioBlob, responseLatencySec]);

  return {
    isRecording,
    audioBlob,
    responseLatencySec,
    audioDurationSec,
    error,
    startRecording,
    stopRecording,
    buildFormData
  };
};
