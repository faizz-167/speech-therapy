import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { FiMic, FiSquare, FiPlay, FiTrash2 } from 'react-icons/fi';

const AudioRecorder = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        if (onRecordingComplete) onRecordingComplete(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const clearRecording = () => {
    setAudioURL(null);
    if (onRecordingComplete) onRecordingComplete(null);
  };

  return (
    <div className="flex flex-col items-center space-y-6 bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_#000]">
      {!audioURL ? (
        <Button 
          variant="outline"
          className={`border-4 border-black shadow-[4px_4px_0px_0px_#000] text-xl font-black uppercase tracking-wider py-8 px-8 transition-transform ${isRecording ? 'bg-[#FF6B6B] hover:bg-[#FF8787] animate-pulse-subtle' : 'bg-neo-bg hover:bg-neo-muted hover:-translate-y-1'}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? (
             <><FiSquare className="mr-3 w-6 h-6" strokeWidth={3} /> STOP RECORDING</>
          ) : (
             <><FiMic className="mr-3 w-6 h-6" strokeWidth={3} /> START RECORDING</>
          )}
        </Button>
      ) : (
        <div className="flex flex-col items-center space-y-4 w-full">
          <audio src={audioURL} controls className="w-full border-4 border-black bg-neo-bg" />
          <Button onClick={clearRecording} className="bg-white text-black border-4 border-black shadow-[4px_4px_0px_0px_#FF6B6B] hover:-translate-y-1 transition-transform w-full font-black uppercase text-sm py-6">
            <FiTrash2 className="mr-2 w-5 h-5" strokeWidth={3} /> CLEAR & RE-RECORD
          </Button>
        </div>
      )}
      <p className="font-bold text-black/60 uppercase tracking-widest text-xs pt-4 border-t-4 border-black w-full text-center">
        {isRecording ? '● RECORDING IN PROGRESS' : !audioURL ? 'PRESS START WHEN READY' : 'RECORDING SAVED TEMPORARILY'}
      </p>
    </div>
  );
};

export default AudioRecorder;
