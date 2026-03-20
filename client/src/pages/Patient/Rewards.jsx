import { FiChevronLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import RewardCard from '../../components/RewardCard';

const Rewards = () => {
  const navigate = useNavigate();

  const rewards = [
    { id: 1, title: 'First Steps', icon: null, locked: false },
    { id: 2, title: '3-Day Streak', icon: null, locked: false },
    { id: 3, title: 'Perfect Score', icon: null, locked: false },
    { id: 4, title: 'Master Talker', icon: null, locked: true },
    { id: 5, title: '7-Day Streak', icon: null, locked: true },
    { id: 6, title: 'Level 10 reached', icon: null, locked: true },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20 pt-6 px-4 flex flex-col">
      <button onClick={() => navigate('/patient/home')} className="flex items-center text-primary font-medium mb-6">
        <FiChevronLeft className="w-5 h-5 mr-1" /> Back Home
      </button>
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Rewards</h1>
        <p className="text-gray-400 mt-2">Unlock badges by completing your therapy plan.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {rewards.map(reward => (
          <RewardCard key={reward.id} reward={reward} isLocked={reward.locked} />
        ))}
      </div>
    </div>
  );
};

export default Rewards;
