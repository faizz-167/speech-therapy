import React from 'react';

const LoadingState = ({ message = "LOADING..." }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full py-16 gap-6">
      <div className="w-16 h-16 border-4 border-[#121212] bg-[#F0C020] animate-bounce shadow-[4px_4px_0px_0px_#121212]"></div>
      <h2 className="font-sans text-xl font-black uppercase tracking-widest text-[#121212] animate-pulse">
        {message}
      </h2>
    </div>
  );
};

export default LoadingState;
