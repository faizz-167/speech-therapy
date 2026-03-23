import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { FiCheckCircle, FiPlayCircle, FiLock } from "react-icons/fi";

const TaskCard = ({ task, isLocked, onStart }) => {
  const isCompleted = task.status === 'completed';

  return (
    <Card className={`relative overflow-hidden transition-all duration-100 border-4 border-[#121212] rounded-none ${isLocked ? 'bg-[#F0F0F0] opacity-50 grayscale shadow-none' : 'bg-white hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#121212]'}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-4">
            <div className="flex items-center space-x-3 mb-3">
              <span className="px-3 py-1 text-[10px] font-black bg-[#F0C020] text-[#121212] border-2 border-[#121212] uppercase tracking-widest shadow-[2px_2px_0px_0px_#121212]">
                {task.type}
              </span>
              {isCompleted && (
                <span className="flex items-center text-xs font-black text-white bg-[#121212] px-2 py-1 uppercase tracking-widest border-2 border-[#121212]">
                  <FiCheckCircle className="mr-1" strokeWidth={3} /> Done
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-[#121212] uppercase tracking-tighter mb-2 leading-tight">{task.title}</h3>
            <p className="text-sm text-[#121212] opacity-80 font-bold leading-snug line-clamp-2">{task.description}</p>
          </div>
          
          <div className="flex-shrink-0">
            {isLocked ? (
              <div className="w-12 h-12 border-4 border-[#121212] bg-[#F0F0F0] flex items-center justify-center text-[#121212]">
                <FiLock size={20} strokeWidth={3} />
              </div>
            ) : isCompleted ? (
              <div className="w-12 h-12 border-4 border-[#121212] bg-white flex items-center justify-center text-[#121212] shadow-[2px_2px_0px_0px_#121212]">
                <span className="font-black text-lg">{task.score || '✓'}</span>
              </div>
            ) : (
              <Button size="icon" className="w-12 h-12 rounded-none bg-[#1040C0] text-white border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#121212] hover:bg-[#082080] transition-all" onClick={() => onStart(task)}>
                <FiPlayCircle size={24} strokeWidth={3} />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      {isCompleted && <div className="absolute bottom-0 left-0 h-2 bg-[#1040C0] border-t-4 border-r-4 border-[#121212] w-full" />}
    </Card>
  );
};

export default TaskCard;
