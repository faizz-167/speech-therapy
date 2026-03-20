import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { FiUser, FiLock, FiSave, FiLogOut } from 'react-icons/fi';

export default function Settings() {
  const { user, logout } = useAuth();
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-4xl font-black uppercase tracking-tight text-black">Settings</h1>
        <div className="neo-badge bg-neo-secondary -rotate-1">ACCOUNT</div>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader className="bg-neo-muted/30">
            <CardTitle className="flex items-center gap-2">
              <FiUser className="w-5 h-5" strokeWidth={3} /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1">Name</label>
                <input type="text" defaultValue={user?.name || ''} disabled className="neo-input w-full opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1">Email</label>
                <input type="email" defaultValue={user?.email || ''} disabled className="neo-input w-full opacity-60" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader className="bg-neo-accent/20">
            <CardTitle className="flex items-center gap-2">
              <FiLock className="w-5 h-5" strokeWidth={3} /> Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-1">Current Password</label>
              <input type="password" className="neo-input w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1">New Password</label>
                <input type="password" className="neo-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1">Confirm</label>
                <input type="password" className="neo-input w-full" />
              </div>
            </div>
            <Button onClick={handleSave}>
              <FiSave className="w-4 h-4" strokeWidth={3} /> {saved ? 'SAVED!' : 'SAVE'}
            </Button>
          </CardContent>
        </Card>

        {/* Sign out */}
        <div className="bg-neo-accent border-4 border-black shadow-[6px_6px_0px_0px_#000] p-5 flex items-center justify-between">
          <div>
            <p className="font-black text-black uppercase text-lg">Sign Out</p>
            <p className="font-bold text-sm text-black/70">End your session</p>
          </div>
          <Button onClick={logout} className="bg-black text-white border-4 border-black shadow-[4px_4px_0px_0px_#FF6B6B]">
            <FiLogOut className="w-4 h-4" strokeWidth={3} /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
