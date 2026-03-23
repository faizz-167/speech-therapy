import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMe, updateMe, getCode, regenerateCode } from '../../api/therapists';
import { listPatients } from '../../api/patients';
import { Copy, Check, RefreshCw, Edit2, Save, Users, FileText, Activity, BadgeCheck, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingState from '../../components/shared/LoadingState';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ patients: 0, plans: 0, sessions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileData, codeData, patientsData] = await Promise.allSettled([
          getMe(),
          getCode(),
          listPatients()
        ]);
        
        // Handle profile
        if (profileData.status === 'fulfilled' && profileData.value) {
          setProfile(profileData.value);
          setEditForm({ name: profileData.value.name || '', email: profileData.value.email || '' });
        }
        
        // Handle code -- fallback to profile data if code route fails
        let fetchedCode = '';
        if (codeData.status === 'fulfilled' && codeData.value?.therapist_code) {
          fetchedCode = codeData.value.therapist_code;
        } else if (profileData.status === 'fulfilled' && profileData.value?.therapist_code) {
          fetchedCode = profileData.value.therapist_code;
        }
        setCode(fetchedCode);

        // Handle stats
        if (patientsData.status === 'fulfilled') {
          const pts = patientsData.value || [];
          setStats({
            patients: pts.length,
            plans: pts.filter(p => p.baseline_completed).length,
            sessions: 0,
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm("Regenerating your code will invalidate the current one. Patients who haven't registered yet will need the new code. Continue?")) return;
    try {
      const data = await regenerateCode();
      setCode(data.therapist_code || '');
      toast.success('Code regenerated');
    } catch {
      toast.error('Failed to regenerate code');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMe(editForm);
      setProfile(prev => ({ ...prev, ...editForm }));
      setEditing(false);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="LOADING PROFILE..." />;

  const statCards = [
    { label: 'Total Patients', value: stats.patients, icon: Users, bg: 'bg-[#1040C0]', text: 'text-white' },
    { label: 'Active Plans', value: stats.plans, icon: FileText, bg: 'bg-[#F0C020]', text: 'text-[#121212]' },
    { label: 'Sessions', value: stats.sessions || '—', icon: Activity, bg: 'bg-white', text: 'text-[#121212]' },
  ];

  const displayName = profile?.name || user?.name || 'Therapist';
  const displayEmail = profile?.email || user?.email || '—';

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10 p-4 relative z-10 pb-12">
      {/* Left Column: Profile Card */}
      <div className="w-full lg:w-1/3 flex flex-col">
        <div className="border-4 border-[#121212] bg-[#F0C020] shadow-[8px_8px_0px_0px_#121212] flex flex-col h-full relative">
          <div className="bg-[#121212] px-6 py-5 text-white flex items-center justify-between border-b-4 border-[#121212]">
            <h2 className="font-sans font-black uppercase tracking-widest text-xl">Identity</h2>
            <BadgeCheck size={24} className="text-[#F0C020]" />
          </div>
          
          <div className="px-6 py-12 flex flex-col items-center relative grow overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#121212_2px,transparent_2px)] [background-size:24px_24px]"></div>
            
            <div className="w-32 h-32 border-4 border-[#121212] bg-white shadow-[8px_8px_0px_0px_#121212] flex items-center justify-center font-black text-7xl -rotate-6 shrink-0 mb-8 z-10 relative">
              {displayName.charAt(0).toUpperCase()}
            </div>
            
            <h1 className="text-4xl font-sans font-black uppercase tracking-tighter text-[#121212] text-center z-10 mt-2 bg-white/90 px-4 py-1 border-2 border-[#121212] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-1">{displayName}</h1>
            <p className="font-mono text-sm font-bold text-[#121212] mt-6 z-10 bg-white px-3 py-1.5 border-2 border-[#121212] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{profile?.specialization || 'Clinical Therapist'}</p>
          </div>
          
          <div className="px-6 py-8 bg-white border-t-4 border-[#121212] flex flex-col gap-6">
            {editing ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono uppercase text-[10px] sm:text-xs font-black tracking-widest text-[#121212] bg-[#F0F0F0] w-fit px-2 py-0.5 border-2 border-[#121212]">Name</label>
                  <input className="neo-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono uppercase text-[10px] sm:text-xs font-black tracking-widest text-[#121212] bg-[#F0F0F0] w-fit px-2 py-0.5 border-2 border-[#121212]">Email</label>
                  <input className="neo-input" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button onClick={handleSave} disabled={saving} className="neo-btn bg-[#121212] text-white flex-1 flex items-center justify-center gap-2 text-sm">
                    <Save size={16} /> {saving ? 'SAVING...' : 'SAVE'}
                  </button>
                  <button onClick={() => setEditing(false)} className="neo-btn flex-1 text-sm bg-[#F0F0F0] hover:bg-[#E0E0E0]">CANCEL</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-neo-muted">Email Address</span>
                  <span className="font-sans font-bold text-base sm:text-lg truncate" title={displayEmail}>{displayEmail}</span>
                </div>
                {profile?.license_number && (
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-neo-muted">License Number</span>
                    <span className="font-sans font-bold text-base sm:text-lg">{profile.license_number}</span>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-neo-muted">Member Since</span>
                  <span className="font-sans font-bold text-base sm:text-lg">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
                <button onClick={() => setEditing(true)} className="neo-btn text-sm w-full flex items-center justify-center gap-2 mt-4 bg-white hover:bg-[#F0C020] transition-colors group">
                  <Edit2 size={16} className="group-hover:scale-110 transition-transform" /> MODIFY PROFILE
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Key Info & Stats */}
      <div className="w-full lg:w-2/3 flex flex-col gap-8 lg:gap-10">
        
        {/* Therapist Code Section */}
        <div className="border-4 border-[#121212] bg-[#1040C0] p-2 sm:p-3 shadow-[8px_8px_0px_0px_#121212] relative flex flex-col">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 md:-mr-10 md:-mt-10 opacity-20 pointer-events-none overflow-hidden">
            <ShieldAlert size={160} strokeWidth={1} color="white" />
          </div>
          
          <div className="bg-white border-4 border-[#121212] p-6 lg:p-8 flex flex-col gap-4 relative z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-sans text-2xl sm:text-3xl font-black uppercase tracking-widest text-[#121212]">Therapist Code</h2>
            <p className="font-sans text-sm md:text-base text-[#121212] font-semibold border-l-4 border-[#F0C020] pl-3 py-1 bg-[#F0C020]/10">
              Share this code with your patients. They must enter it when creating their account to link to your dashboard.
            </p>
            
            <div className="flex flex-col md:flex-row items-stretch gap-4 mt-6">
              <div className="flex-1 w-full border-4 border-[#121212] bg-[#F0F0F0] flex items-center justify-center font-mono font-black text-4xl sm:text-5xl tracking-[0.1em] uppercase shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)] py-6 px-4 md:py-0 min-h-[100px]">
                {code || '—'}
              </div>
              <div className="flex flex-col gap-3 w-full md:w-48 shrink-0">
                <button onClick={copyCode} className="neo-btn flex-1 bg-[#F0C020] text-[#121212] flex items-center justify-center gap-2 text-sm shadow-[4px_4px_0px_0px_#121212] hover:bg-[#121212] hover:text-[#F0C020] transition-colors py-3 md:py-4">
                  {copied ? <><Check size={18} strokeWidth={3} /> COPIED!</> : <><Copy size={18} strokeWidth={3} /> COPY CODE</>}
                </button>
                <button onClick={handleRegenerate} className="neo-btn flex-1 bg-white text-[#121212] flex items-center justify-center gap-2 text-sm shadow-[4px_4px_0px_0px_#121212] hover:bg-[#D02020] hover:text-white transition-colors py-3 md:py-4">
                  <RefreshCw size={16} /> REGENERATE
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
          {statCards.map((s, i) => (
            <div key={i} className={`p-6 sm:p-8 ${s.bg} border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] flex flex-col items-center text-center justify-center gap-4 transition-transform hover:-translate-y-1`}>
              <div className={`p-3 border-4 border-[${s.text.replace('text-', '')}] rounded-full opacity-90`}>
                 <s.icon size={32} className={`${s.text}`} strokeWidth={3} />
              </div>
              <div className={`${s.text} flex flex-col gap-2 items-center`}>
                <span className="font-sans text-5xl md:text-6xl font-black leading-none drop-shadow-sm">{s.value}</span>
                <span className={`font-mono text-[10px] md:text-xs font-black uppercase tracking-widest mt-1 px-3 py-1 border-2 border-[${s.text.replace('text-', '')}] shadow-[2px_2px_0px_0px_${s.text.replace('text-', '')}]`}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
