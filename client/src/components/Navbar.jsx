import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { LayoutDashboard, Users, User, LogOut, Activity } from 'lucide-react';

const therapistTabs = [
  { to: '/therapist/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/therapist/patients', label: 'Patients', icon: Users },
  { to: '/therapist/profile', label: 'Profile', icon: User },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isTherapist = user?.role === 'therapist';

  const isTabActive = (tab) => {
    if (tab.exact) return location.pathname === tab.to;
    return location.pathname.startsWith(tab.to);
  };

  return (
    <header className="bg-white border-b-4 border-[#121212] sticky top-0 z-10 shadow-[0px_4px_0px_0px_#121212]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left — Brand */}
        <NavLink to={isTherapist ? '/therapist/dashboard' : '/patient/home'} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 border-4 border-[#121212] bg-[#F0C020] flex items-center justify-center -rotate-1 shadow-[2px_2px_0px_0px_#121212]">
            <Activity size={18} strokeWidth={3} className="text-[#121212]" />
          </div>
          <span className="text-[#121212] font-black text-xl uppercase tracking-tighter ml-1 hidden sm:block">VocalSync</span>
        </NavLink>

        {/* Center — Tabs (therapist only) */}
        {isTherapist && (
          <nav className="flex items-center gap-1">
            {therapistTabs.map(tab => {
              const active = isTabActive(tab);
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.exact}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-black uppercase tracking-widest transition-all duration-100 border-4 ${
                    active
                      ? 'border-[#121212] bg-[#F0C020] text-[#121212] shadow-[4px_4px_0px_0px_#121212]'
                      : 'border-transparent text-[#121212] opacity-60 hover:opacity-100 hover:border-[#121212] hover:bg-[#F0F0F0]'
                  }`}
                >
                  <tab.icon size={16} strokeWidth={3} />
                  <span className="hidden md:inline">{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>
        )}

        {/* Right — User */}
        <div className="flex items-center gap-3">
          <ThemeToggle compact />
          <button
            onClick={() => navigate(isTherapist ? '/therapist/profile' : '/patient/profile')}
            className="w-10 h-10 border-4 border-[#121212] bg-[#F0C020] flex items-center justify-center text-[#121212] font-black text-sm uppercase shadow-[2px_2px_0px_0px_#121212] hover:bg-[#D0A018] transition-colors cursor-pointer"
          >
            {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
          </button>
          <button
            onClick={handleLogout}
            className="border-4 border-[#121212] p-2 bg-[#D02020] text-white hover:bg-[#A01818] hover:shadow-[4px_4px_0px_0px_#121212] transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
          >
            <LogOut size={18} strokeWidth={3} />
          </button>
        </div>
      </div>
    </header>
  );
}
