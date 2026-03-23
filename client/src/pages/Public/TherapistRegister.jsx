import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import toast from 'react-hot-toast';
import { Activity, ArrowRight, ArrowLeft } from 'lucide-react';

export default function TherapistRegister() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', specialization: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authAPI.therapistRegister(formData);
      login(data.token);
      toast.success('Registration successful!');
      navigate('/therapist/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* LEFT: Form Side */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center p-8 lg:p-24 relative z-10 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto">
          {/* Mobile Brand */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-neo-accent border-4 border-neo-border flex items-center justify-center shadow-[4px_4px_0px_0px_#000]">
              <Activity className="w-5 h-5 text-black" strokeWidth={3} />
            </div>
            <span className="text-black font-black text-2xl uppercase tracking-tighter">VocalSync</span>
          </div>

          <div className="mb-10">
            <div className="inline-flex items-center gap-2 bg-neo-secondary text-black font-black uppercase tracking-widest px-3 py-1 text-xs border-4 border-neo-border mb-6 shadow-[4px_4px_0px_0px_#000] rotate-1">
              New Account
            </div>
            <h1 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter text-black leading-none mb-3">
              Join.
            </h1>
            <p className="text-black/60 font-bold text-lg">
              Set up your clinical profile.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Full Name *</label>
                <input
                  type="text"
                  className="neo-input w-full"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Dr. Jane Smith"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Email Address *</label>
                <input
                  type="email"
                  className="neo-input w-full"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                  placeholder="provider@clinic.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">Password *</label>
                <input
                  type="password"
                  className="neo-input w-full"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required
                  placeholder="••••••••"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-black">
                  Specialization <span className="text-black/40 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  className="neo-input w-full"
                  value={formData.specialization}
                  onChange={e => setFormData({...formData, specialization: e.target.value})}
                  placeholder="e.g. Pediatric SLP"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neo-btn neo-btn-primary w-full flex items-center justify-between text-lg disabled:opacity-50 py-5 mt-4"
            >
              <span className="font-black uppercase tracking-wider">{loading ? 'Creating account...' : 'Create Profile'}</span>
              <ArrowRight className="w-6 h-6" strokeWidth={3} />
            </button>

            <p className="text-left text-sm font-bold text-black/50 pt-2">
              Already have an account?{' '}
              <Link to="/therapist/login" className="text-black hover:underline underline-offset-4 decoration-2 font-black">
                Sign in
              </Link>
            </p>
            <Link to="/" className="block text-black/40 text-xs uppercase font-black tracking-widest hover:text-black transition-colors">
              ← Back to Home
            </Link>
          </form>
        </div>
      </div>

      {/* RIGHT: Branding Side */}
      <div className="hidden lg:flex w-1/2 bg-[#F0C020] border-l-8 border-neo-border items-center justify-center p-24 relative overflow-hidden">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <h2 className="text-[15vw] font-black leading-none tracking-tighter text-black select-none text-center">
            VOCAL<br/>SYNC
          </h2>
        </div>

        {/* Grid texture */}
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none"></div>

        <div className="relative z-10 max-w-xl">
          <div className="w-20 h-20 bg-black border-4 border-neo-border flex items-center justify-center mb-8 shadow-[8px_8px_0px_0px_rgba(255,217,61,0.4)] -rotate-3">
            <Activity className="w-10 h-10 text-[#F0C020]" strokeWidth={3} />
          </div>
          <h2 className="text-6xl font-black uppercase tracking-tighter text-black leading-none mb-6 drop-shadow-[3px_3px_0px_rgba(255,255,255,0.3)]">
            Build<br/>Your<br/>Practice.
          </h2>
          <p className="text-2xl font-bold text-black/70 max-w-md leading-tight">
            AI-driven plans. Real-time progress. Clinical precision.
          </p>

          <div className="mt-12 inline-block bg-black text-[#F0C020] border-4 border-neo-border px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] rotate-2">
            <span className="font-black uppercase tracking-widest text-sm">Join 500+ Clinicians</span>
          </div>
        </div>
      </div>
    </div>
  );
}
