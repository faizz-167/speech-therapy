import { Card, CardContent } from "./ui/card";
import { FiStar } from "react-icons/fi";

const RewardCard = ({ reward, isLocked }) => {
  return (
    <Card className={`relative overflow-hidden transition-all duration-300 ${isLocked ? 'opacity-50 grayscale' : 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10'}`}>
      <CardContent className="p-6 flex flex-col items-center justify-center text-center h-48">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isLocked ? 'bg-gray-800 text-gray-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
          {reward.icon ? (
            <img src={reward.icon} alt={reward.title} className="w-12 h-12" />
          ) : (
             <FiStar size={40} />
          )}
        </div>
        <h3 className="font-bold text-white tracking-tight">{reward.title}</h3>
        {isLocked && <p className="text-xs text-gray-400 mt-2 font-medium uppercase tracking-wider">Locked</p>}
      </CardContent>
    </Card>
  );
};

export default RewardCard;
