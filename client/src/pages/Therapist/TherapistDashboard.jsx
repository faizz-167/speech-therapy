import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientsAPI } from '../../api/patients';
import { Link, useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, FileText, Eye, Plus, CalendarDays, ArrowRight, Activity, TrendingUp } from 'lucide-react';
import LoadingState from '../../components/shared/LoadingState';

export default function TherapistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertsData, patientsData] = await Promise.allSettled([
          patientsAPI.getAlerts(user.sub || user.id),
          patientsAPI.getPatients(user.sub || user.id)
        ]);
        if (alertsData.status === 'fulfilled') setAlerts(alertsData.value || []);
        if (patientsData.status === 'fulfilled') setPatients(patientsData.value || []);
      } catch (err) {
        console.warn("Could not fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.id, user.sub]);

  if (loading) return <LoadingState message="LOADING DASHBOARD..." />;

  const activePlansCount = patients.filter(p => p.baseline_completed).length;
  const recentPatients = [...patients]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  const stats = [
    { label: "Active Patients", value: patients.length, icon: Users, bg: "bg-neo-accent", textColor: "text-black" },
    { label: "Action Alerts", value: alerts.length, icon: AlertTriangle, bg: alerts.length > 0 ? "bg-[#FF6B6B]" : "bg-neo-surface", textColor: "text-black", urgent: alerts.length > 0 },
    { label: "Active Plans", value: activePlansCount, icon: FileText, bg: "bg-[#FFD93D]", textColor: "text-black" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-10 pt-12 pb-16">

      {/* ──────────────────────────────────────────────
          HEADER
      ────────────────────────────────────────────── */}
      <div className="border-4 border-neo-border p-8 md:p-12 bg-neo-accent shadow-[12px_12px_0px_0px_#000] flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-72 h-72 border-l-8 border-b-8 border-neo-border opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="z-10 relative">
          <div className="inline-flex items-center gap-2 bg-neo-border text-neo-bg font-black uppercase tracking-widest px-3 py-1 text-xs border-4 border-neo-border mb-4 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] -rotate-2">
            <Activity size={14} strokeWidth={3} /> Dashboard
          </div>
          <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none text-black drop-shadow-[4px_4px_0px_rgba(255,255,255,0.3)] mt-2">
            Clinical<br/>Overview
          </h1>
          <p className="font-black text-xl text-black/80 mt-6 tracking-widest uppercase bg-neo-surface inline-block border-4 border-neo-border px-4 py-2 shadow-[4px_4px_0px_0px_#000] rotate-1">
            Dr. {user?.username || user?.name?.split(' ')[0] || 'Provider'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3 z-10">
          <Link
            to="/intake"
            className="neo-btn neo-btn-primary flex items-center gap-2 text-sm py-3 px-5 shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-y-1 active:shadow-none"
          >
            <Plus size={18} strokeWidth={3} /> Add Patient
          </Link>
          <Link
            to="/therapist/planner"
            className="neo-btn flex items-center gap-2 text-sm py-3 px-5 bg-neo-surface shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-y-1 active:shadow-none"
          >
            <CalendarDays size={18} strokeWidth={3} /> Planner
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          STATS ROW
      ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s, idx) => (
          <div
            key={idx}
            className={`p-8 ${s.bg} border-4 border-neo-border flex items-center justify-between shadow-[8px_8px_0px_0px_#000] relative overflow-hidden group hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#000] transition-all cursor-default min-h-[160px] ${s.urgent ? 'animate-pulse' : ''} ${idx === 0 ? '-rotate-1' : idx === 2 ? 'rotate-1' : ''}`}
          >
            <div className={`flex flex-col z-10 ${s.textColor}`}>
              <span className="font-black uppercase tracking-widest text-sm flex items-center gap-2 border-b-4 border-black/20 pb-1 w-fit mb-3">
                <s.icon size={20} strokeWidth={3} />
                {s.label}
              </span>
              <span className="text-7xl font-black tracking-tighter leading-none drop-shadow-[2px_2px_0px_rgba(255,255,255,0.5)]">
                {s.value}
              </span>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <s.icon size={100} strokeWidth={3} />
            </div>
          </div>
        ))}
      </div>

      {/* ──────────────────────────────────────────────
          ACTION ALERTS
      ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <h2 className="text-3xl font-black uppercase tracking-tighter border-b-4 border-neo-border pb-3 flex items-center gap-3">
          <AlertTriangle size={28} strokeWidth={3} className="text-neo-accent" />
          Action Alerts
        </h2>
        {alerts.length === 0 ? (
          <div className="p-6 border-4 border-neo-border bg-neo-surface text-center shadow-[4px_4px_0px_0px_#000]">
            <p className="font-black text-black/40 uppercase tracking-widest">No active alerts — all patients progressing normally.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.slice(0, 5).map((alert, i) => (
              <div
                key={alert.id || i}
                className="p-5 border-4 border-neo-border bg-neo-bg shadow-[6px_6px_0px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] transition-all cursor-pointer"
                onClick={() => navigate(`/therapist/patients/${alert.patient_id}`)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 border-4 border-neo-border bg-[#FF6B6B] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000] rotate-3">
                    <AlertTriangle size={18} strokeWidth={3} className="text-white" />
                  </div>
                  <div>
                    <p className="font-black uppercase text-lg">{alert.patient_name || 'Patient'}</p>
                    <p className="text-xs text-black/60 uppercase font-bold tracking-widest bg-neo-surface px-2 py-0.5 border-2 border-neo-border w-fit mt-1 shadow-[1px_1px_0px_0px_#000]">
                      {alert.alert_type || 'regression'} {alert.task_name ? `// ${alert.task_name}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/therapist/patients/${alert.patient_id}`); }}
                  className="neo-btn text-xs py-2 px-4 bg-neo-surface flex items-center gap-2"
                >
                  <Eye size={14} strokeWidth={3} /> View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────
          RECENT PATIENTS TABLE
      ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b-4 border-neo-border pb-3">
          <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Users size={28} strokeWidth={3} className="text-neo-muted" />
            Recent Patients
          </h2>
          <Link to="/therapist/patients" className="neo-btn text-xs py-2 px-4 flex items-center gap-2 bg-neo-surface">
            View All <ArrowRight size={14} strokeWidth={3} />
          </Link>
        </div>

        <div className="bg-neo-bg border-4 border-neo-border shadow-[8px_8px_0px_0px_#000] overflow-x-auto">
          <table className="w-full text-left font-sans text-base min-w-[650px]">
            <thead className="bg-black text-white uppercase font-black tracking-widest text-xs">
              <tr>
                <th className="p-4 md:p-5 border-r-4 border-white/10">Patient</th>
                <th className="p-4 md:p-5 border-r-4 border-white/10">Status</th>
                <th className="p-4 md:p-5 border-r-4 border-white/10">Last Session</th>
                <th className="p-4 md:p-5 border-r-4 border-white/10">Accuracy</th>
                <th className="p-4 md:p-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-neo-border">
              {recentPatients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center font-black uppercase tracking-widest text-black/30 bg-neo-surface">
                    No patients yet — add your first patient above
                  </td>
                </tr>
              ) : (
                recentPatients.map(p => {
                  const status = p.baseline_completed ? (p.has_plan ? 'Has Plan' : 'No Plan') : 'Baseline Pending';
                  const statusBg = p.baseline_completed
                    ? (p.has_plan ? 'bg-neo-muted' : 'bg-neo-secondary')
                    : 'bg-neo-surface border-2 border-neo-border';
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-neo-surface transition-colors cursor-pointer group"
                      onClick={() => navigate(`/therapist/patients/${p.id}`)}
                    >
                      <td className="p-4 md:p-5 font-black border-r-4 border-neo-border text-lg truncate max-w-[200px] group-hover:pl-6 transition-all">
                        {p.name || '—'}
                      </td>
                      <td className="p-4 md:p-5 border-r-4 border-neo-border">
                        <span className={`inline-block px-3 py-1 font-black shadow-[2px_2px_0px_0px_#000] uppercase text-xs tracking-wider border-2 border-neo-border ${statusBg}`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-4 md:p-5 border-r-4 border-neo-border font-bold text-black/60 tracking-widest text-sm">
                        {p.last_session_date || '—'}
                      </td>
                      <td className="p-4 md:p-5 border-r-4 border-neo-border font-black text-2xl">
                        {p.overall_accuracy != null ? (
                          <span className="drop-shadow-[1px_1px_0px_var(--color-neo-accent)]">
                            {Math.round(p.overall_accuracy)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-4 md:p-5 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/therapist/patients/${p.id}`)}
                          className="neo-btn text-xs py-2 px-6 bg-white group-hover:bg-neo-accent transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          QUICK LINKS FOOTER
      ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/therapist/patients"
          className="border-4 border-neo-border p-6 bg-neo-surface hover:bg-neo-accent transition-colors shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] active:translate-y-1 active:shadow-none flex items-center gap-4 group"
        >
          <Users size={28} strokeWidth={3} />
          <div>
            <p className="font-black uppercase tracking-widest text-sm">All Patients</p>
            <p className="text-xs font-bold text-black/50">Full caseload view</p>
          </div>
          <ArrowRight size={20} strokeWidth={3} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <Link
          to="/therapist/planner"
          className="border-4 border-neo-border p-6 bg-neo-surface hover:bg-neo-secondary transition-colors shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] active:translate-y-1 active:shadow-none flex items-center gap-4 group"
        >
          <CalendarDays size={28} strokeWidth={3} />
          <div>
            <p className="font-black uppercase tracking-widest text-sm">Weekly Planner</p>
            <p className="text-xs font-bold text-black/50">Schedule sessions</p>
          </div>
          <ArrowRight size={20} strokeWidth={3} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <Link
          to="/therapist/profile"
          className="border-4 border-neo-border p-6 bg-neo-surface hover:bg-neo-muted transition-colors shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] active:translate-y-1 active:shadow-none flex items-center gap-4 group"
        >
          <TrendingUp size={28} strokeWidth={3} />
          <div>
            <p className="font-black uppercase tracking-widest text-sm">Profile</p>
            <p className="text-xs font-bold text-black/50">Settings & details</p>
          </div>
          <ArrowRight size={20} strokeWidth={3} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>
    </div>
  );
}
