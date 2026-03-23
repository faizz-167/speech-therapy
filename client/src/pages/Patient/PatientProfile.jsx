import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut, Settings } from 'lucide-react';

export default function PatientProfile() {
  const { user, logout } = useAuth();

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-12 pt-8 px-4 pb-16">
      {/* HEADER */}
      <div className="flex flex-col border-b-4 border-neo-border pb-8">
        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-neo-text leading-none drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">
          My Profile
        </h1>
      </div>

      <div className="bg-neo-bg border-4 border-neo-border p-8 md:p-12 flex flex-col md:flex-row gap-12 items-start shadow-[8px_8px_0px_0px_#000] rotate-1">
        <div className="w-40 h-40 bg-neo-accent border-4 border-neo-border flex items-center justify-center font-black text-8xl text-neo-text shrink-0 shadow-[4px_4px_0px_0px_#000] -rotate-3 hover:rotate-3 transition-transform">
          {user?.name?.charAt(0)?.toUpperCase() || 'P'}
        </div>
        
        <div className="flex flex-col flex-1 w-full gap-8">
          <div className="bg-neo-surface p-6 border-4 border-neo-border shadow-[4px_4px_0px_0px_#000]">
            <p className="font-sans text-xs text-neo-text uppercase font-black tracking-widest mb-2 border-b-4 border-neo-border inline-block pb-1">Patient Name</p>
            <p className="text-4xl md:text-5xl font-black uppercase text-neo-text leading-none tracking-tighter drop-shadow-[2px_2px_0px_#FFF]">{user?.name || 'Unknown'}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
            <div className="bg-neo-surface p-6 border-4 border-neo-border shadow-[4px_4px_0px_0px_#000]">
              <p className="font-sans text-xs text-neo-text uppercase font-black tracking-widest mb-2 border-b-4 border-neo-border inline-block pb-1">Email</p>
              <p className="font-sans text-base font-black text-neo-text truncate">{user?.email || 'N/A'}</p>
            </div>
            <div className="bg-neo-surface p-6 border-4 border-neo-border shadow-[4px_4px_0px_0px_#000]">
              <p className="font-sans text-xs text-neo-text uppercase font-black tracking-widest mb-2 border-b-4 border-neo-border inline-block pb-1">Linked Therapist ID</p>
              <p className="font-sans text-sm font-black text-neo-text uppercase break-all border-4 border-neo-border px-3 py-1 inline-block bg-white shadow-[2px_2px_0px_0px_#000] rotate-2 mt-1">
                {user?.therapist_id || 'unassigned'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12 -rotate-1">
        <button className="bh-button bg-neo-surface text-neo-text border-4 border-neo-border py-8 px-8 flex items-center justify-between group shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#000] active:translate-y-1 active:shadow-[4px_4px_0px_0px_#000] transition-all">
          <span className="font-sans font-black uppercase text-3xl tracking-tighter drop-shadow-[1px_1px_0px_#FFF]">Settings</span>
          <Settings size={36} strokeWidth={2} className="group-hover:rotate-90 transition-transform bg-white border-4 border-neo-border rounded-full p-1" />
        </button>
        <button onClick={logout} className="bh-button bg-neo-text text-neo-bg hover:bg-[#FF2E2E] hover:text-neo-text border-4 border-neo-text hover:border-neo-border py-8 px-8 flex items-center justify-between group shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#000] active:translate-y-1 active:shadow-[4px_4px_0px_0px_#000] transition-all">
          <span className="font-sans font-black uppercase text-3xl tracking-tighter drop-shadow-[1px_1px_0px_#000] group-hover:drop-shadow-[1px_1px_0px_#FFF]">Sign Out</span>
          <LogOut size={36} strokeWidth={2} className="group-hover:translate-x-2 transition-transform bg-neo-surface border-4 border-neo-border rounded-full p-1 text-neo-text" />
        </button>
      </div>
    </div>
  );
}
