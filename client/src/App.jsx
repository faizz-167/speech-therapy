import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

import DashboardHome from './pages/Therapist/DashboardHome';
import PatientsList from './pages/Therapist/PatientsList';
import PatientDetails from './pages/Therapist/PatientDetails';
import WeeklyPlanner from './pages/Therapist/WeeklyPlanner';
import Reports from './pages/Therapist/Reports';
import Profile from './pages/Therapist/Profile';

import PatientHome from './pages/Patient/Home';
import Baseline from './pages/Patient/Baseline';
import Tasks from './pages/Patient/Tasks';
import SessionRunner from './pages/Patient/SessionRunner';
import Progress from './pages/Patient/Progress';
import Settings from './pages/Patient/Settings';

const TherapistLayout = ({ children }) => (
  <div className="flex bg-neo-bg min-h-screen">
    <Sidebar />
    <div className="flex-1 flex flex-col ml-64">
      <Navbar variant="therapist" />
      <main className="flex-1 p-8 overflow-y-auto pattern-grid">
        {children}
      </main>
    </div>
  </div>
);

const PatientLayout = ({ children }) => (
  <div className="bg-neo-bg min-h-screen">
    <Navbar variant="patient" />
    <main className="max-w-7xl mx-auto px-6 py-8">
      {children}
    </main>
  </div>
);

function RootRedirect() {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center">
      <div className="border-4 border-black bg-neo-secondary shadow-[8px_8px_0px_0px_#000] px-8 py-4 font-black text-xl uppercase animate-bounce-subtle">
        Loading...
      </div>
    </div>
  );
  if (isAuthenticated) {
    return <Navigate to={user.role === 'therapist' ? '/therapist/dashboard' : '/patient/home'} replace />;
  }
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        className: 'border-4 border-black bg-white text-black font-bold shadow-[4px_4px_0px_0px_#000]',
        style: { borderRadius: '0px' }
      }} />
      <Routes>
        {/* Public */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Therapist Routes */}
        <Route path="/therapist/*" element={
          <ProtectedRoute allowedRoles={['therapist']}>
            <TherapistLayout>
              <Routes>
                <Route path="dashboard" element={<DashboardHome />} />
                <Route path="patients" element={<PatientsList />} />
                <Route path="patients/:id" element={<PatientDetails />} />
                <Route path="planner" element={<WeeklyPlanner />} />
                <Route path="reports" element={<Reports />} />
                <Route path="profile" element={<Profile />} />
              </Routes>
            </TherapistLayout>
          </ProtectedRoute>
        } />

        {/* Patient Routes */}
        <Route path="/patient/*" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientLayout>
              <Routes>
                <Route path="home" element={<PatientHome />} />
                <Route path="baseline" element={<Baseline />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="session/:id" element={<SessionRunner />} />
                <Route path="progress" element={<Progress />} />
                <Route path="settings" element={<Settings />} />
              </Routes>
            </PatientLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
