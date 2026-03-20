import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { FiCheckCircle, FiPlayCircle, FiLock } from "react-icons/fi";

const TaskCard = ({ task, isLocked, onStart }) => {
  const isCompleted = task.status === 'completed';

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 ${isLocked ? 'opacity-50 grayscale' : 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10'}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary uppercase tracking-wider">
                {task.type}
              </span>
              {isCompleted && (
                <span className="flex items-center text-xs font-semibold text-green-400">
                  <FiCheckCircle className="mr-1" /> Done
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{task.title}</h3>
            <p className="text-sm text-gray-400 line-clamp-2">{task.description}</p>
          </div>
          
          <div className="flex-shrink-0 ml-4">
            {isLocked ? (
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-500">
                <FiLock size={20} />
              </div>
            ) : isCompleted ? (
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                <span className="font-bold text-lg">{task.score || '✓'}</span>
              </div>
            ) : (
              <Button size="icon" className="rounded-full w-12 h-12 shadow-lg hover:scale-105 transition-transform" onClick={() => onStart(task)}>
                <FiPlayCircle size={24} />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      {isCompleted && <div className="absolute bottom-0 left-0 h-1 bg-green-500 w-full" />}
    </Card>
  );
};

export default TaskCard;
