import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { patientsAPI } from '../../api/patients';
import { Search, Plus, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingState from '../../components/shared/LoadingState';

const PatientsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientsAPI.getPatients(user?.id || user?.sub)
      .then(data => setPatients(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (e, patient) => {
    e.stopPropagation();
    if (!confirm(`Remove "${patient.name}" from your patients? All their session history will be preserved for clinical records.`)) return;
    try {
      await patientsAPI.deletePatient(patient.patient_id || patient.id);
      setPatients(prev => prev.filter(p => (p.patient_id || p.id) !== (patient.patient_id || patient.id)));
      toast.success('Patient removed');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to remove patient');
    }
  };

  if (loading) return <LoadingState message="LOADING PATIENTS..." />;

  const filtered = patients.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 pt-8 px-4 pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between border-b-4 border-neo-border pb-8 gap-6">
        <div>
          <p className="font-sans text-xl uppercase font-black text-neo-text/80 tracking-widest mb-2">
            Roster
          </p>
          <div className="flex items-end gap-6">
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-neo-text leading-none drop-shadow-[2px_2px_0px_var(--color-neo-accent)]">
              Patients
            </h1>
            <span className="font-sans text-3xl font-black bg-neo-text text-neo-bg px-4 py-1 mb-2 border-4 border-neo-border shadow-[4px_4px_0px_0px_var(--color-neo-accent)] -rotate-3">
              {patients.length}
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate('/intake')}
          className="bh-button bg-neo-accent text-neo-text border-4 border-neo-border flex items-center gap-3 py-4 px-8 shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all rotate-1"
        >
          <Plus size={24} strokeWidth={4} />
          <span className="font-black uppercase tracking-widest text-lg">Add Patient</span>
        </button>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-neo-text w-8 h-8 pointer-events-none" strokeWidth={3} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-16 py-6 text-2xl font-black uppercase tracking-widest border-4 border-neo-border shadow-[6px_6px_0px_0px_#000] bg-neo-bg text-neo-text placeholder-neo-text/40 focus:outline-none focus:ring-4 focus:ring-neo-accent transition-all"
          placeholder="SEARCH PATIENTS BY NAME..."
        />
      </div>

      {/* TABLE */}
      <div className="bg-neo-bg border-4 border-neo-border shadow-[12px_12px_0px_0px_#000] overflow-x-auto">
        <table className="w-full text-left font-sans text-base min-w-[800px] border-collapse">
          <thead className="bg-neo-text text-neo-bg uppercase font-black tracking-widest text-sm">
            <tr>
              <th className="p-6 border-r-4 border-neo-surface/20">Name</th>
              <th className="p-6 border-r-4 border-neo-surface/20 w-24">Age</th>
              <th className="p-6 border-r-4 border-neo-surface/20 w-32">Gender</th>
              <th className="p-6 border-r-4 border-neo-surface/20">Email</th>
              <th className="p-6 border-r-4 border-neo-surface/20 w-48">Status</th>
              <th className="p-6 border-r-4 border-neo-surface/20 w-32">Created</th>
              <th className="p-6 text-center w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-4 divide-neo-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-16 text-center bg-neo-surface">
                  <p className="font-sans font-black uppercase tracking-widest text-neo-text/50 text-xl">
                    {patients.length === 0 ? 'No patients registered. Add your first patient.' : 'No matches found.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map(p => {
                const pId = p.patient_id || p.id;
                const pName = p.full_name || p.name;
                const planStatus = p.baseline_completed ? (p.has_plan ? 'Active' : 'No Plan') : 'Pending';
                
                let statusClasses = "bg-neo-surface text-neo-text border-2 border-neo-border";
                if (planStatus === 'Active') statusClasses = "bg-[#C4B5FD] text-neo-text border-2 border-neo-border shadow-[2px_2px_0px_0px_#000] rotate-1";
                else if (planStatus === 'Pending') statusClasses = "bg-neo-accent text-neo-text border-2 border-neo-border shadow-[2px_2px_0px_0px_#000] -rotate-1";
                else if (planStatus === 'No Plan') statusClasses = "bg-[#FF6B6B] text-neo-text border-2 border-neo-border shadow-[2px_2px_0px_0px_#000]";

                const createdDate = p.created_at ? new Date(p.created_at).toLocaleDateString() : '—';

                return (
                  <tr
                    key={pId}
                    className="hover:bg-neo-surface transition-colors cursor-pointer group"
                    onClick={() => navigate(`/therapist/patients/${pId}`)}
                  >
                    <td className="p-6 font-black border-r-4 border-neo-border text-lg group-hover:pl-8 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 border-4 border-neo-border bg-neo-accent flex items-center justify-center font-black text-2xl shrink-0 shadow-[2px_2px_0px_0px_#000]">
                          {pName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="truncate max-w-[180px] drop-shadow-[1px_1px_0px_#FFF]">{pName || '—'}</span>
                      </div>
                    </td>
                    <td className="p-6 border-r-4 border-neo-border font-black text-neo-text tracking-widest text-xl">{p.age || '—'}</td>
                    <td className="p-6 border-r-4 border-neo-border font-black uppercase text-neo-text/80 tracking-widest">{p.gender || '—'}</td>
                    <td className="p-6 border-r-4 border-neo-border font-sans font-bold text-neo-text/60 text-lg">{p.email || '—'}</td>
                    <td className="p-6 border-r-4 border-neo-border">
                      <span className={`inline-block px-3 py-1 font-black uppercase text-sm tracking-widest ${statusClasses}`}>
                        {planStatus}
                      </span>
                    </td>
                    <td className="p-6 border-r-4 border-neo-border font-sans font-bold text-neo-text/60 tracking-widest">{createdDate}</td>
                    <td className="p-6 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-3 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/therapist/patients/${pId}`)}
                          className="p-3 border-4 border-neo-border bg-white hover:bg-neo-accent hover:text-neo-text shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all"
                          title="View"
                        >
                          <Eye size={20} strokeWidth={3} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, p)}
                          className="p-3 border-4 border-neo-border bg-white hover:bg-[#FF6B6B] hover:text-white shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all"
                          title="Remove"
                        >
                          <Trash2 size={20} strokeWidth={3} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientsList;
