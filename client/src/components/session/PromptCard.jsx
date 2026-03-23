import React from 'react';

const PromptCard = ({ prompt }) => {
  if (!prompt) return null;

  const { task_mode, display_content, instruction, scenario_context, prompt_type, evaluation_criteria } = prompt;

  const ScenarioContext = () => scenario_context ? (
    <div className="bg-neo-text text-neo-bg px-6 py-2 border-4 border-neo-border uppercase font-black tracking-widest text-sm mb-8 inline-block mx-auto text-center shadow-[4px_4px_0px_0px_#000] rotate-1">
      {scenario_context}
    </div>
  ) : null;

  const InstructionText = () => instruction ? (
    <div className="mt-10 bg-neo-surface text-neo-text px-8 py-4 border-4 border-neo-border uppercase font-black tracking-widest text-sm md:text-base text-center inline-block mx-auto shadow-[4px_4px_0px_0px_#000] -rotate-1">
      {instruction}
    </div>
  ) : null;

  const renderByMode = () => {
    switch (task_mode) {
      case 'word_drill':
        return (
          <div className="flex flex-col items-center justify-center">
            <ScenarioContext />
            <div className="bg-neo-bg border-4 border-neo-border py-10 px-16 relative group z-10 shadow-[8px_8px_0px_0px_#000]">
              <h2 className="text-6xl md:text-8xl font-sans font-black text-neo-text text-center leading-[0.85] tracking-tighter uppercase relative z-20 drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">
                {display_content}
              </h2>
            </div>
            <InstructionText />
          </div>
        );

      case 'sentence_read':
        return (
          <div className="flex flex-col w-full text-center items-center">
            <ScenarioContext />
            <div className="bg-neo-bg border-4 border-neo-border p-8 relative shadow-[8px_8px_0px_0px_#000]">
              <p className="font-sans text-neo-text font-black text-3xl md:text-5xl leading-[1.2] tracking-tight uppercase drop-shadow-[2px_2px_0px_var(--color-neo-accent)]" style={{ wordSpacing: '0.2em' }}>
                {display_content}
              </p>
            </div>
            <InstructionText />
          </div>
        );

      case 'paragraph_read':
        return (
          <div className="flex flex-col w-full items-center">
            <ScenarioContext />
            <div className="bg-neo-bg border-4 border-neo-border p-6 md:p-10 w-full text-justify relative shadow-[8px_8px_0px_0px_#000]">
              <p className="font-sans text-neo-text font-black text-xl md:text-2xl whitespace-pre-line leading-[1.6]">
                {display_content}
              </p>
            </div>
            <InstructionText />
          </div>
        );

      case 'free_speech': {
        const lines = display_content ? display_content.split('\n') : [];
        const bullets = lines.filter(l => l.trim().startsWith('•'));
        const nonBullets = lines.filter(l => !l.trim().startsWith('•'));
        return (
          <div className="flex flex-col w-full items-center">
            <ScenarioContext />
            <div className="bg-neo-bg border-4 border-neo-border p-8 w-full shadow-[8px_8px_0px_0px_#000]">
              {nonBullets.length > 0 && (
                <p className="font-sans text-neo-text font-black text-3xl uppercase tracking-tight mb-8 drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">{nonBullets.join(' ')}</p>
              )}
              {bullets.length > 0 && (
                <ul className="list-none flex flex-col gap-4 mb-4">
                  {bullets.map((b, i) => (
                    <li key={i} className="font-sans text-neo-text font-black text-xl flex items-start gap-4 p-4 border-4 border-neo-border bg-neo-surface shadow-[4px_4px_0px_0px_#000]">
                      <div className="w-6 h-6 shrink-0 bg-neo-text mt-1 rotate-45" />
                      <span>{b.replace('•', '').trim()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <InstructionText />
          </div>
        );
      }

      case 'stuttering':
        return (
          <div className="flex flex-col w-full items-center">
            {scenario_context && (
              <div className="w-full bg-neo-text border-4 border-neo-border p-6 mb-8 shadow-[8px_8px_0px_0px_var(--color-neo-accent)] rotate-1">
                <p className="font-sans text-neo-bg font-black text-xl md:text-2xl uppercase tracking-widest text-center">{scenario_context}</p>
              </div>
            )}
            <div className="py-6 px-10 border-4 border-neo-border bg-neo-surface relative shadow-[8px_8px_0px_0px_#000] -rotate-1">
              <h2 className="text-4xl md:text-6xl font-sans font-black text-neo-text text-center uppercase tracking-tighter drop-shadow-[2px_2px_0px_#FFF]">
                {display_content}
              </h2>
            </div>
            <InstructionText />
          </div>
        );

      case 'roleplay': {
        const lines = display_content ? display_content.split('\n') : [];
        const clinicianLine = lines.find(l => l.trim().startsWith('Clinician:'));
        const rest = lines.filter(l => !l.trim().startsWith('Clinician:')).join('\n');
        return (
          <div className="flex flex-col w-full gap-8 items-center">
            <ScenarioContext />
            <div className="w-full flex flex-col gap-8">
              {clinicianLine && (
                <div className="relative p-6 bg-neo-surface border-4 border-neo-border shadow-[8px_8px_0px_0px_#000] rotate-1">
                  <p className="font-sans text-neo-text text-2xl font-black uppercase tracking-tight drop-shadow-[1px_1px_0px_#FFF]">
                    <span className="bg-neo-text text-neo-bg px-3 py-1 text-sm border-2 border-neo-border inline-block -rotate-3 mr-4 tracking-widest">CLINICIAN</span>
                    {clinicianLine.replace('Clinician:', '').trim()}
                  </p>
                </div>
              )}
              {rest.trim() && (
                <div className="p-6 bg-neo-bg border-4 border-neo-border shadow-[8px_8px_0px_0px_#000] ml-4 -rotate-1">
                  <p className="font-sans text-neo-text font-black text-xl leading-relaxed">{rest}</p>
                </div>
              )}
            </div>
            <InstructionText />
          </div>
        );
      }

      default:
        return (
          <div className="flex flex-col items-center">
            <ScenarioContext />
            <div className="bg-white border-2 border-neo-border py-8 px-12 bh-panel">
              <h2 className="text-4xl md:text-5xl font-sans font-black text-black text-center uppercase tracking-tighter">{display_content}</h2>
            </div>
            <InstructionText />
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto border-4 border-neo-border p-8 md:p-12 bg-neo-bg relative min-h-[400px] flex flex-col justify-center group shadow-[12px_12px_0px_0px_#000]">
      {/* Warmup badge */}
      {prompt_type === 'warmup' && (
        <div className="absolute -top-6 -right-6 bg-neo-accent text-neo-text font-sans text-xl font-black px-6 py-2 border-4 border-neo-border uppercase z-20 shadow-[4px_4px_0px_0px_#000] rotate-6">
          Practice Round
        </div>
      )}
      {/* Evaluation criteria badge */}
      {evaluation_criteria && (
        <div className="absolute -top-4 -left-6 bg-neo-text text-neo-bg font-sans text-sm font-black px-6 py-2 border-4 border-neo-border uppercase z-20 shadow-[4px_4px_0px_0px_var(--color-neo-accent)] -rotate-3">
          {evaluation_criteria}
        </div>
      )}
      <div className="z-10 w-full mt-4">
        {renderByMode()}
      </div>
    </div>
  );
};

export default PromptCard;
