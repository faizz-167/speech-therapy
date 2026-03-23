import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { GripVertical, Pause, Play, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateAssignment, deleteAssignment, createPlan } from '../../api/plans';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const PlanBuilder = () => {
  const { user } = useAuth();
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [assignments, setAssignments] = useState([
    { id: 'a1', task_name: 'Syllable Repetition (Slowed)', status: 'approved', paused: false, priority_order: 0 },
    { id: 'a2', task_name: 'Continuous Phonation', status: 'approved', paused: false, priority_order: 1 },
    { id: 'a3', task_name: 'Minimal Pairs (Fricatives)', status: 'approved', paused: false, priority_order: 2 },
  ]);

  // Mock defect mapping based on a baseline diagnostic
  const diagnosticData = {
    labels: ['Fluency', 'Articulation (Plosives)', 'Voice (Loudness)', 'Prosody (Pacing)', 'Phonemic Accuracy'],
    datasets: [
      {
        label: 'Patient Competency',
        data: [40, 65, 80, 50, 45],
        backgroundColor: 'rgba(232, 255, 71, 0.4)',
        borderColor: '#e8ff47',
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#e8ff47',
        pointHoverBackgroundColor: '#000',
        pointHoverBorderColor: '#fff',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: '#2a2a2a' },
        grid: { color: '#2a2a2a' },
        pointLabels: { color: '#ffffff', font: { family: 'Geist Mono Variable', size: 12 } },
        ticks: { color: '#666', backdropColor: 'transparent', stepSize: 20, max: 100, min: 0 }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
         backgroundColor: '#111',
         titleColor: '#e8ff47',
         bodyFont: { family: 'Geist Variable' },
         borderColor: '#2a2a2a',
         borderWidth: 2,
         cornerRadius: 0,
      }
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await createPlan(patientId, {
        plan_name: "Adaptive Weekly Plan",
        therapist_id: user.id,
        generate: true
      });
      toast.success("Adaptive Weekly Plan Generated!");
      navigate('/therapist/dashboard');
    } catch (err) {
      toast.error('Failed to generate plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTogglePause = async (assignment) => {
    const newPaused = !assignment.paused;
    try {
      await updateAssignment(assignment.id, { paused: newPaused });
      setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, paused: newPaused } : a));
      toast.success(newPaused ? 'Task paused' : 'Task resumed');
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (assignment) => {
    if (!confirm(`Delete "${assignment.task_name}" from the plan?`)) return;
    try {
      await deleteAssignment(assignment.id);
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
      toast.success('Task removed');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Cannot delete — patient has progress');
    }
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;
    const updated = [...assignments];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((a, i) => a.priority_order = i);
    setAssignments(updated);

    try {
      await updateAssignment(updated[index].id, { priority_order: updated[index].priority_order });
      await updateAssignment(updated[index - 1].id, { priority_order: updated[index - 1].priority_order });
    } catch (err) {
      toast.error('Failed to reorder');
    }
  };

  const handleMoveDown = async (index) => {
    if (index >= assignments.length - 1) return;
    const updated = [...assignments];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((a, i) => a.priority_order = i);
    setAssignments(updated);

    try {
      await updateAssignment(updated[index].id, { priority_order: updated[index].priority_order });
      await updateAssignment(updated[index + 1].id, { priority_order: updated[index + 1].priority_order });
    } catch (err) {
      toast.error('Failed to reorder');
    }
  };

  return (
    <div className="w-full flex flex-col gap-8 max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-end border-b-2 border-neo-border pb-4">
        <div>
          <h1 className="text-4xl font-sans font-black uppercase tracking-tighter text-neo-text">Therapy Plan Builder</h1>
          <p className="font-mono text-neo-muted mt-2 tracking-widest uppercase">Patient ID: {patientId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: Diagnostic Radar */}
        <div className="neo-panel p-6 flex flex-col bg-neo-surface">
           <h2 className="font-mono text-xl uppercase tracking-widest text-neo-muted mb-6">Diagnostic Mapping</h2>
           <div className="flex-1 min-h-[400px]">
             <Radar data={diagnosticData} options={chartOptions} />
           </div>
           
           <div className="mt-8 border-t-2 border-neo-border pt-4">
             <h3 className="font-mono text-neo-danger font-bold uppercase">Primary Defect Detected:</h3>
             <p className="text-2xl font-black font-sans uppercase">Stuttering / Fluency Breakdowns (40%)</p>
           </div>
        </div>

        {/* Right Col: Tasks with Controls */}
        <div className="flex flex-col gap-6">
           <div className="neo-panel p-6 bg-neo-bg">
             <h2 className="font-mono text-xl uppercase tracking-widest text-neo-muted mb-4">Task Queue</h2>
             <p className="font-sans text-neo-text text-sm mb-6">
               Reorder tasks, pause individual exercises, or remove them from the plan.
             </p>

             <div className="flex flex-col gap-3">
               {assignments.map((task, i) => (
                 <div key={task.id} className={`p-4 border-4 border-neo-border flex items-center justify-between gap-3 transition-all ${task.paused ? 'bg-[#E0E0E0] opacity-60' : 'bg-neo-surface'}`}>
                    {/* Drag handle / priority */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleMoveUp(i)} className="text-neo-muted hover:text-neo-text text-xs font-black cursor-pointer" title="Move up">▲</button>
                        <button onClick={() => handleMoveDown(i)} className="text-neo-muted hover:text-neo-text text-xs font-black cursor-pointer" title="Move down">▼</button>
                      </div>
                      <span className="font-mono text-xs font-bold text-neo-muted w-6 text-center">#{i + 1}</span>
                    </div>

                    {/* Task Name */}
                    <span className={`font-bold text-neo-text flex-1 ${task.paused ? 'line-through' : ''}`}>{task.task_name}</span>

                    {/* Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => handleTogglePause(task)} 
                        className={`p-2 border-2 border-neo-border cursor-pointer transition-colors ${task.paused ? 'bg-[#1040C0] text-white' : 'bg-neo-surface text-neo-muted hover:bg-[#F0C020]'}`}
                        title={task.paused ? 'Resume' : 'Pause'}
                      >
                        {task.paused ? <Play size={16} /> : <Pause size={16} />}
                      </button>
                      <button 
                        onClick={() => handleDelete(task)} 
                        className="p-2 border-2 border-neo-border bg-neo-surface text-[#D02020] hover:bg-[#D02020] hover:text-white cursor-pointer transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                 </div>
               ))}
             </div>
           </div>

           <div className="neo-panel p-6 bg-neo-accent flex flex-col items-center justify-center text-black text-center gap-4">
              <h3 className="font-black text-2xl uppercase">Finalize Weekly Plan</h3>
              <p className="text-sm font-bold opacity-80 max-w-sm">
                Confirm this 3-day split. The patient will immediately see this queue on their dashboard.
              </p>
              <button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="neo-btn bg-black text-neo-accent border-black w-full hover:bg-[#1a1a1a] hover:border-[#1a1a1a]"
              >
                {isGenerating ? "MAPPING TASKS..." : "APPROVE & DISPATCH PLAN"}
              </button>
           </div>
        </div>
      </div>

    </div>
  );
};

export default PlanBuilder;
