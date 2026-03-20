import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { FiCopy, FiCheck } from 'react-icons/fi';

export default function Profile() {
  const { user } = useAuth();
  const { get } = useApi();
  const [profile, setProfile] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { get('/therapists/profile').then(setProfile).catch(() => {}); }, []);

  const copyCode = () => {
    if (profile?.therapist_code) {
      navigator.clipboard.writeText(profile.therapist_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-4xl font-black uppercase tracking-tight text-black">Profile</h1>
        <div className="neo-badge bg-neo-muted -rotate-2">ACCOUNT</div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Avatar */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 border-4 border-black bg-neo-accent shadow-[6px_6px_0px_0px_#000] flex items-center justify-center text-black font-black text-3xl uppercase mx-auto mb-4 -rotate-3">
              {user?.name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <p className="font-black text-lg uppercase text-black">{profile?.name || user?.name}</p>
            <p className="font-bold text-sm text-black/60 uppercase">{profile?.specialization || 'Therapist'}</p>
            <p className="font-bold text-xs text-black/40 uppercase mt-1">{profile?.clinic || ''}</p>
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="col-span-2">
          <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Email', profile?.email || user?.email],
              ['Specialization', profile?.specialization || '—'],
              ['Clinic', profile?.clinic || '—'],
              ['Experience', profile?.experience ? `${profile.experience} years` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-2 border-b-2 border-black/10">
                <span className="text-xs font-black uppercase tracking-widest text-black/50">{label}</span>
                <span className="font-bold text-black">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Therapist Code */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Your Therapist Code</CardTitle></CardHeader>
        <CardContent>
          <p className="font-bold text-sm text-black/60 mb-3">Share this code with patients during registration.</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 border-4 border-black bg-neo-secondary px-6 py-4 font-black text-2xl tracking-[0.3em] uppercase text-black text-center shadow-[4px_4px_0px_0px_#000]">
              {profile?.therapist_code || '—'}
            </div>
            <Button onClick={copyCode} size="lg">
              {copied ? <><FiCheck className="w-5 h-5" strokeWidth={3} /> Copied!</> : <><FiCopy className="w-5 h-5" strokeWidth={3} /> Copy</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
