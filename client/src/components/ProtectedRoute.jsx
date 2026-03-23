import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F0F0]">
        <div className="border-4 border-[#121212] bg-[#F0C020] text-[#121212] shadow-[8px_8px_0px_0px_#121212] px-10 py-6 font-black text-2xl uppercase tracking-widest animate-bounce">
          LOADING...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole === 'therapist' && user.role !== 'therapist') {
    return <Navigate to="/patient/home" replace />;
  }

  if (requiredRole === 'patient' && user.role !== 'patient') {
    return <Navigate to="/therapist/dashboard" replace />;
  }

  return children;
}
