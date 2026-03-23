import React from 'react';

const PromptCard = ({ prompt }) => {
  if (!prompt) return null;

  return (
    <div className="w-full max-w-2xl mx-auto border-4 border-[#121212] p-8 md:p-12 mt-12 flex flex-col items-center justify-center min-h-[300px] bg-white relative shadow-[16px_16px_0px_0px_#121212]">
      <div className="absolute -top-6 -left-6 bg-[#1040C0] text-white font-sans text-sm md:text-base font-black px-6 py-2 border-4 border-[#121212] uppercase tracking-widest shadow-[4px_4px_0px_0px_#121212]">
        {prompt.task_type || 'EXERCISE'}
      </div>
      
      {prompt.stimulus_content?.image_url && (
        <img 
          src={prompt.stimulus_content.image_url} 
          alt="Stimulus" 
          className="max-w-[80%] max-h-48 object-contain mb-8 border-4 border-[#121212] bg-white shadow-[6px_6px_0px_0px_#121212]"
        />
      )}
      
      <h2 className="text-5xl md:text-6xl font-sans font-black text-[#121212] text-center tracking-tighter leading-none mb-6">
        {prompt.stimulus_content?.text || prompt.target_text}
      </h2>
      
      <p className="mt-2 font-sans font-bold text-[#121212] text-xl md:text-2xl tracking-widest uppercase text-center border-b-4 border-[#D02020] pb-2">
        {prompt.instructions || "Read the text clearly."}
      </p>
    </div>
  );
};

export default PromptCard;
