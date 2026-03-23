import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Public Pages
import LandingPage from './pages/Public/LandingPage';
import TherapistLogin from './pages/Public/TherapistLogin';
import TherapistRegister from './pages/Public/TherapistRegister';
import PatientLogin from './pages/Public/PatientLogin';
import PatientRegister from './pages/Public/PatientRegister';

// Therapist Pages
import TherapistDashboard from './pages/Therapist/TherapistDashboard';
import PatientsList from './pages/Therapist/PatientsList';
import PatientPage from './pages/Therapist/PatientPage';
import TherapistProfile from './pages/Therapist/TherapistProfile';
import PlanBuilder from './pages/Therapist/PlanBuilder';
import PatientIntake from './pages/Therapist/PatientIntake';
import WeeklyPlanner from './pages/Therapist/WeeklyPlanner';

// Patient Pages
import PatientHome from './pages/Patient/PatientHome';
import PatientTasks from './pages/Patient/PatientTasks';
import PatientProgress from './pages/Patient/PatientProgress';
import PatientProfile from './pages/Patient/PatientProfile';
import SessionRunner from './pages/Patient/SessionRunner';
import Baseline from './pages/Patient/Baseline';
import BaselineRunner from './pages/Patient/BaselineRunner';

const AppLayout = ({ children, hideNav = false }) => (
  <div className="bg-neo-bg bg-halftone text-neo-text min-h-screen flex flex-col selection:bg-neo-secondary selection:text-black font-sans">
    {!hideNav && <Navbar />}
    <main className="flex-1 w-full px-4 md:px-8 py-6 mb-16">
      {children}
    </main>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          className: 'border-4 border-neo-border bg-neo-surface text-black font-sans font-black uppercase shadow-[8px_8px_0px_0px_#000]',
          style: { borderRadius: '0px' }
        }} />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<AppLayout hideNav><LandingPage /></AppLayout>} />
          <Route path="/therapist/login" element={<AppLayout hideNav><TherapistLogin /></AppLayout>} />
          <Route path="/therapist/register" element={<AppLayout hideNav><TherapistRegister /></AppLayout>} />
          <Route path="/patient/login" element={<AppLayout hideNav><PatientLogin /></AppLayout>} />
          <Route path="/patient/register" element={<AppLayout hideNav><PatientRegister /></AppLayout>} />

          {/* Therapist Protected Routes */}
          <Route path="/therapist/dashboard" element={
            <ProtectedRoute requiredRole="therapist"><AppLayout><TherapistDashboard /></AppLayout></ProtectedRoute>
          } />
          <Route path="/therapist/patients" element={
            <ProtectedRoute requiredRole="therapist"><AppLayout><PatientsList /></AppLayout></ProtectedRoute>
          } />
          <Route path="/therapist/patients/:patientId" element={
            <ProtectedRoute requiredRole="therapist"><AppLayout><PatientPage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/therapist/patients/:patientId/plan" element={
            <ProtectedRoute requiredRole="therapist"><AppLayout><PlanBuilder /></AppLayout></ProtectedRoute>
          } />
          <Route path="/therapist/profile" element={
            <ProtectedRoute requiredRole="therapist"><AppLayout><TherapistProfile /></AppLayout></ProtectedRoute>
          } />
          <Route path="/intake" element={
            <ProtectedRoute requiredRole="therapist"><AppLayout><PatientIntake /></AppLayout></ProtectedRoute>
          } />
          <Route path="/therapist/planner" element={
            <ProtectedRoute requiredRole="therapist"><AppLayout><WeeklyPlanner /></AppLayout></ProtectedRoute>
          } />
          {/* Redirect /therapist to /therapist/dashboard */}
          <Route path="/therapist" element={<Navigate to="/therapist/dashboard" replace />} />

          {/* Patient Protected Routes */}
          <Route path="/patient/home" element={
            <ProtectedRoute requiredRole="patient"><AppLayout><PatientHome /></AppLayout></ProtectedRoute>
          } />
          <Route path="/patient/tasks" element={
            <ProtectedRoute requiredRole="patient"><AppLayout><PatientTasks /></AppLayout></ProtectedRoute>
          } />
          <Route path="/patient/progress" element={
            <ProtectedRoute requiredRole="patient"><AppLayout><PatientProgress /></AppLayout></ProtectedRoute>
          } />
          <Route path="/patient/profile" element={
            <ProtectedRoute requiredRole="patient"><AppLayout><PatientProfile /></AppLayout></ProtectedRoute>
          } />
          
          {/* Runners */}
          <Route path="/patient/session/:sessionId" element={
            <ProtectedRoute requiredRole="patient"><AppLayout hideNav><SessionRunner /></AppLayout></ProtectedRoute>
          } />
          <Route path="/patient/baseline" element={
            <ProtectedRoute requiredRole="patient"><AppLayout hideNav><Baseline /></AppLayout></ProtectedRoute>
          } />
          <Route path="/patient/baseline/:resultId" element={
            <ProtectedRoute requiredRole="patient"><AppLayout hideNav><BaselineRunner /></AppLayout></ProtectedRoute>
          } />

          {/* Fallbacks */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
