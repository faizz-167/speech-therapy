import React, { useRef, useEffect, useState } from 'react';
import { Mic, Square, RotateCcw, Send } from 'lucide-react';

const AudioRecorder = ({ isRecording, onToggleRecording, isProcessing, maxDurationSec = 30, analyserNode }) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // ── Canvas waveform drawing using AnalyserNode ──
  useEffect(() => {
    if (!isRecording || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // If no analyserNode provided, draw random bars for visual effect
    const draw = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      if (analyserNode) {
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteTimeDomainData(dataArray);

        const barWidth = width / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
          const v = (dataArray[i] - 128) / 128;
          const barHeight = Math.abs(v) * height;
          const y = (height - barHeight) / 2;
          ctx.fillStyle = '#000000';
          ctx.fillRect(i * barWidth, y, Math.max(barWidth - 1, 1), barHeight || 1);
        }
      } else {
        // Fallback: animated random bars
        const barCount = 32;
        const barW = width / barCount;
        for (let i = 0; i < barCount; i++) {
          const h = Math.random() * height * 0.8 + height * 0.1;
          const y = (height - h) / 2;
          ctx.fillStyle = '#E0E0E0';
          ctx.fillRect(i * barW + 1, y, barW - 2, h);
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => animFrameRef.current && cancelAnimationFrame(animFrameRef.current);
  }, [isRecording, analyserNode]);

  // ── Elapsed timer + auto-stop ──
  useEffect(() => {
    if (!isRecording) {
      setElapsed(0);
      clearInterval(timerRef.current);
      return;
    }

    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        if (next >= maxDurationSec) {
          onToggleRecording?.(); // auto-stop
          return maxDurationSec;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isRecording, maxDurationSec]);

  const remaining = maxDurationSec - elapsed;

  return (
    <div className="flex flex-col items-center gap-8 my-8 relative">
      {/* Main button */}
      <div className="relative group mt-4">
        <button
          onClick={onToggleRecording}
          disabled={isProcessing}
          className={`
            relative z-10 flex items-center justify-center w-32 h-32 rounded-full border-4 border-neo-border outline-none transition-all duration-200 shadow-[8px_8px_0px_0px_#000]
            ${isProcessing ? 'cursor-not-allowed bg-neo-surface opacity-50' : 'cursor-pointer hover:-translate-y-1 active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_0px_#000]'}
            ${isRecording ? 'bg-[#FF2E2E] rotate-12' : 'bg-neo-text'}
          `}
        >
          {isRecording ? (
            <Square size={48} className="text-neo-bg fill-current" />
          ) : (
            <Mic size={48} className={isProcessing ? "text-neo-border" : "text-neo-bg"} />
          )}
        </button>
        {isRecording && (
          <div className="absolute inset-0 w-32 h-32 rounded-full border-8 border-neo-accent animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-60 -z-10" />
        )}
      </div>

      <div className="flex flex-col items-center bg-neo-secondary border-4 border-neo-border p-4 min-w-[240px] shadow-[4px_4px_0px_0px_#000] rotate-2 mt-4">
        {/* Status label */}
        <div className="font-sans font-black text-xl tracking-widest uppercase text-neo-text">
          {isProcessing ? 'Processing' : isRecording ? 'Recording' : 'Press to Speak'}
        </div>

        {/* Timer / countdown */}
        {isRecording && (
          <div className="font-sans font-black text-4xl text-neo-text tabular-nums mt-2">
            {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
            <span className="text-neo-text/70 text-base ml-2">/ {maxDurationSec}s</span>
          </div>
        )}
      </div>

      {/* Canvas waveform */}
      <div className={`transition-all duration-300 ${isRecording ? 'opacity-100 mt-8' : 'opacity-0 h-0 overflow-hidden'}`}>
        <canvas
          ref={canvasRef}
          width={300}
          height={60}
          className="w-full max-w-xs border-4 border-neo-border bg-neo-surface shadow-[4px_4px_0px_0px_#000] -rotate-1"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  );
};

export default AudioRecorder;
