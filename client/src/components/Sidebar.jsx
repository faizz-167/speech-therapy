import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import {
  FiGrid, FiUsers, FiCalendar, FiBarChart2, FiUser, FiLogOut, FiActivity
} from 'react-icons/fi';

const links = [
  { to: '/therapist/dashboard', label: 'DASHBOARD', icon: FiGrid },
  { to: '/therapist/patients', label: 'PATIENTS', icon: FiUsers },
  { to: '/therapist/planner', label: 'WEEKLY PLANS', icon: FiCalendar },
  { to: '/therapist/reports', label: 'REPORTS', icon: FiBarChart2 },
  { to: '/therapist/profile', label: 'PROFILE', icon: FiUser },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-neo-bg border-r-4 border-black flex flex-col z-20">
      {/* Brand */}
      <div className="px-4 py-5 border-b-4 border-black">
        <div className="bg-neo-secondary border-4 border-black shadow-[4px_4px_0px_0px_#000] px-4 py-3 -rotate-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border-4 border-black bg-neo-accent flex items-center justify-center">
              <FiActivity className="w-5 h-5 text-black" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-black font-black text-base uppercase tracking-tight leading-tight">SpeechAI</h2>
              <p className="text-black/60 text-[10px] font-bold uppercase tracking-widest">Therapist</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm font-black uppercase tracking-wide transition-all duration-100 border-4 ${
                isActive
                  ? 'bg-neo-accent border-black shadow-[4px_4px_0px_0px_#000] text-black'
                  : 'border-transparent text-black/60 hover:border-black hover:bg-neo-muted hover:shadow-[4px_4px_0px_0px_#000] hover:text-black'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="px-4 py-4 border-t-4 border-black">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 border-4 border-black bg-neo-secondary flex items-center justify-center text-black font-black text-sm uppercase">
            {user?.name?.charAt(0)?.toUpperCase() || 'T'}
          </div>
          <div className="min-w-0">
            <p className="text-black text-sm font-black truncate uppercase">{user?.name || 'Therapist'}</p>
            <p className="text-black/50 text-xs font-bold truncate">{user?.email || ''}</p>
          </div>
        </div>
        <ThemeToggle />
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-black uppercase tracking-wide border-4 border-transparent text-black/60 hover:border-black hover:bg-neo-accent hover:shadow-[4px_4px_0px_0px_#000] hover:text-black transition-all duration-100 neo-push active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          <FiLogOut className="w-4 h-4" strokeWidth={3} /> Sign out
        </button>
      </div>
    </aside>
  );
}
