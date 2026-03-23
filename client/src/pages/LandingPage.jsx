import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginPatient, registerPatient } from '../api/patients';
import toast from 'react-hot-toast';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // null | 'patient-login' | 'patient-register'

  // Patient Login
  const [loginName, setLoginName] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Patient Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handlePatientLogin = async (e) => {
    e.preventDefault();
    if (!loginName.trim() || !loginPin.trim()) return toast.error('Enter name and PIN');
    setLoginLoading(true);
    try {
      const data = await loginPatient({ full_name: loginName, pin: loginPin });
      localStorage.setItem('patient_user', JSON.stringify(data));
      toast.success('Welcome back!');
      navigate(`/patient/${data.patient_id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePatientRegister = async (e) => {
    e.preventDefault();
    if (regPin !== regConfirmPin) return toast.error('PINs do not match');
    if (regPin.length < 4) return toast.error('PIN must be at least 4 digits');
    if (!regCode.trim()) return toast.error('Enter your therapist code');
    setRegLoading(true);
    try {
      const data = await registerPatient({
        full_name: regName,
        email: regEmail || null,
        age: regAge ? parseInt(regAge) : null,
        gender: regGender || null,
        therapist_code: regCode,
        pin: regPin,
      });
      localStorage.setItem('patient_user', JSON.stringify(data));
      toast.success('Registration successful!');
      navigate(`/patient/${data.patient_id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border-4 border-[#121212] font-sans font-bold text-lg bg-white text-[#121212] focus:outline-none focus:ring-4 focus:ring-[#F0C020] shadow-[4px_4px_0px_0px_#121212] placeholder:text-[#999] placeholder:uppercase placeholder:tracking-widest placeholder:text-sm";

  return (
    <div className="min-h-screen bg-neo-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-neo-accent rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-neo-danger rounded-full blur-3xl opacity-20"></div>

      <div className="z-10 flex flex-col items-center text-center max-w-4xl border-4 border-neo-border p-12 bg-neo-surface neo-shadow-xl">
        <h1 className="text-6xl md:text-8xl font-sans font-black uppercase text-neo-text tracking-tighter leading-none mb-6">
          Vocal<span className="text-neo-accent">Sync</span>
        </h1>
        <p className="font-mono text-xl text-neo-muted max-w-2xl mb-12">
          AI-driven adaptive speech therapy platform. Analyze latency, detect phonetic errors, and route clinical baselines with zero-shot accuracy.
        </p>
        
        {/* Main CTA Buttons */}
        {!mode && (
          <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
             <Link to="/login" className="neo-btn neo-btn-primary text-xl px-12 py-4 text-center flex-1">
               CLINICIAN LOGIN
             </Link>
             <button onClick={() => setMode('patient-login')} className="neo-btn text-xl px-12 py-4 flex-1 cursor-pointer">
               PATIENT PORTAL
             </button>
          </div>
        )}

        {/* Patient Login Form */}
        {mode === 'patient-login' && (
          <form onSubmit={handlePatientLogin} className="w-full max-w-md flex flex-col gap-4 mt-4">
            <h2 className="font-sans font-black text-2xl uppercase tracking-widest text-[#121212] border-b-4 border-[#121212] pb-2">Patient Login</h2>
            <input type="text" placeholder="Full Name" value={loginName} onChange={e => setLoginName(e.target.value)} className={inputClass} />
            <input type="password" placeholder="4-Digit PIN" maxLength={6} value={loginPin} onChange={e => setLoginPin(e.target.value)} className={inputClass} />
            <button type="submit" disabled={loginLoading} className="neo-btn neo-btn-primary text-xl py-4 w-full">
              {loginLoading ? 'LOGGING IN...' : 'LOGIN'}
            </button>
            <div className="flex gap-4">
              <button type="button" onClick={() => setMode('patient-register')} className="flex-1 font-mono text-sm font-bold text-[#1040C0] underline uppercase cursor-pointer">
                New Patient? Register
              </button>
              <button type="button" onClick={() => setMode(null)} className="flex-1 font-mono text-sm font-bold text-[#121212] underline uppercase cursor-pointer">
                ← Back
              </button>
            </div>
          </form>
        )}

        {/* Patient Register Form */}
        {mode === 'patient-register' && (
          <form onSubmit={handlePatientRegister} className="w-full max-w-md flex flex-col gap-4 mt-4">
            <h2 className="font-sans font-black text-2xl uppercase tracking-widest text-[#121212] border-b-4 border-[#121212] pb-2">Patient Registration</h2>
            <input type="text" placeholder="Full Name" value={regName} onChange={e => setRegName(e.target.value)} className={inputClass} required />
            <input type="email" placeholder="Email Address" value={regEmail} onChange={e => setRegEmail(e.target.value)} className={inputClass} required />
            <div className="flex gap-4">
              <input type="number" placeholder="Age" value={regAge} onChange={e => setRegAge(e.target.value)} className={`${inputClass} flex-1`} required min="1" max="120" />
              <select value={regGender} onChange={e => setRegGender(e.target.value)} className={`${inputClass} flex-1`} required>
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <input type="text" placeholder="Therapist Code (from your clinician)" value={regCode} onChange={e => setRegCode(e.target.value.toUpperCase())} className={inputClass} maxLength={8} required />
            <input type="password" placeholder="Create 4-Digit PIN" maxLength={6} value={regPin} onChange={e => setRegPin(e.target.value)} className={inputClass} required />
            <input type="password" placeholder="Confirm PIN" maxLength={6} value={regConfirmPin} onChange={e => setRegConfirmPin(e.target.value)} className={inputClass} required />
            <button type="submit" disabled={regLoading} className="neo-btn neo-btn-primary text-xl py-4 w-full">
              {regLoading ? 'CREATING ACCOUNT...' : 'REGISTER'}
            </button>
            <div className="flex gap-4">
              <button type="button" onClick={() => setMode('patient-login')} className="flex-1 font-mono text-sm font-bold text-[#1040C0] underline uppercase cursor-pointer">
                Have an account? Login
              </button>
              <button type="button" onClick={() => setMode(null)} className="flex-1 font-mono text-sm font-bold text-[#121212] underline uppercase cursor-pointer">
                ← Back
              </button>
            </div>
          </form>
        )}
      </div>
      
      {/* Footer Banner */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden whitespace-nowrap bg-neo-accent py-2 border-t-4 border-neo-border">
         <p className="font-mono font-bold text-black uppercase animate-marquee">
            • LATENCY AWARE • PHONEME LEVEL CTC ALIGNMENT • ADAPTIVE THRESHOLDS • NO ROUNDED CORNERS • STRICT NEO-BRUTALISM • 
            LATENCY AWARE • PHONEME LEVEL CTC ALIGNMENT • ADAPTIVE THRESHOLDS • NO ROUNDED CORNERS • STRICT NEO-BRUTALISM •
         </p>
      </div>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { display: inline-block; animation: marquee 20s linear infinite; }
      `}</style>
    </div>
  );
};

export default LandingPage;
