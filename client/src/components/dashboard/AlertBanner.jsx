import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { dismissAlert } from '../../api/patients';

const AlertBanner = ({ alerts = [], onDismiss }) => {
  if (!alerts || alerts.length === 0) return null;

  const handleDismiss = async (progressId) => {
    try {
      await dismissAlert(progressId);
      onDismiss?.(progressId);
    } catch (err) {
      console.error('Failed to dismiss alert', err);
    }
  };

  return (
    <div className="w-full border-2 border-neo-danger bg-[#ff474715] p-4 mb-6">
      <h4 className="font-mono text-xs text-neo-danger uppercase tracking-widest mb-3 font-bold">
        ⚠ Performance Regression Alerts
      </h4>
      <div className="flex flex-col gap-2">
        {alerts.map((alert, i) => (
          <div key={alert.progress_id || i} className="flex items-center justify-between border border-neo-border bg-neo-surface p-3">
            <span className="font-sans text-sm text-neo-text">
              <strong>{alert.patient_name || 'Patient'}</strong> — {alert.task_name || 'Task'}:
              <span className="text-neo-danger font-mono ml-2">{alert.progress_delta} pts regression</span>
            </span>
            <div className="flex items-center gap-3">
              <Link
                to={`/patient/${alert.patient_id || ''}`}
                className="font-mono text-xs text-neo-accent uppercase hover:underline"
              >
                Review
              </Link>
              {onDismiss && (
                <button
                  onClick={() => handleDismiss(alert.progress_id)}
                  className="text-neo-muted hover:text-neo-danger"
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertBanner;
