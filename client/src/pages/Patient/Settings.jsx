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
        <h1 className="text-4xl font-black uppercase tracking-tight text-[#121212]">Settings</h1>
        <div className="font-sans font-black text-sm uppercase px-3 py-1 bg-[#F0F0F0] border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] -rotate-1 tracking-widest text-[#121212]">ACCOUNT</div>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <Card className="border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] rounded-none">
          <CardHeader className="bg-[#F0F0F0] border-b-4 border-[#121212] rounded-none">
            <CardTitle className="flex items-center gap-2 font-black uppercase tracking-widest text-[#121212]">
              <FiUser className="w-5 h-5" strokeWidth={3} /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6 p-4">
              <div>
                <label className="block text-sm font-black uppercase tracking-widest mb-2 text-[#121212]">Name</label>
                <input type="text" defaultValue={user?.name || ''} disabled className="w-full bg-[#F0F0F0] border-4 border-[#121212] px-4 py-3 font-bold text-[#121212] opacity-60 rounded-none shadow-none" />
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-widest mb-2 text-[#121212]">Email</label>
                <input type="email" defaultValue={user?.email || ''} disabled className="w-full bg-[#F0F0F0] border-4 border-[#121212] px-4 py-3 font-bold text-[#121212] opacity-60 rounded-none shadow-none" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card className="border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] rounded-none">
          <CardHeader className="bg-[#FFE373] border-b-4 border-[#121212] rounded-none">
            <CardTitle className="flex items-center gap-2 font-black uppercase tracking-widest text-[#121212]">
              <FiLock className="w-5 h-5" strokeWidth={3} /> Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <label className="block text-sm font-black uppercase tracking-widest mb-2 text-[#121212]">Current Password</label>
              <input type="password" className="w-full bg-white border-4 border-[#121212] px-4 py-3 font-bold text-[#121212] focus:outline-none focus:ring-4 focus:ring-[#1040C0] rounded-none" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-black uppercase tracking-widest mb-2 text-[#121212]">New Password</label>
                <input type="password" className="w-full bg-white border-4 border-[#121212] px-4 py-3 font-bold text-[#121212] focus:outline-none focus:ring-4 focus:ring-[#1040C0] rounded-none" />
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-widest mb-2 text-[#121212]">Confirm</label>
                <input type="password" className="w-full bg-white border-4 border-[#121212] px-4 py-3 font-bold text-[#121212] focus:outline-none focus:ring-4 focus:ring-[#1040C0] rounded-none" />
              </div>
            </div>
            <Button onClick={handleSave} className="bg-[#1040C0] text-white border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] uppercase font-black tracking-widest rounded-none hover:-translate-y-1 hover:bg-[#082080] transition-transform w-[140px]">
              <FiSave className="w-4 h-4 mr-2" strokeWidth={3} /> {saved ? 'SAVED!' : 'SAVE'}
            </Button>
          </CardContent>
        </Card>

        {/* Sign out */}
        <div className="bg-[#F0C020] border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] p-8 flex items-center justify-between mt-8">
          <div>
            <p className="font-black text-[#121212] uppercase text-2xl tracking-tight">Sign Out</p>
            <p className="font-bold text-sm md:text-base text-[#121212] opacity-80 mt-1">End your session</p>
          </div>
          <Button onClick={logout} className="bg-[#121212] text-white border-4 border-[#121212] shadow-[4px_4px_0px_0px_#D02020] uppercase font-black tracking-widest rounded-none hover:-translate-y-1 hover:bg-[#222222] transition-transform">
            <FiLogOut className="w-5 h-5 mr-2" strokeWidth={3} /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
