import React from 'react';
import { Volume2, ImageOff } from 'lucide-react';

const StimulusCard = ({ currentItem }) => {
  if (!currentItem) return null;

  const type = currentItem.response_type || currentItem.task_type || 'default';
  const displayContent = currentItem.display_content || currentItem.stimulus_content?.text || currentItem.item_label || '';
  const instruction = currentItem.instruction || '';
  const imageKeyword = currentItem.image_keyword || null;

  const handlePlayTTS = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const TealBanner = ({ text }) => (
    <div className="w-full border-4 border-neo-border bg-neo-text px-6 py-6 mb-8 text-center shadow-[8px_8px_0px_0px_var(--color-neo-accent)] -rotate-1 z-10 relative">
      <p className="font-sans font-black text-xl md:text-2xl text-neo-bg uppercase tracking-widest">{text}</p>
    </div>
  );

  const renderByType = () => {
    switch (type) {
      // ──── PICTURE NAMING: image only, word NEVER shown ────
      case 'picture_naming':
        return (
          <div className="flex flex-col items-center w-full">
            <img
              src={`/images/${imageKeyword || 'placeholder'}.png`}
              alt={displayContent}
              className="max-w-[90%] max-h-72 object-contain p-6 border-2 border-neo-border bg-white mb-6 bh-panel"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback: only shown when image fails to load */}
            <div className="hidden w-full max-w-sm h-64 border-2 border-neo-border bg-neo-surface items-center justify-center mb-6 text-center p-4 bh-panel">
              <span className="font-sans text-4xl text-black font-black uppercase tracking-widest">{displayContent}</span>
            </div>
            <p className="font-sans font-bold text-xl text-black tracking-widest uppercase border-b-2 border-neo-border pb-2 mt-4">Name what you see</p>
          </div>
        );

      // ──── WORD REPETITION: text + TTS speaker button ────
      case 'word_repetition':
        return (
          <div className="flex flex-col items-center gap-8 w-full">
            <button
              onClick={() => handlePlayTTS(displayContent)}
              className="w-24 h-24 rounded-full border-4 border-neo-border bg-neo-accent flex items-center justify-center text-neo-text hover:scale-105 active:scale-95 transition-all shadow-[4px_4px_0px_0px_#000] rotate-6"
            >
              <Volume2 size={48} strokeWidth={3} />
            </button>
            <h2 className="text-6xl md:text-7xl font-sans font-black text-black text-center tracking-tighter leading-none mt-2">
              {displayContent}
            </h2>
            <p className="font-sans font-bold text-black text-xl tracking-widest uppercase border-b-2 border-neo-border pb-2 mt-2">Listen, then repeat</p>
          </div>
        );

      // ──── MINIMAL PAIRS: two words side by side ────
      case 'minimal_pairs': {
        const words = displayContent.split(/\s*[—–-]\s*/);
        return (
          <div className="flex flex-col items-center gap-8 w-full">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 bg-neo-surface border-2 border-neo-border p-8 md:p-12 w-full max-w-2xl justify-center bh-panel">
              <span className="text-5xl md:text-6xl font-sans font-black text-black uppercase tracking-tighter">{words[0] || displayContent}</span>
              <div className="w-16 h-2 bg-neo-border mx-2"></div>
              <span className="text-5xl md:text-6xl font-sans font-black text-black uppercase tracking-tighter">{words[1] || ''}</span>
            </div>
            <p className="font-sans font-bold text-black text-xl tracking-widest uppercase border-b-2 border-neo-border pb-2 mt-4">Say both words clearly</p>
          </div>
        );
      }

      // ──── SYLLABLE REPETITION: huge monospace with letter-spacing ────
      case 'syllable_repetition':
        return (
          <div className="flex flex-col items-center gap-8 w-full">
            <h2 className="font-sans font-black text-black text-center uppercase tracking-widest" style={{ fontSize: '6rem' }}>
              {displayContent}
            </h2>
            {instruction && <p className="font-sans font-bold text-xl text-black tracking-widest uppercase border-b-2 border-neo-border pb-2 text-center max-w-lg">{instruction}</p>}
          </div>
        );

      // ──── SENTENCE READING: readable text, natural pace ────
      case 'sentence_reading':
        return (
          <div className="flex flex-col w-full">
            {instruction && <TealBanner text={instruction} />}
            <div className="p-8 md:p-12 border-2 border-neo-border bg-neo-surface bh-panel">
              <p className="font-sans text-black text-center font-bold" style={{ fontSize: '2rem', lineHeight: '1.4' }}>
                {displayContent}
              </p>
            </div>
          </div>
        );

      // ──── PARAGRAPH READING: multi-sentence passage ────
      case 'paragraph_reading':
        return (
          <div className="flex flex-col w-full">
            {instruction && <TealBanner text={instruction} />}
            <div className="p-8 md:p-12 border-2 border-neo-border bg-white bh-panel">
               <p className="font-sans text-black text-left whitespace-pre-line font-bold" style={{ fontSize: '1.4rem', lineHeight: '1.8' }}>
                 {displayContent}
               </p>
            </div>
          </div>
        );

      // ──── SEQUENCE RECITATION: instruction above, sequence below ────
      case 'sequence_recitation':
        return (
          <div className="flex flex-col items-center gap-8 w-full">
            {instruction && <TealBanner text={instruction} />}
            <h2 className="font-sans font-black text-black text-center tracking-tighter" style={{ fontSize: '3rem' }}>
              {displayContent}
            </h2>
          </div>
        );

      // ──── FREE DESCRIPTION: image with caption OR instruction prompt ────
      case 'free_description':
        return (
          <div className="flex flex-col items-center gap-8 w-full">
            {imageKeyword ? (
              <div className="flex flex-col items-center border-2 border-neo-border bg-neo-surface p-6 bh-panel">
                <img
                  src={`/images/${imageKeyword}.png`}
                  alt={displayContent}
                  className="max-w-[90%] max-h-72 object-contain border-2 border-neo-border bg-white mb-6"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <p className="font-sans font-black text-black text-2xl text-center uppercase tracking-widest">{displayContent}</p>
              </div>
            ) : null}
            {instruction && (
              <div className="w-full bg-black border-2 border-neo-border p-6 text-center mt-4 bh-panel">
                <p className="font-sans text-xl md:text-2xl text-white font-black uppercase tracking-widest">{instruction}</p>
              </div>
            )}
          </div>
        );

      // ──── NON-WORD REPETITION / SENTENCE REPETITION: same as word_repetition ────
      case 'non_word_repetition':
      case 'sentence_repetition':
        return (
          <div className="flex flex-col items-center gap-8 w-full">
            <button
              onClick={() => handlePlayTTS(displayContent)}
              className="w-24 h-24 rounded-full border-4 border-neo-border bg-neo-accent flex items-center justify-center text-neo-text hover:scale-105 active:scale-95 transition-all shadow-[4px_4px_0px_0px_#000] rotate-6"
            >
              <Volume2 size={48} strokeWidth={3} />
            </button>
            <h2 className="text-5xl md:text-7xl font-sans font-black text-black text-center tracking-tighter leading-none mt-2">
              {displayContent}
            </h2>
            <p className="font-sans font-bold text-black text-xl tracking-widest uppercase border-b-2 border-neo-border pb-2 mt-2">Listen and repeat</p>
          </div>
        );

      // ──── DEFAULT ────
      default:
        return (
          <div className="flex flex-col items-center w-full">
            <h2 className="text-5xl md:text-7xl font-sans font-black text-black text-center uppercase tracking-tighter w-full">
              {displayContent}
            </h2>
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto border-4 border-neo-border p-8 md:p-12 flex flex-col items-center justify-center min-h-[400px] bg-neo-surface relative mt-12 mb-12 shadow-[12px_12px_0px_0px_#000]">
      {/* Type label */}
      <div className="absolute -top-6 -left-6 bg-neo-text text-neo-accent font-sans text-sm font-black px-6 py-2 uppercase tracking-widest border-4 border-neo-border shadow-[4px_4px_0px_0px_#000] -rotate-3 z-20">
        {type.replace(/_/g, ' ')}
      </div>
      {renderByType()}
    </div>
  );
};

export default StimulusCard;
