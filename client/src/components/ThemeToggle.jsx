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
        className="w-10 h-10 border-3 border-black flex items-center justify-center hover:bg-neo-secondary hover:shadow-[3px_3px_0px_0px_#000] transition-all duration-100 neo-push active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
      >
        {isDark ? <FiSun className="w-4 h-4" strokeWidth={3} /> : <FiMoon className="w-4 h-4" strokeWidth={3} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-black uppercase tracking-wide border-4 border-transparent text-black/60 hover:border-black hover:bg-neo-secondary hover:shadow-[4px_4px_0px_0px_#000] hover:text-black transition-all duration-100 neo-push active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
    >
      {isDark ? <FiSun className="w-4 h-4" strokeWidth={3} /> : <FiMoon className="w-4 h-4" strokeWidth={3} />}
      {isDark ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
