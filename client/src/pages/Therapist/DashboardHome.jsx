import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { FiUsers, FiClipboard, FiClock, FiTrendingUp } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { useAuth } from '../../context/AuthContext';
export default function DashboardHome() {
  const { user } = useAuth();
  const { get, patch } = useApi();
  const [stats, setStats] = useState({ total_patients: 0, active_plans: 0, pending_approvals: 0 });
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    get('/reports/therapist/overview').then(setStats).catch(() => {});
    get('/therapists/patients').then(setPatients).catch(() => {});
    if (user?.id) {
        get(`/progress/clinician/alerts?therapist_id=${user.id}`).then(setAlerts).catch(() => {});
    }
  }, [user?.id]);

  const dismissAlert = async (alertId) => {
      try {
          await patch(`/progress/${alertId}/dismiss-alert`);
          setAlerts(alerts.filter(a => a.id !== alertId));
      } catch (e) {
          console.error(e);
      }
  };

  const statCards = [
    { label: 'TOTAL PATIENTS', value: stats.total_patients, icon: FiUsers, bg: 'bg-neo-accent' },
    { label: 'ACTIVE PLANS', value: stats.active_plans, icon: FiClipboard, bg: 'bg-neo-secondary' },
    { label: 'PENDING APPROVALS', value: stats.pending_approvals, icon: FiClock, bg: 'bg-neo-muted' },
    { label: 'AVG IMPROVEMENT', value: '—', icon: FiTrendingUp, bg: 'bg-white' },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tight text-black">Dashboard</h1>
        <div className="neo-badge bg-neo-secondary rotate-2">OVERVIEW</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        {statCards.map(({ label, value, icon: Icon, bg }) => (
          <div key={label} className={`${bg} border-4 border-black shadow-[6px_6px_0px_0px_#000] neo-lift p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-black/60">{label}</p>
                <p className="text-5xl font-black text-black mt-1">{value}</p>
              </div>
              <div className="w-12 h-12 border-4 border-black bg-white flex items-center justify-center">
                <Icon className="w-6 h-6 text-black" strokeWidth={3} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
              {/* Recent Patients */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Patients</CardTitle>
                    <span className="neo-badge bg-neo-muted -rotate-1">{patients.length} TOTAL</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-4 border-black bg-neo-secondary/30">
                        {['Name', 'Age', 'Severity', 'Baseline'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-black">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {patients.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-10 text-center font-bold text-black/40 uppercase text-sm">No patients registered yet</td>
                        </tr>
                      ) : (
                        patients.slice(0, 5).map(p => (
                          <tr key={p.id} className="border-b-2 border-black hover:bg-neo-secondary/10 transition-colors duration-100">
                            <td className="px-5 py-4 font-black text-black uppercase">{p.name}</td>
                            <td className="px-5 py-4 font-bold text-black">{p.age}</td>

                            <td className="px-5 py-4">
                              <span className={`neo-badge ${
                                p.severity === 'severe' ? 'neo-badge-severe' :
                                p.severity === 'moderate' ? 'neo-badge-moderate' :
                                'neo-badge-mild'
                              }`}>{p.severity}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`neo-badge ${p.baseline_completed ? 'neo-badge-done' : 'neo-badge-pending'}`}>
                                {p.baseline_completed ? 'DONE' : 'PENDING'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
          </div>

          <div className="xl:col-span-1 space-y-6">
             <Card className="border-4 border-black shadow-[6px_6px_0px_0px_#FF6B6B] bg-[#FFF5F5]">
                <CardHeader className="border-b-4 border-black bg-white pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-[#FF6B6B]">
                            <FiClock strokeWidth={3} /> Clinical Alerts
                        </CardTitle>
                        <span className="neo-badge bg-[#FF6B6B] text-white">{alerts.length}</span>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    {alerts.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="font-bold text-black/40 uppercase text-sm">No Active Alerts</p>
                        </div>
                    ) : (
                        alerts.map(alert => (
                            <div key={alert.id} className="bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_#000] rotate-[0.5deg]">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="neo-badge bg-[#FF6B6B] text-white uppercase text-[10px] px-2 py-0.5">{alert.alert_type}</span>
                                    <span className="text-[10px] font-bold text-black/50">{new Date(alert.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="font-bold text-black leading-snug mb-3">{alert.message}</p>
                                <button
                                    onClick={() => dismissAlert(alert.id)}
                                    className="w-full text-xs font-black uppercase tracking-widest bg-neo-muted text-black border-2 border-black py-1 hover:bg-black hover:text-white transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        ))
                    )}
                </CardContent>
             </Card>
          </div>
      </div>
    </div>
  );
}
