import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { UserPlus, ArrowRight, ArrowLeft, Check } from 'lucide-react';

const DEFECTS = {
  Articulation: [
    { code: 'ART-001', name: 'Rhotacism' },
    { code: 'ART-002', name: 'Lambdacism' },
    { code: 'ART-003', name: 'Sigmatism' },
    { code: 'ART-004', name: 'Voicing contrast errors' },
    { code: 'ART-005', name: 'Interdental fricative error' },
    { code: 'ART-006', name: 'Labiodental confusion' },
    { code: 'ART-007', name: 'Weak syllable deletion' },
    { code: 'ART-008', name: 'Stress pattern errors' },
    { code: 'ART-009', name: 'Reduced intelligibility' },
    { code: 'ART-010', name: 'Consonant cluster reduction' },
  ],
  Fluency: [
    { code: 'FLU-001', name: 'Stuttering' },
    { code: 'FLU-002', name: 'Cluttering' },
    { code: 'FLU-003', name: 'Dysprosody' },
    { code: 'FLU-004', name: 'Dysphonia' },
    { code: 'FLU-005', name: 'Impaired breath support' },
    { code: 'FLU-006', name: 'Abnormal speech rate' },
    { code: 'FLU-007', name: 'Impaired pausing control' },
    { code: 'FLU-008', name: 'Flat intonation' },
  ],
  Cognition: [
    { code: 'COG-001', name: 'Word retrieval difficulty' },
    { code: 'COG-002', name: 'Reduced discourse coherence' },
    { code: 'COG-003', name: 'Pragmatic communication deficit' },
    { code: 'COG-004', name: 'Reduced working memory for speech' },
    { code: 'COG-005', name: 'Impaired self-monitoring' },
  ],
};

const CATEGORY_COLORS = {
  Articulation: { bg: 'bg-neo-accent', selected: 'bg-[#E05555]', ring: 'border-neo-accent' },
  Fluency: { bg: 'bg-neo-secondary', selected: 'bg-[#E0C030]', ring: 'border-neo-secondary' },
  Cognition: { bg: 'bg-neo-muted', selected: 'bg-[#A095DD]', ring: 'border-neo-muted' },
};

const PatientIntake = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', age: '', gender: '', email: '' });
  const [selectedDefects, setSelectedDefects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validateStep1 = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.age || formData.age < 5 || formData.age > 99) return 'Age must be between 5 and 99';
    if (!formData.gender) return 'Gender is required';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const toggleDefect = (code) => {
    setSelectedDefects(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (skipDefects = false) => {
    setIsSubmitting(true);
    setError('');
    try {
      const payload = {
        name: formData.name.trim(),
        age: parseInt(formData.age),
        gender: formData.gender,
        email: formData.email.trim() || '',
        pre_assigned_defect_codes: skipDefects ? [] : selectedDefects,
      };
      const res = await api.post('/therapists/patients', payload);
      const data = res.data;
      toast.success('Patient registered successfully!');
      navigate(`/therapist/patients/${data.patient_id || data.id}`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col pt-12 pb-12">
      {/* Header */}
      <div className="border-4 border-neo-border p-8 bg-[#FFD93D] shadow-[8px_8px_0px_0px_#000] mb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-neo-border opacity-10 rotate-12" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 bg-black border-4 border-neo-border flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(255,217,61,0.5)] -rotate-3">
            <UserPlus className="w-7 h-7 text-[#FFD93D]" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-tight mt-1">
              New Patient
            </h1>
            <p className="text-sm font-bold uppercase tracking-widest text-black/60 mt-1">Registration Form</p>
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex gap-4 mb-8 mt-4">
        <div className={`flex-1 flex items-center gap-3 p-4 border-4 border-neo-border transition-all ${step >= 1 ? 'bg-neo-accent shadow-[4px_4px_0px_0px_#000]' : 'bg-neo-surface'}`}>
          <div className={`w-8 h-8 border-4 border-neo-border flex items-center justify-center font-black text-sm ${step > 1 ? 'bg-black text-white' : 'bg-white'}`}>
            {step > 1 ? <Check size={16} strokeWidth={4} /> : '1'}
          </div>
          <span className="font-black uppercase tracking-widest text-xs">Patient Details</span>
        </div>
        <div className={`flex-1 flex items-center gap-3 p-4 border-4 border-neo-border transition-all ${step >= 2 ? 'bg-neo-muted shadow-[4px_4px_0px_0px_#000]' : 'bg-neo-surface'}`}>
          <div className="w-8 h-8 border-4 border-neo-border flex items-center justify-center font-black text-sm bg-white">
            2
          </div>
          <span className="font-black uppercase tracking-widest text-xs">Clinical Defects</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 border-4 border-neo-border bg-neo-accent text-black font-black uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_#000] -rotate-1">
          {error}
        </div>
      )}

      {/* Form Panel */}
      <div className="border-4 border-neo-border bg-neo-surface p-8 shadow-[8px_8px_0px_0px_#000]">

        {/* STEP 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <h2 className="font-black text-xl uppercase tracking-widest text-black/40 border-b-4 border-neo-border pb-3">
              Step 1 of 2 — Patient Details
            </h2>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase tracking-widest">Full Name <span className="text-neo-accent">*</span></label>
              <input
                type="text"
                className="neo-input"
                placeholder="Enter full name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-widest">Age <span className="text-neo-accent">*</span></label>
                <input
                  type="number"
                  className="neo-input"
                  min={5}
                  max={99}
                  placeholder="5–99"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-widest">Gender <span className="text-neo-accent">*</span></label>
                <select
                  className="neo-input"
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-widest">
                  Email <span className="text-black/30 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="email"
                  className="neo-input"
                  placeholder="patient@email.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <h2 className="font-black text-xl uppercase tracking-widest text-black/40 border-b-4 border-neo-border pb-3">
              Step 2 of 2 — Known Clinical Defects
            </h2>
            <p className="text-sm font-bold text-black/50">
              Select any defects already identified from referral or prior assessment. If unknown, skip — the baseline will identify them.
            </p>

            {Object.entries(DEFECTS).map(([category, defects]) => {
              const colors = CATEGORY_COLORS[category];
              return (
                <div key={category}>
                  <h3 className="font-black text-lg uppercase tracking-widest mb-3 flex items-center gap-3">
                    <span className={`inline-block w-5 h-5 border-4 border-neo-border ${colors.bg}`}></span>
                    {category}
                    <span className="text-xs text-black/40 font-bold">({defects.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {defects.map(d => {
                      const isSelected = selectedDefects.includes(d.code);
                      return (
                        <button
                          key={d.code}
                          type="button"
                          onClick={() => toggleDefect(d.code)}
                          className={`p-4 border-4 border-neo-border text-left transition-all duration-100 cursor-pointer ${
                            isSelected
                              ? `${colors.selected} text-black shadow-[2px_2px_0px_0px_#000] translate-x-[2px] translate-y-[2px]`
                              : `bg-white text-black shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000]`
                          }`}
                        >
                          <span className="text-[10px] font-bold block opacity-50 tracking-widest">{d.code}</span>
                          <span className="text-sm font-black uppercase block mt-1">{d.name}</span>
                          {isSelected && (
                            <Check size={16} strokeWidth={4} className="mt-2 text-black" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {selectedDefects.length > 0 && (
              <div className="p-4 border-4 border-neo-border bg-neo-bg shadow-[4px_4px_0px_0px_#000]">
                <span className="text-xs font-black uppercase tracking-widest text-black/40">
                  Selected ({selectedDefects.length}):
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedDefects.map(code => (
                    <span key={code} className="inline-block bg-neo-accent text-black px-3 py-1 border-2 border-neo-border font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000]">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-10 border-t-4 border-neo-border pt-6">
          {step === 1 ? (
            <div />
          ) : (
            <button
              onClick={() => { setStep(1); setError(''); }}
              className="neo-btn disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isSubmitting}
            >
              <ArrowLeft size={18} strokeWidth={3} /> Back
            </button>
          )}

          {step === 1 ? (
            <button onClick={handleNext} className="neo-btn neo-btn-primary flex items-center gap-2 py-4 px-8">
              Next <ArrowRight size={18} strokeWidth={3} />
            </button>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="neo-btn flex items-center gap-2"
              >
                {isSubmitting ? 'Registering...' : 'Skip Defects'}
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="neo-btn neo-btn-primary flex items-center gap-2 py-4 px-6"
              >
                {isSubmitting ? 'Registering...' : 'Register Patient'}
                <ArrowRight size={18} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientIntake;
