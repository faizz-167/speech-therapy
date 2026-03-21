import { useState } from 'react';
import { FiVolume2, FiImage } from 'react-icons/fi';

export default function StimulusCard({ response_type, display_content, image_keyword, instruction }) {
  const [imageError, setImageError] = useState(false);

  // Helper to play TTS
  const playTTS = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const renderContent = () => {
    switch (response_type) {
      case 'picture_naming':
        if (image_keyword && !imageError) {
          return (
            <div className="flex flex-col items-center justify-center">
              <div className="w-[400px] h-[400px] bg-white border-4 border-black overflow-hidden shadow-[4px_4px_0px_0px_#000] relative flex items-center justify-center">
                <img 
                  src={`/images/${image_keyword}.webp`} 
                  alt={display_content || image_keyword} 
                  onError={() => setImageError(true)}
                  className="w-full h-full object-contain p-4"
                />
              </div>
            </div>
          );
        }
        // Fallback or no image keyword
        return (
          <div className="flex flex-col items-center justify-center w-[400px] h-[400px] bg-white border-4 border-black shadow-[4px_4px_0px_0px_#000]">
            <FiImage className="w-16 h-16 text-black/20 mb-4" />
            <p className="text-4xl font-black text-black uppercase">{display_content}</p>
          </div>
        );

      case 'minimal_pairs': {
        // e.g., "pan — ban" or "pan vs ban"
        const pairs = display_content.includes('—') 
          ? display_content.split('—').map(s => s.trim()) 
          : display_content.includes('vs') 
            ? display_content.split('vs').map(s => s.trim())
            : [display_content];

        return (
          <div className="flex items-center justify-center gap-8 w-full">
            {pairs.map((word, i) => (
              <div key={i} className="flex-1 bg-white border-4 border-black p-8 text-center shadow-[4px_4px_0px_0px_#000]">
                <p className="text-5xl font-black text-black uppercase">{word}</p>
              </div>
            ))}
          </div>
        );
      }

      case 'word_repetition':
      case 'repetition':
        return (
          <div className="flex flex-col items-center justify-center">
            <button 
              onClick={() => playTTS(display_content)}
              className="mb-6 w-16 h-16 bg-neo-accent border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] transition-all"
              title="Listen to word"
            >
              <FiVolume2 className="w-8 h-8 text-black" strokeWidth={3} />
            </button>
            <p className="text-5xl font-black text-black uppercase tracking-wide">{display_content}</p>
          </div>
        );

      case 'syllable_repetition':
        return (
          <p className="text-6xl font-mono font-black text-black tracking-[0.3em] uppercase">
            {display_content}
          </p>
        );

      case 'sentence_reading':
      case 'paragraph_reading':
      case 'free_description':
      case 'read_aloud':
      default:
        return (
          <p className="text-4xl font-black text-black leading-snug">
            {display_content}
          </p>
        );
    }
  };

  return (
    <div className="bg-neo-bg border-4 border-black p-8 mb-8 text-center relative -rotate-1 shadow-[8px_8px_0px_0px_#000] mx-auto w-full max-w-2xl">
      {instruction && (
        <span className="absolute -top-4 left-4 bg-neo-accent px-3 py-1 border-4 border-black text-xs font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_#000]">
          {instruction}
        </span>
      )}
      <div className="mt-4 flex flex-col items-center justify-center min-h-[200px]">
        {renderContent()}
      </div>
    </div>
  );
}
