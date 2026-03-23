import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Star } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] text-center relative overflow-hidden bg-neo-bg py-20 px-6">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none"></div>

      {/* Decorative spinner */}
      <div className="absolute top-10 left-10 rotate-12 z-0">
        <div className="w-24 h-24 bg-neo-accent border-4 border-neo-border shadow-[8px_8px_0px_0px_#000] flex items-center justify-center font-black text-neo-text text-4xl animate-spin-slow rounded-full"></div>
      </div>

      {/* Decorative star */}
      <div className="absolute bottom-24 right-16 z-0 hidden md:block">
        <Star size={64} strokeWidth={3} className="text-neo-secondary animate-spin-slow" style={{ animationDuration: '15s' }} />
      </div>

      {/* Main heading */}
      <h1 className="text-massive font-black uppercase tracking-tighter z-10 drop-shadow-[8px_8px_0px_var(--color-neo-muted)]" style={{
        WebkitTextStroke: '3px black',
        color: 'transparent'
      }}>
        VocalSync
      </h1>

      {/* Subtitle */}
      <p className="text-xl md:text-2xl max-w-2xl font-bold bg-black text-white border-4 border-neo-border px-6 py-4 shadow-[8px_8px_0px_0px_var(--color-neo-accent)] -rotate-1 z-10 mt-8">
        The ultimate dual-portal platform for speech therapy. Connect therapists and patients seamlessly.
      </p>

      {/* Portal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl mt-12 z-10">
        {/* Therapist Portal */}
        <div className="border-4 border-neo-border bg-neo-surface p-8 text-left flex flex-col items-start rotate-1 relative shadow-[8px_8px_0px_0px_#000] hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#000] transition-all group">
          {/* Sticker badge */}
          <div className="absolute -top-5 -right-5 z-20 bg-neo-secondary text-black font-black uppercase text-xs border-4 border-neo-border px-3 py-1 shadow-[3px_3px_0px_0px_#000] rotate-[15deg] hover:rotate-[25deg] transition-transform cursor-default">
            Pro
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4 text-neo-accent tracking-tighter leading-none">
            For<br/>Therapists
          </h2>
          <p className="text-lg font-bold mb-8 flex-1 text-black/80">
            Manage your patients, create AI-driven therapy plans, and track progress with advanced clinical tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link to="/therapist/login" className="flex-1 neo-btn neo-btn-primary flex items-center justify-center gap-2">
              Log In <ArrowRight size={18} strokeWidth={3} />
            </Link>
            <Link to="/therapist/register" className="flex-1 neo-btn bg-white flex items-center justify-center gap-2">
              Sign Up
            </Link>
          </div>
        </div>

        {/* Patient Portal */}
        <div className="border-4 border-neo-border bg-neo-surface p-8 flex flex-col items-start -rotate-1 relative text-left shadow-[8px_8px_0px_0px_#000] hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#000] transition-all group">
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4 tracking-tighter leading-none text-neo-muted">
            For<br/>Patients
          </h2>
          <p className="text-lg font-bold mb-8 flex-1 text-black/80">
            Access your daily exercises, track your streaks, and complete your assigned therapy sessions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link to="/patient/login" className="flex-1 neo-btn bg-neo-muted flex items-center justify-center gap-2">
              Log In <ArrowRight size={18} strokeWidth={3} />
            </Link>
            <Link to="/patient/register" className="flex-1 neo-btn bg-white flex items-center justify-center gap-2">
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      {/* Marquee Footer */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden whitespace-nowrap bg-neo-accent py-3 border-t-4 border-neo-border z-20">
        <p className="font-black text-black uppercase tracking-widest text-sm animate-marquee">
          • LATENCY AWARE • PHONEME LEVEL CTC ALIGNMENT • ADAPTIVE THRESHOLDS • NEO-BRUTALISM • AI-POWERED •&nbsp;
          • LATENCY AWARE • PHONEME LEVEL CTC ALIGNMENT • ADAPTIVE THRESHOLDS • NEO-BRUTALISM • AI-POWERED •
        </p>
      </div>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { display: inline-block; animation: marquee 25s linear infinite; }
      `}</style>
    </div>
  );
}
