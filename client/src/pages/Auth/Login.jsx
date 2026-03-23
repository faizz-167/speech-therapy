import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiActivity, FiArrowRight } from 'react-icons/fi';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: 'therapist' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password, form.role);
      navigate(user.role === 'therapist' ? '/therapist' : '/patient/me');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* LEFT: Form Side */}
      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center p-8 lg:p-24 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Brand (visible only lg-) */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-neo-accent flex items-center justify-center">
              <FiActivity className="w-6 h-6 text-black" strokeWidth={3} />
            </div>
            <span className="text-black font-black text-2xl uppercase tracking-tighter">VocalSync</span>
          </div>

          <div className="mb-12">
            <h1 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter text-black mb-2">
              Sign In.
            </h1>
            <p className="text-black/60 font-bold text-lg">
              Access your therapeutic portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-primary/10 border-l-4 border-primary p-4 font-bold text-sm text-primary">
                {error}
              </div>
            )}

            {/* Role selector */}
            <div className="flex gap-2 p-1 bg-neo-surface border-2 border-neo-border">
              {['therapist', 'patient'].map(role => (
                <button 
                  key={role} 
                  type="button" 
                  onClick={() => setForm(p => ({ ...p, role }))}
                  className={`flex-1 py-3 text-sm font-black uppercase tracking-wider transition-colors duration-200 ${
                    form.role === role
                      ? 'bg-black text-white'
                      : 'bg-transparent text-black/50 hover:text-black'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Email Address</label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} 
                  required
                  className="bh-input w-full" 
                  placeholder="you@email.com" 
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Password</label>
                <input 
                  type="password" 
                  value={form.password} 
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))} 
                  required
                  className="bh-input w-full" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="bh-btn bh-btn-primary w-full flex items-center justify-between text-lg disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Enter Portal'}</span>
              <FiArrowRight className="w-6 h-6" strokeWidth={3} />
            </button>

            <p className="text-left text-sm font-bold text-black/50 pt-4">
              New to VocalSync?{' '}
              <Link to="/register" className="text-black hover:underline underline-offset-4 decoration-2">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* RIGHT: Branding Side */}
      <div className="hidden lg:flex w-1/2 bg-neo-accent items-center justify-center p-24 relative overflow-hidden">
        {/* Massive Watermark Typography */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <h2 className="text-[15vw] font-black leading-none tracking-tighter text-black select-none text-center">
            VOCAL<br/>SYNC
          </h2>
        </div>
        
        <div className="relative z-10 max-w-xl">
          <div className="w-20 h-20 bg-black flex items-center justify-center mb-8">
            <FiActivity className="w-10 h-10 text-neo-accent" strokeWidth={3} />
          </div>
          <h2 className="text-6xl font-black uppercase tracking-tighter text-black leading-none mb-6">
            Precision<br/>Speech<br/>Therapy.
          </h2>
          <p className="text-2xl font-bold text-black/70 max-w-md leading-tight">
            Data-driven recovery. Track progress with pinpoint accuracy.
          </p>
        </div>
      </div>
    </div>
  );
}
