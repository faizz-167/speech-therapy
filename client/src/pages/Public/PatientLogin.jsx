import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import toast from 'react-hot-toast';
import { Heart, ArrowRight } from 'lucide-react';

export default function PatientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authAPI.patientLogin({ email, password });
      login(data.token);
      toast.success('Login successful!');
      navigate('/patient/home');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* LEFT: Form Side */}
      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center p-8 lg:p-24 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Brand */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-neo-muted border-4 border-neo-border flex items-center justify-center shadow-[4px_4px_0px_0px_#000]">
              <Heart className="w-5 h-5 text-black" strokeWidth={3} />
            </div>
            <span className="text-black font-black text-2xl uppercase tracking-tighter">VocalSync</span>
          </div>

          <div className="mb-12">
            <div className="inline-flex items-center gap-2 bg-neo-muted text-black font-black uppercase tracking-widest px-3 py-1 text-xs border-4 border-neo-border mb-6 shadow-[4px_4px_0px_0px_#000] rotate-2">
              Patient Portal
            </div>
            <h1 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter text-black leading-none mb-3">
              Welcome<br/>Back.
            </h1>
            <p className="text-black/60 font-bold text-lg">
              Continue your therapy journey.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Email Address</label>
                <input
                  type="email"
                  className="neo-input w-full"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="patient@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Password</label>
                <input
                  type="password"
                  className="neo-input w-full"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neo-btn w-full flex items-center justify-between text-lg disabled:opacity-50 py-5 bg-neo-muted"
            >
              <span className="font-black uppercase tracking-wider">{loading ? 'Signing in...' : 'Start Session'}</span>
              <ArrowRight className="w-6 h-6" strokeWidth={3} />
            </button>

            <p className="text-left text-sm font-bold text-black/50 pt-2">
              Need an account?{' '}
              <Link to="/patient/register" className="text-black hover:underline underline-offset-4 decoration-2 font-black">
                Sign up here
              </Link>
            </p>
            <Link to="/" className="block text-black/40 text-xs uppercase font-black tracking-widest hover:text-black transition-colors">
              ← Back to Home
            </Link>
          </form>
        </div>
      </div>

      {/* RIGHT: Branding Side */}
      <div className="hidden lg:flex w-1/2 bg-black border-l-8 border-neo-border items-center justify-center p-24 relative overflow-hidden">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <h2 className="text-[15vw] font-black leading-none tracking-tighter text-white select-none text-center">
            VOCAL<br/>SYNC
          </h2>
        </div>

        {/* Halftone texture */}
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px'
        }}></div>

        <div className="relative z-10 max-w-xl">
          <div className="w-20 h-20 bg-neo-muted border-4 border-white/20 flex items-center justify-center mb-8 shadow-[8px_8px_0px_0px_rgba(196,181,253,0.3)] -rotate-3">
            <Heart className="w-10 h-10 text-black" strokeWidth={3} />
          </div>
          <h2 className="text-6xl font-black uppercase tracking-tighter text-white leading-none mb-6 drop-shadow-[3px_3px_0px_rgba(196,181,253,0.5)]">
            Your<br/>Voice<br/>Matters.
          </h2>
          <p className="text-2xl font-bold text-white/60 max-w-md leading-tight">
            Track your progress. Build your streak. Find your voice.
          </p>

          {/* Decorative sticker */}
          <div className="mt-12 inline-block bg-neo-muted text-black border-4 border-neo-border px-6 py-4 shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] rotate-2">
            <span className="font-black uppercase tracking-widest text-sm">Exercises • Streaks • Progress</span>
          </div>
        </div>
      </div>
    </div>
  );
}
