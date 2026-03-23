import React from 'react';

const levelStyles = {
  easy: 'text-white bg-[#1040C0] border-2 border-[#121212]',
  medium: 'text-[#121212] bg-[#F0C020] border-2 border-[#121212]',
  advanced: 'text-white bg-[#D02020] border-2 border-[#121212]',
};

const LevelBadge = ({ level }) => {
  const style = levelStyles[level] || levelStyles.easy;
  return (
    <span className={`inline-block font-sans text-xs font-black uppercase px-2 py-0.5 shadow-[2px_2px_0px_0px_#121212] ${style}`}>
      {level}
    </span>
  );
};

export default LevelBadge;
