import { Card, CardContent } from "./ui/card";
import { FiStar } from "react-icons/fi";

const RewardCard = ({ reward, isLocked }) => {
  return (
    <Card className={`relative overflow-hidden transition-all duration-100 border-4 border-[#121212] rounded-none ${isLocked ? 'bg-[#F0F0F0] opacity-50 grayscale shadow-none' : 'bg-[#FFEB99] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#121212]'}`}>
      <CardContent className="p-6 flex flex-col items-center justify-center text-center h-48 border-b-8 border-transparent">
        <div className={`w-20 h-20 border-4 border-[#121212] flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#121212] ${isLocked ? 'bg-[#E0E0E0] text-[#121212]' : 'bg-[#F0C020] text-[#121212]'}`}>
          {reward.icon ? (
            <img src={reward.icon} alt={reward.title} className="w-12 h-12 object-contain" />
          ) : (
             <FiStar size={40} fill="currentColor" strokeWidth={2} />
          )}
        </div>
        <h3 className="font-black text-[#121212] tracking-tighter uppercase text-lg leading-tight">{reward.title}</h3>
        {isLocked && <p className="text-[10px] text-[#121212] opacity-70 mt-3 font-black uppercase tracking-widest bg-white border-2 border-[#121212] px-2 py-0.5 shadow-[2px_2px_0px_0px_#121212]">Locked</p>}
      </CardContent>
    </Card>
  );
};

export default RewardCard;
