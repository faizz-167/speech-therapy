import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { FiActivity, FiLogOut, FiHome, FiTarget, FiTrendingUp, FiSettings } from 'react-icons/fi';

const patientLinks = [
  { to: '/patient/home', label: 'HOME', icon: FiHome },
  { to: '/patient/tasks', label: 'TASKS', icon: FiTarget },
  { to: '/patient/progress', label: 'PROGRESS', icon: FiTrendingUp },
  { to: '/patient/settings', label: 'SETTINGS', icon: FiSettings },
];

export default function Navbar({ variant = 'therapist' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (variant === 'patient') {
    return (
      <header className="bg-neo-bg border-b-4 border-black sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border-4 border-black bg-neo-accent flex items-center justify-center">
              <FiActivity className="w-4 h-4 text-black" strokeWidth={3} />
            </div>
            <span className="text-black font-black text-lg uppercase tracking-tight -rotate-1">SpeechAI</span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {patientLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 text-sm font-black uppercase tracking-wide transition-all duration-100 border-3 ${
                    isActive
                      ? 'border-black bg-neo-secondary shadow-[3px_3px_0px_0px_#000] text-black'
                      : 'border-transparent text-black/60 hover:border-black hover:bg-neo-muted'
                  }`
                }
              >
                <Icon className="w-4 h-4" strokeWidth={3} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <div className="w-8 h-8 border-3 border-black bg-neo-secondary flex items-center justify-center text-black font-black text-xs uppercase">
              {user?.name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <span className="text-black text-sm font-bold hidden lg:block">{user?.name}</span>
            <button onClick={handleLogout} className="border-3 border-black p-2 hover:bg-neo-accent hover:shadow-[3px_3px_0px_0px_#000] transition-all duration-100 neo-push active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
              <FiLogOut className="w-4 h-4 text-black" strokeWidth={3} />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Therapist topbar
  return (
    <header className="bg-neo-bg border-b-4 border-black h-16 flex items-center justify-between px-8 sticky top-0 z-10">
      <div>
        <h1 className="text-black font-black text-xl uppercase tracking-tight">Dashboard</h1>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle compact />
        <div className="w-10 h-10 border-4 border-black bg-neo-secondary flex items-center justify-center text-black font-black text-sm uppercase">
          {user?.name?.charAt(0)?.toUpperCase() || 'T'}
        </div>
      </div>
    </header>
  );
}
