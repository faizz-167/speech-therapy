import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiActivity, FiArrowRight, FiArrowLeft } from 'react-icons/fi';

export default function Register() {
  const { registerTherapist, registerPatient } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', specialization: '', clinic: '', experience: '',
    age: '', gender: '', language: 'English', therapist_code: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (role === 'therapist') {
        await registerTherapist({ name: form.name, email: form.email, password: form.password, specialization: form.specialization, clinic: form.clinic, experience: parseInt(form.experience) || 0 });
        navigate('/therapist');
      } else {
        await registerPatient({ name: form.name, email: form.email, password: form.password, age: parseInt(form.age) || 0, gender: form.gender, language: form.language, therapist_code: form.therapist_code });
        navigate('/patient/me');
      }
    } catch (err) { setError(err.message || 'Registration failed'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* LEFT: Form Side */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center p-8 lg:p-24 relative z-10 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto">
          {/* Mobile Brand */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-neo-accent flex items-center justify-center">
              <FiActivity className="w-6 h-6 text-black" strokeWidth={3} />
            </div>
            <span className="text-black font-black text-2xl uppercase tracking-tighter">VocalSync</span>
          </div>

          <div className="mb-12">
            <h1 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter text-black mb-2">
              Join.
            </h1>
            <p className="text-black/60 font-bold text-lg">
              Create your therapeutic profile.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-8">
            <div className={`h-1 flex-1 transition-colors ${step >= 1 ? 'bg-black' : 'bg-black/10'}`} />
            <div className={`h-1 flex-1 transition-colors ${step >= 2 ? 'bg-black' : 'bg-black/10'}`} />
          </div>

          {error && (
            <div className="bg-primary/10 border-l-4 border-primary p-4 font-bold text-sm text-primary mb-8">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <label className="block text-xs font-black uppercase tracking-widest text-black">Select Profile Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { value: 'therapist', label: 'Clinical Provider', desc: 'Manage caseloads & generate plans' },
                  { value: 'patient', label: 'Therapy Patient', desc: 'Complete assigned exercises' }
                ].map(r => (
                  <button 
                    key={r.value} 
                    type="button" 
                    onClick={() => { setRole(r.value); setStep(2); }}
                    className="group border-2 border-neo-border p-6 text-left transition-all hover:bg-black hover:text-white"
                  >
                    <p className="font-black text-xl uppercase mb-1">{r.label}</p>
                    <p className="font-bold text-sm text-black/50 group-hover:text-white/70">{r.desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-left text-sm font-bold text-black/50 pt-6">
                Already registered?{' '}
                <Link to="/login" className="text-black hover:underline underline-offset-4 decoration-2">
                  Sign in here
                </Link>
              </p>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black/50 hover:text-black mb-6 transition-colors"
              >
                <FiArrowLeft className="w-4 h-4" strokeWidth={3} /> Change Profile Type
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Full Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className="bh-input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Email Address</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required className="bh-input w-full" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Password</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required className="bh-input w-full" placeholder="••••••••" />
              </div>

              {role === 'therapist' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Specialization</label>
                    <input type="text" value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} className="bh-input w-full" placeholder="e.g. Pediatric SLP" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Clinic Name</label>
                    <input type="text" value={form.clinic} onChange={e => setForm(p => ({ ...p, clinic: e.target.value }))} className="bh-input w-full" />
                  </div>
                </div>
              )}

              {role === 'patient' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Age</label>
                      <input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} required className="bh-input w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Gender</label>
                      <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className="bh-input w-full">
                        <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Language</label>
                      <input type="text" value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))} className="bh-input w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Therapist Code</label>
                      <input type="text" value={form.therapist_code} onChange={e => setForm(p => ({ ...p, therapist_code: e.target.value }))} required className="bh-input w-full border-primary" placeholder="Ask your provider" />
                    </div>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="bh-btn bh-btn-primary w-full flex items-center justify-between text-lg disabled:opacity-50 mt-8"
              >
                <span>{loading ? 'Processing...' : 'Complete Profile'}</span>
                <FiArrowRight className="w-6 h-6" strokeWidth={3} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* RIGHT: Branding Side */}
      <div className="hidden lg:flex w-1/2 bg-black items-center justify-center p-24 relative overflow-hidden">
        {/* Massive Watermark Typography */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <h2 className="text-[15vw] font-black leading-none tracking-tighter text-white select-none text-center">
            VOCAL<br/>SYNC
          </h2>
        </div>
        
        <div className="relative z-10 max-w-xl">
          <div className="w-20 h-20 bg-neo-accent flex items-center justify-center mb-8">
            <FiActivity className="w-10 h-10 text-black" strokeWidth={3} />
          </div>
          <h2 className="text-6xl font-black uppercase tracking-tighter text-white leading-none mb-6">
            Empower<br/>Your<br/>Voice.
          </h2>
          <p className="text-2xl font-bold text-white/70 max-w-md leading-tight">
            Join the ecosystem of continuous, data-driven speech therapy.
          </p>
        </div>
      </div>
    </div>
  );
}
