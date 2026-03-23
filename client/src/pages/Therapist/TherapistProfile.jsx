import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Settings, Copy, Check, RefreshCw, Share2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function TherapistProfile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/therapist/profile');
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    };
    fetchProfile();
  }, []);

  const therapistCode = profile?.therapist_code;

  const handleCopy = () => {
    if (!therapistCode) return;
    navigator.clipboard.writeText(therapistCode);
    setCopied(true);
    toast.success('Therapist code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await api.post('/therapist/code/regenerate');
      setProfile(prev => ({ ...prev, therapist_code: res.data.therapist_code }));
      toast.success('New code generated!');
    } catch (err) {
      toast.error('Failed to regenerate code');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-12 pt-8 px-4 pb-16">
      {/* HEADER */}
      <div className="flex flex-col border-b-8 border-neo-border pb-8 mb-8">
        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-neo-text drop-shadow-[4px_4px_0px_var(--color-neo-accent)] leading-none">
          Profile
        </h1>
      </div>

      {/* THERAPIST CODE CARD */}
      <div className="bg-[#C4B5FD] border-4 border-neo-border p-8 md:p-12 relative overflow-hidden flex flex-col gap-6 shadow-[12px_12px_0px_0px_#000]">
        <div className="absolute top-6 right-6 z-10 opacity-50 block rotate-12">
          <Share2 size={48} className="text-neo-text" />
        </div>

        <div>
          <p className="font-mono text-sm uppercase font-black tracking-widest text-neo-text mb-4 bg-neo-surface px-3 py-1 inline-block border-2 border-neo-border -rotate-2 shadow-[2px_2px_0px_#000]">Registration Key</p>
          <p className="text-3xl md:text-4xl font-black uppercase tracking-tight text-neo-text leading-none mt-2 drop-shadow-[2px_2px_0px_#fff]">Therapist Code</p>
          <p className="font-bold text-neo-text/80 max-w-sm mt-4 text-lg">Share this code with your patients to seamlessly link their accounts to your clinical dashboard.</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap mt-4">
          <div className="bg-neo-bg border-4 border-neo-border px-8 py-4 min-w-[200px] flex items-center justify-center shadow-[6px_6px_0px_#000] rotate-1">
            <span className="font-mono text-4xl lg:text-5xl font-black tracking-widest text-neo-text select-all text-center">
              {therapistCode || '------'}
            </span>
          </div>

          <button
            onClick={handleCopy}
            disabled={!therapistCode}
            className="flex-shrink-0 bg-neo-text text-neo-bg hover:bg-neo-surface hover:text-neo-text border-4 border-neo-border p-5 disabled:opacity-40 flex items-center justify-center shadow-[6px_6px_0px_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0px_#000] active:translate-y-1 active:shadow-none transition-all -rotate-2"
            title="Copy code"
          >
            {copied ? <Check size={28} strokeWidth={3} /> : <Copy size={28} strokeWidth={3} />}
          </button>

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex-shrink-0 bg-[#FFD93D] text-neo-text hover:bg-[#FF6B6B] hover:text-white border-4 border-neo-border p-5 disabled:opacity-40 flex items-center justify-center shadow-[6px_6px_0px_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0px_#000] active:translate-y-1 active:shadow-none transition-all rotate-2"
            title="Generate new code"
          >
            <RefreshCw size={28} strokeWidth={3} className={regenerating ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* PROFILE INFO CARD */}
      <div className="bg-neo-surface border-4 border-neo-border p-8 md:p-12 flex flex-col md:flex-row gap-12 items-start shadow-[12px_12px_0px_0px_#000]">
        <div className="w-32 h-32 bg-[#FFD93D] border-4 border-neo-border flex items-center justify-center font-black text-6xl text-neo-text shrink-0 shadow-[6px_6px_0px_#000] rotate-3 hover:-rotate-3 transition-transform">
          {user?.name?.charAt(0)?.toUpperCase() || 'P'}
        </div>

        <div className="flex flex-col flex-1 w-full gap-8">
          <div>
            <p className="font-mono text-xs text-neo-text/60 uppercase font-black tracking-widest mb-2 border-b-2 border-neo-border w-fit pl-1 pr-4">Provider Name</p>
            <p className="text-4xl md:text-5xl font-black uppercase text-neo-text leading-none tracking-tighter drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">
              Dr. {profile?.name || user?.name || 'Unknown'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t-4 border-neo-border pt-8 w-full">
            <div>
              <p className="font-mono text-xs text-neo-text/60 uppercase font-black tracking-widest mb-1">Email</p>
              <p className="font-mono text-base font-bold text-neo-text truncate bg-neo-bg px-2 py-1 border-2 border-neo-border w-fit shadow-[2px_2px_0px_#000]">{profile?.email || user?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-neo-text/60 uppercase font-black tracking-widest mb-1">Specialization</p>
              <p className="text-xl font-black uppercase tracking-tight text-neo-text bg-neo-surface px-3 py-1 border-4 border-neo-border shadow-[4px_4px_0px_#000] inline-block -rotate-2">{profile?.specialization || 'General'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-mono text-xs text-neo-text/60 uppercase font-black tracking-widest mb-1">License No.</p>
              <p className="font-mono text-lg font-black text-neo-text border-4 border-neo-border px-4 py-2 inline-block bg-neo-bg shadow-[4px_4px_0px_#000] rotate-1">{profile?.license_number || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-4">
        <button className="bg-neo-bg text-neo-text hover:bg-[#FFD93D] hover:text-neo-text border-4 border-neo-border py-6 px-8 flex items-center justify-between group shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all rotate-1">
          <span className="font-sans font-black uppercase text-2xl tracking-tighter">Settings</span>
          <Settings size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
        </button>
        <button onClick={logout} className="bg-neo-text text-neo-bg hover:bg-[#FF6B6B] hover:text-white border-4 border-neo-text py-6 px-8 flex items-center justify-between group shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all -rotate-1">
          <span className="font-sans font-black uppercase text-2xl tracking-tighter">Sign Out</span>
          <LogOut size={32} strokeWidth={3} className="group-hover:translate-x-2 transition-transform" />
        </button>
      </div>
    </div>
  );
}
