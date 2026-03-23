import { useTheme } from '../context/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="w-10 h-10 border-4 border-[#121212] bg-white flex items-center justify-center hover:bg-[#F0F0F0] hover:shadow-[4px_4px_0px_0px_#121212] transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        {isDark ? <FiSun className="w-4 h-4" strokeWidth={3} /> : <FiMoon className="w-4 h-4" strokeWidth={3} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-full flex items-center gap-2 px-4 py-3 bg-white text-sm font-black uppercase tracking-widest border-4 border-[#121212] text-[#121212] hover:bg-[#F0F0F0] hover:shadow-[4px_4px_0px_0px_#121212] transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none mt-4"
    >
      {isDark ? <FiSun className="w-4 h-4" strokeWidth={3} /> : <FiMoon className="w-4 h-4" strokeWidth={3} />}
      {isDark ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
