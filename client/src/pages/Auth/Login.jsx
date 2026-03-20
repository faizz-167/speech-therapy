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
      navigate(user.role === 'therapist' ? '/therapist/dashboard' : '/patient/home');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neo-bg pattern-grid flex items-center justify-center px-4">
      {/* Decorative elements */}
      <div className="fixed top-12 left-12 w-16 h-16 bg-neo-accent border-4 border-black shadow-[4px_4px_0px_0px_#000] rotate-12 hidden lg:block" />
      <div className="fixed bottom-16 right-16 w-12 h-12 bg-neo-muted border-4 border-black shadow-[4px_4px_0px_0px_#000] -rotate-6 hidden lg:block" />
      <div className="fixed top-32 right-24 w-8 h-8 bg-neo-secondary border-4 border-black rotate-45 hidden lg:block" />

      <div className="w-full max-w-md">
        {/* Brand sticker */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-3 bg-neo-secondary border-4 border-black shadow-[6px_6px_0px_0px_#000] px-6 py-3 -rotate-2">
            <div className="w-10 h-10 bg-neo-accent border-4 border-black flex items-center justify-center">
              <FiActivity className="w-6 h-6 text-black" strokeWidth={3} />
            </div>
            <span className="text-black font-black text-2xl uppercase tracking-tight">SpeechAI</span>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_#000]">
          {/* Header */}
          <div className="bg-neo-accent border-b-4 border-black px-8 py-5">
            <h1 className="text-black font-black text-3xl uppercase tracking-tight">Sign In</h1>
            <p className="text-black/70 font-bold text-sm mt-1">Welcome back to your portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="bg-neo-accent/20 border-4 border-black p-3 font-bold text-sm text-black">
                ⚠ {error}
              </div>
            )}

            {/* Role selector */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2 text-black">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {['therapist', 'patient'].map(role => (
                  <button key={role} type="button" onClick={() => setForm(p => ({ ...p, role }))}
                    className={`py-3 text-sm font-black uppercase tracking-wide border-4 border-black transition-all duration-100 neo-push ${
                      form.role === role
                        ? 'bg-neo-secondary shadow-[4px_4px_0px_0px_#000]'
                        : 'bg-white hover:bg-neo-muted'
                    } active:translate-x-[4px] active:translate-y-[4px] active:shadow-none`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2 text-black">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required
                className="neo-input w-full text-lg" placeholder="you@email.com" />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2 text-black">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required
                className="neo-input w-full text-lg" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-14 bg-neo-accent border-4 border-black shadow-[6px_6px_0px_0px_#000] font-black text-lg uppercase tracking-wide text-black flex items-center justify-center gap-2 transition-all duration-100 neo-push active:translate-x-[6px] active:translate-y-[6px] active:shadow-none hover:brightness-110 disabled:opacity-50">
              {loading ? 'Signing in...' : <>Sign In <FiArrowRight className="w-5 h-5" strokeWidth={3} /></>}
            </button>

            <p className="text-center text-sm font-bold text-black/60">
              No account?{' '}
              <Link to="/register" className="text-black border-b-2 border-black hover:bg-neo-secondary px-1 transition-all duration-100">
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
