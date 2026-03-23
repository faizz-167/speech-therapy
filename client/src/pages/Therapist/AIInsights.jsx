import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { FiCpu, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi';

const AIInsights = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">AI Insights Engine</h2>
        <p className="text-gray-400">Automated analysis and recommendations based on Whisper and Wav2Vec2 data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-dark-surface border-primary/20 bg-gradient-to-br from-dark-surface to-primary/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <FiTrendingUp className="text-primary mr-2" />
              Positive Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
              <h4 className="font-semibold text-green-400 mb-1">Alex Johnson</h4>
              <p className="text-sm text-gray-300">Has shown a 15% improvement in bilabial approximations (/p/, /b/) over the last 14 days. Suggest advancing to phrase-level practice.</p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
              <h4 className="font-semibold text-green-400 mb-1">Sarah Miller</h4>
              <p className="text-sm text-gray-300">Wav2Vec2 emotion processing shows significantly reduced frustration markers (down 40%) during sentence repetition tasks.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dark-surface border-orange-500/20 bg-gradient-to-br from-dark-surface to-orange-500/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <FiAlertTriangle className="text-orange-500 mr-2" />
              Areas of Concern
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
              <h4 className="font-semibold text-orange-400 mb-1">James Wilson</h4>
              <p className="text-sm text-gray-300">Adherence has dropped below 50%. Whisper ASR detects increased disfluency (stuttering blocks) in conversational tasks. Recommend regression to structured reading.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-dark-surface border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <FiCpu className="text-cyan-400 mr-2" />
            Global Model Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-900/50">
              <div className="text-2xl font-bold text-white mb-1">1,204</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Audio Samples Analyzed</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-900/50">
              <div className="text-2xl font-bold text-white mb-1">94.2%</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">ASR Confidence Avg</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-900/50">
              <div className="text-2xl font-bold text-white mb-1">142</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Plans Auto-Generated</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIInsights;
