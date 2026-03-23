import React from 'react';
import { ArrowUp, ArrowDown, RotateCcw, Bell, Shuffle, ShieldAlert } from 'lucide-react';

const config = {
  advance: {
    icon: ArrowUp,
    text: 'LEVEL UP: Moving up a difficulty',
    bg: 'bg-neo-text',
    textColor: 'text-neo-bg',
    border: 'border-neo-border',
  },
  stay: {
    icon: RotateCcw,
    text: 'Keep practising at this level',
    bg: 'bg-neo-bg',
    textColor: 'text-neo-text',
    border: 'border-neo-border',
  },
  drop: {
    icon: ArrowDown,
    text: 'LEVEL DOWN: Moving to an easier level',
    bg: 'bg-[#FF2E2E]',
    textColor: 'text-white',
    border: 'border-neo-border',
  },
  switched_task: {
    icon: Shuffle,
    text: 'TASK SWITCH: Trying a related exercise',
    bg: 'bg-neo-surface',
    textColor: 'text-neo-text',
    border: 'border-neo-border',
  },
  frustration_override: {
    icon: ShieldAlert,
    text: 'BREAK SUGGESTED: High frustration detected',
    bg: 'bg-[#FF2E2E]',
    textColor: 'text-white',
    border: 'border-neo-border',
  },
  clinician_alert: {
    icon: Bell,
    text: 'Your therapist has been notified',
    bg: 'bg-neo-surface',
    textColor: 'text-neo-text',
    border: 'border-neo-border',
  },
};

const AdaptiveAction = ({ action }) => {
  if (!action || !config[action]) return null;

  const cfg = config[action];
  const Icon = cfg.icon;

  return (
    <div className={`w-full p-6 md:p-8 border-4 ${cfg.border} ${cfg.bg} flex items-center gap-6 shadow-[8px_8px_0px_0px_#000] rotate-1`}>
      <div className={`p-4 border-4 ${cfg.textColor === 'text-neo-text' ? 'border-neo-border bg-neo-bg shadow-[4px_4px_0px_0px_var(--color-neo-accent)]' : 'border-neo-bg bg-neo-text drop-shadow-[2px_2px_0px_#000]'} shrink-0`}>
         <Icon size={36} className={cfg.textColor} />
      </div>
      <p className={`font-sans font-black text-xl md:text-2xl uppercase tracking-widest ${cfg.textColor}`}>{cfg.text}</p>
    </div>
  );
};

export default AdaptiveAction;
