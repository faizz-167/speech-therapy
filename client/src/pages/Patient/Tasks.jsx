import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { FiCheckCircle, FiTarget } from 'react-icons/fi';
import TaskCard from '../../components/TaskCard';

export default function Tasks() {
  const { get } = useApi();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/tasks/daily')
      .then(data => {
        setTasks(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const upcomingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <h2 className="text-4xl font-black uppercase tracking-tight text-black mb-8 animate-pulse">Loading Tasks...</h2>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl font-black uppercase tracking-tight text-black mb-8">My Therapy Tasks</h1>

      {/* Upcoming Tasks Section */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border-4 border-black bg-neo-accent flex items-center justify-center rotate-3 shadow-[4px_4px_0px_0px_#000]">
            <FiTarget className="w-6 h-6 text-black" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black">Upcoming Tasks</h2>
          <span className="neo-badge bg-black text-white ml-2">{upcomingTasks.length}</span>
        </div>

        {upcomingTasks.length === 0 ? (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-12 text-center -rotate-1">
            <h3 className="text-2xl font-black uppercase text-black mb-2">All Caught Up!</h3>
            <p className="font-bold text-black/60">You have no pending tasks for today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingTasks.map(task => (
              <div key={task.id} className="neo-lift flex flex-col h-full">
                 <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] p-6 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                         <span className="neo-badge bg-neo-secondary uppercase">{task.difficulty}</span>
                         <span className={`neo-badge text-[10px] px-2 py-0.5 border-2 shadow-[2px_2px_0px_0px_#000] font-black tracking-widest ${task.status === 'in_progress' ? 'bg-[#FFE373]' : 'bg-white'}`}>
                            {task.status.replace('_', ' ')}
                         </span>
                      </div>
                      <h3 className="font-black text-2xl uppercase leading-tight mb-2">{task.task_name}</h3>
                      <p className="font-bold text-sm text-black/60 line-clamp-2">{task.reason}</p>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t-4 border-black flex items-center justify-between">
                      <p className="font-black uppercase text-xs tracking-widest text-black">Reps: {task.repetitions}</p>
                      <button 
                         onClick={() => navigate(`/patient/tasks/${task.id}`)}
                         className="bg-black text-white hover:bg-neo-accent hover:text-black hover:border-black border-2 border-transparent px-4 py-2 font-black uppercase tracking-wider text-sm transition-colors shadow-[2px_2px_0px_0px_#000]"
                      >
                         Start Task
                      </button>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border-4 border-black bg-neo-muted flex items-center justify-center -rotate-3 shadow-[4px_4px_0px_0px_#000]">
            <FiCheckCircle className="w-6 h-6 text-black" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black">All Completed Tasks</h2>
          <span className="neo-badge bg-black text-white ml-2">{completedTasks.length}</span>
        </div>

        {completedTasks.length === 0 ? (
          <p className="font-bold text-black/40 uppercase pl-14">No completed tasks yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedTasks.map(task => (
               <div key={task.id} className="bg-neo-bg border-4 border-black shadow-[4px_4px_0px_0px_#000] p-5 opacity-70 grayscale cursor-not-allowed">
                  <div className="flex justify-between items-start mb-3">
                     <span className="neo-badge bg-neo-secondary uppercase">{task.difficulty}</span>
                     <span className="neo-badge bg-[#86EFAC] uppercase">DONE</span>
                  </div>
                  <h3 className="font-black text-xl uppercase leading-tight mb-2 strikethrough decoration-4">{task.task_name}</h3>
                  <p className="font-bold text-sm text-black/60 line-clamp-1">{task.reason}</p>
               </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
