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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r-4 border-[#121212] flex flex-col z-20 shadow-[8px_0px_0px_0px_#121212]">
      {/* Brand */}
      <div className="px-6 py-8 border-b-4 border-[#121212] bg-[#F0F0F0]">
        <div className="bg-white border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] px-4 py-3 -rotate-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#121212] bg-[#F0C020] flex items-center justify-center">
              <FiActivity className="w-6 h-6 text-[#121212]" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-[#121212] font-black text-xl uppercase tracking-tighter leading-none">SpeechAI</h2>
              <p className="text-[#1040C0] text-[10px] font-black uppercase tracking-widest mt-1">Therapist</p>
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
              `flex items-center gap-4 px-4 py-4 text-sm font-black uppercase tracking-widest transition-all duration-100 border-4 ${
                isActive
                  ? 'bg-[#1040C0] border-[#121212] shadow-[4px_4px_0px_0px_#121212] text-white'
                  : 'bg-white border-transparent text-[#121212] hover:border-[#121212] hover:bg-[#F0F0F0] hover:shadow-[4px_4px_0px_0px_#121212]'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="p-4 border-t-4 border-[#121212] bg-[#F0F0F0]">
        <div className="flex items-center gap-3 mb-4 bg-white border-4 border-[#121212] p-3 shadow-[4px_4px_0px_0px_#121212]">
          <div className="w-10 h-10 border-4 border-[#121212] bg-[#F0F0F0] flex items-center justify-center text-[#121212] font-black text-xl uppercase">
            {user?.name?.charAt(0)?.toUpperCase() || 'T'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[#121212] text-sm font-black truncate uppercase tracking-widest leading-tight">{user?.name || 'Therapist'}</p>
            <p className="text-[#121212] opacity-70 text-[10px] font-black uppercase tracking-widest truncate mt-1">{user?.email || ''}</p>
          </div>
        </div>
        <ThemeToggle />
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 mt-4 px-4 py-3 bg-[#D02020] text-white text-sm font-black uppercase tracking-widest border-4 border-[#121212] hover:bg-[#A01818] hover:shadow-[4px_4px_0px_0px_#121212] transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <FiLogOut className="w-5 h-5 flex-shrink-0" strokeWidth={3} /> Sign out
        </button>
      </div>
    </aside>
  );
}
