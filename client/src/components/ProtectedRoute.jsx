import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neo-bg">
        <div className="border-4 border-black bg-neo-secondary shadow-[8px_8px_0px_0px_#000] px-8 py-4 font-black text-xl uppercase animate-bounce-subtle">
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirect = user.role === 'therapist' ? '/therapist/dashboard' : '/patient/home';
    return <Navigate to={redirect} replace />;
  }

  return children;
}
