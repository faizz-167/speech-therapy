import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientsAPI } from '../../api/patients';
import { Link, useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, FileText, Eye } from 'lucide-react';
import LoadingState from '../../components/shared/LoadingState';

const DashboardHome = () => {
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
  }, [user.id]);

  if (loading) return <LoadingState message="LOADING DASHBOARD..." />;

  const activePlansCount = patients.filter(p => p.baseline_completed).length;

  const stats = [
    { label: "Active Patients", value: patients.length, icon: Users, bg: "bg-[#C4B5FD]", text: "text-neo-text" },
    { label: "Action Alerts", value: alerts.length, icon: AlertTriangle, bg: alerts.length > 0 ? "bg-[#FF6B6B]" : "bg-neo-surface", text: alerts.length > 0 ? "text-neo-bg" : "text-neo-text", urgent: alerts.length > 0 },
    { label: "Active Plans", value: activePlansCount, icon: FileText, bg: "bg-neo-accent", text: "text-neo-text" },
  ];

  const recentPatients = [...patients]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-12 mt-2">
      {/* Header */}
      <div className="border-4 border-neo-border p-8 md:p-12 bg-neo-accent shadow-[12px_12px_0px_0px_#000] flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-64 h-64 border-l-8 border-b-8 border-neo-border rounded-bl-[100px] opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-500 bg-neo-text/5" />
        <div className="z-10 relative">
          <h1 className="text-5xl md:text-8xl font-sans font-black uppercase text-neo-text tracking-tighter leading-[0.85] drop-shadow-[4px_4px_0px_var(--color-neo-bg)]">Clinical<br/>Overview</h1>
          <p className="font-sans text-xl font-black text-neo-text mt-6 tracking-widest uppercase bg-neo-surface inline-block border-4 border-neo-border px-4 py-2 shadow-[4px_4px_0px_0px_#000] rotate-1">Dr. {user.username || user.name || 'Therapist'}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((s, idx) => (
          <div key={idx} className={`p-8 ${s.bg} border-4 border-neo-border flex items-center justify-between shadow-[8px_8px_0px_0px_#000] relative overflow-hidden group hover:-translate-y-2 transition-transform cursor-default min-h-[180px] ${s.urgent ? 'animate-pulse' : ''} ${idx % 2 === 0 ? '-rotate-1' : 'rotate-1'}`}>
            <div className={`flex flex-col z-10 ${s.text}`}>
              <span className={`font-sans text-sm md:text-base font-black uppercase tracking-widest mb-2 flex items-center gap-3 border-b-4 pb-1 w-fit ${s.bg === 'bg-[#FF6B6B]' ? 'border-neo-bg' : 'border-neo-text'}`}>
                <s.icon size={24} strokeWidth={3} />
                {s.label}
              </span>
              <span className="text-7xl md:text-[90px] font-sans font-black tracking-tighter drop-shadow-[3px_3px_0px_#000] leading-none mt-2 text-white">{s.value}</span>
            </div>
            {/* Visual background element */}
            <div className="absolute -right-8 -bottom-8 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <s.icon size={120} strokeWidth={4} className={s.bg === 'bg-[#FF6B6B]' ? 'text-white' : 'text-neo-text'} />
            </div>
          </div>
        ))}
      </div>

      {/* Action Alerts Panel */}
      <div className="flex flex-col gap-6">
        <h2 className="text-4xl font-sans font-black uppercase text-neo-text border-b-8 border-neo-border pb-4 drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">Action Alerts</h2>
        {alerts.length === 0 ? (
          <div className="p-8 border-4 border-neo-border bg-neo-surface text-center shadow-[4px_4px_0px_0px_#000] rotate-1">
            <p className="font-sans font-black text-neo-text/60 uppercase tracking-widest text-lg">No alerts — all patients progressing normally.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {alerts.map((alert, i) => (
              <div key={alert.id || i} className="p-6 border-4 border-neo-border bg-neo-bg shadow-[6px_6px_0px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:translate-x-1 transition-transform cursor-pointer" onClick={() => navigate(`/therapist/patients/${alert.patient_id}`)}>
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-12 h-12 border-4 border-neo-border bg-[#FF6B6B] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000] rotate-3 text-white">
                    <AlertTriangle size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="font-sans font-black uppercase text-neo-text text-xl">{alert.patient_name || 'Patient'}</p>
                    <p className="font-sans text-sm text-neo-text/80 uppercase mt-1 font-bold tracking-widest bg-neo-surface px-2 py-1 border-2 border-neo-border w-fit shadow-[1px_1px_0px_0px_#000]">
                      {alert.alert_type || 'regression'} {alert.task_name ? `// ${alert.task_name}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/therapist/patients/${alert.patient_id}`); }}
                  className="bh-button text-sm flex items-center gap-2 border-4 border-neo-border bg-neo-surface text-neo-text shadow-[4px_4px_0px_0px_#000] px-4 py-3 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-y-1 active:shadow-none"
                >
                  <Eye size={18} strokeWidth={3} /> <span className="font-black uppercase tracking-widest">View Patient</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Patients Table */}
      <div className="flex flex-col gap-6 mt-8">
        <h2 className="text-4xl font-sans font-black uppercase text-neo-text border-b-8 border-neo-border pb-4 drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">Recent Patients</h2>
        <div className="bg-neo-bg border-4 border-neo-border shadow-[8px_8px_0px_0px_#000] overflow-x-auto">
          <table className="w-full text-left font-sans text-base min-w-[700px]">
            <thead className="bg-neo-text text-neo-bg uppercase font-black tracking-widest text-sm">
              <tr>
                <th className="p-4 md:p-6 border-r-4 border-neo-surface/20">Patient Name</th>
                <th className="p-4 md:p-6 border-r-4 border-neo-surface/20">Status</th>
                <th className="p-4 md:p-6 border-r-4 border-neo-surface/20">Last Session</th>
                <th className="p-4 md:p-6 border-r-4 border-neo-surface/20">Accuracy</th>
                <th className="p-4 md:p-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-neo-border">
              {recentPatients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center font-black uppercase tracking-widest text-neo-text/50 bg-neo-surface">No patients yet</td>
                </tr>
              ) : (
                recentPatients.map(p => {
                  const status = p.baseline_completed ? (p.has_plan ? 'Has Plan' : 'No Plan') : 'Baseline Pending';
                  const statusColor = p.baseline_completed ? (p.has_plan ? 'bg-[#C4B5FD] text-neo-text' : 'bg-neo-accent text-neo-text') : 'bg-neo-surface text-neo-text border-2 border-neo-border';
                  return (
                    <tr key={p.id} className="hover:bg-neo-surface transition-colors cursor-pointer group" onClick={() => navigate(`/therapist/patients/${p.id}`)}>
                      <td className="p-4 md:p-6 font-black border-r-4 border-neo-border text-xl truncate max-w-[200px] group-hover:pl-8 transition-all">{p.name || '—'}</td>
                      <td className="p-4 md:p-6 border-r-4 border-neo-border">
                        <span className={`inline-block px-3 py-1 font-black shadow-[2px_2px_0px_0px_#000] uppercase text-xs tracking-wider border-2 border-neo-border ${statusColor}`}>{status}</span>
                      </td>
                      <td className="p-4 md:p-6 border-r-4 border-neo-border font-bold text-neo-text/80 tracking-widest">{p.last_session_date || '—'}</td>
                      <td className="p-4 md:p-6 border-r-4 border-neo-border font-black text-2xl drop-shadow-[1px_1px_0px_var(--color-neo-accent)]">{p.overall_accuracy != null ? `${Math.round(p.overall_accuracy)}%` : '—'}</td>
                      <td className="p-4 md:p-6 text-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/therapist/patients/${p.id}`)} className="inline-block bg-white text-neo-text border-4 border-neo-border px-8 py-3 font-black uppercase shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all group-hover:bg-neo-accent">
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
    </div>
  );
};

export default DashboardHome;
