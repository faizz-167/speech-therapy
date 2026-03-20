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
        navigate('/therapist/dashboard');
      } else {
        await registerPatient({ name: form.name, email: form.email, password: form.password, age: parseInt(form.age) || 0, gender: form.gender, language: form.language, therapist_code: form.therapist_code });
        navigate('/patient/home');
      }
    } catch (err) { setError(err.message || 'Registration failed'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neo-bg pattern-grid flex items-center justify-center px-4 py-12">
      {/* Decorative */}
      <div className="fixed bottom-12 left-16 w-14 h-14 bg-neo-secondary border-4 border-black shadow-[4px_4px_0px_0px_#000] rotate-6 hidden lg:block" />
      <div className="fixed top-16 right-12 w-10 h-10 bg-neo-muted border-4 border-black -rotate-12 hidden lg:block" />

      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-3 bg-neo-secondary border-4 border-black shadow-[6px_6px_0px_0px_#000] px-6 py-3 rotate-1">
            <div className="w-10 h-10 bg-neo-accent border-4 border-black flex items-center justify-center">
              <FiActivity className="w-6 h-6 text-black" strokeWidth={3} />
            </div>
            <span className="text-black font-black text-2xl uppercase tracking-tight">SpeechAI</span>
          </div>
        </div>

        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_#000]">
          {/* Header */}
          <div className="bg-neo-muted border-b-4 border-black px-8 py-5">
            <h1 className="text-black font-black text-3xl uppercase tracking-tight">Register</h1>
            <p className="text-black/70 font-bold text-sm mt-1">Step {step} of 2</p>
          </div>

          {/* Progress */}
          <div className="flex border-b-4 border-black">
            <div className={`h-2 transition-all duration-200 ${step >= 1 ? 'bg-neo-accent' : 'bg-white'}`} style={{ width: '50%' }} />
            <div className={`h-2 transition-all duration-200 border-l-2 border-black ${step >= 2 ? 'bg-neo-accent' : 'bg-white'}`} style={{ width: '50%' }} />
          </div>

          {error && (
            <div className="bg-neo-accent/20 border-b-4 border-black px-8 py-3 font-bold text-sm text-black">
              ⚠ {error}
            </div>
          )}

          {/* Step 1: Role */}
          {step === 1 && (
            <div className="p-8 space-y-5">
              <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Choose your role</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'therapist', label: 'THERAPIST', desc: 'Manage patients & plans', bg: 'bg-neo-accent' },
                  { value: 'patient', label: 'PATIENT', desc: 'Complete therapy tasks', bg: 'bg-neo-secondary' }
                ].map(r => (
                  <button key={r.value} type="button" onClick={() => { setRole(r.value); setStep(2); }}
                    className={`${r.bg} border-4 border-black shadow-[6px_6px_0px_0px_#000] p-6 text-left neo-push active:translate-x-[6px] active:translate-y-[6px] active:shadow-none hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] transition-all duration-100`}>
                    <p className="font-black text-xl uppercase text-black">{r.label}</p>
                    <p className="font-bold text-sm text-black/70 mt-1">{r.desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-center text-sm font-bold text-black/60">
                Already registered?{' '}
                <Link to="/login" className="text-black border-b-2 border-black hover:bg-neo-secondary px-1 transition-all duration-100">Sign in</Link>
              </p>
            </div>
          )}

          {/* Step 2: Form */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 text-sm font-black uppercase text-black/60 hover:text-black mb-2">
                <FiArrowLeft className="w-4 h-4" strokeWidth={3} /> Back
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className="neo-input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required className="neo-input w-full" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Password</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required className="neo-input w-full" />
              </div>

              {role === 'therapist' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Specialization</label>
                    <input type="text" value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} className="neo-input w-full" placeholder="e.g. Pediatric SLP" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Clinic</label>
                    <input type="text" value={form.clinic} onChange={e => setForm(p => ({ ...p, clinic: e.target.value }))} className="neo-input w-full" />
                  </div>
                </div>
              )}

              {role === 'patient' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Age</label>
                      <input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} required className="neo-input w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Gender</label>
                      <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className="neo-input w-full">
                        <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Language</label>
                      <input type="text" value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))} className="neo-input w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Therapist Code</label>
                    <input type="text" value={form.therapist_code} onChange={e => setForm(p => ({ ...p, therapist_code: e.target.value }))} required className="neo-input w-full" placeholder="Get this from your therapist" />
                  </div>
                </>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-14 bg-neo-accent border-4 border-black shadow-[6px_6px_0px_0px_#000] font-black text-lg uppercase tracking-wide text-black flex items-center justify-center gap-2 transition-all duration-100 neo-push active:translate-x-[6px] active:translate-y-[6px] active:shadow-none hover:brightness-110 disabled:opacity-50 mt-4">
                {loading ? 'Creating...' : <>Create Account <FiArrowRight className="w-5 h-5" strokeWidth={3} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
