import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const ProgressChart = ({ data: progressData, labels = [], scores = [], advanceThreshold = 75, dropThreshold = 50 }) => {
  const chartLabels = labels.length ? labels : ['W1', 'W2', 'W3', 'W4', 'W5'];
  const chartScores = scores.length ? scores : [65, 68, 74, 82, 85];

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Overall Progress',
        data: chartScores,
        borderColor: '#1040C0',
        backgroundColor: 'rgba(16, 64, 192, 0.1)',
        borderWidth: 4,
        pointBackgroundColor: '#121212',
        pointBorderColor: '#1040C0',
        pointBorderWidth: 4,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0,
        fill: true,
      },
      // ── Advance threshold line ──
      {
        label: 'Advance threshold',
        data: chartLabels.map(() => advanceThreshold),
        borderColor: '#1040C0',
        borderWidth: 3,
        borderDash: [10, 5],
        pointRadius: 0,
        fill: false,
      },
      // ── Drop threshold line ──
      {
        label: 'Drop threshold',
        data: chartLabels.map(() => dropThreshold),
        borderColor: '#D02020',
        borderWidth: 3,
        borderDash: [10, 5],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#666',
          font: { family: 'Geist Mono Variable', size: 10 },
          usePointStyle: true,
          boxWidth: 12,
        }
      },
      tooltip: {
        backgroundColor: '#111',
        titleColor: '#e8ff47',
        bodyColor: '#fff',
        titleFont: { family: 'Geist Mono Variable', size: 14 },
        bodyFont: { family: 'Geist Variable', size: 14, weight: 'bold' },
        borderColor: '#2a2a2a',
        borderWidth: 2,
        cornerRadius: 0,
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: '#2a2a2a' },
        ticks: { color: '#666', font: { family: 'Geist Mono Variable' } },
        border: { color: '#2a2a2a', width: 2 }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#666', font: { family: 'Geist Mono Variable' }, maxRotation: 45, minRotation: 45 },
        border: { color: '#2a2a2a', width: 2 }
      },
    },
  };

  return (
    <div className="w-full h-64 border-4 border-[#121212] bg-white shadow-[8px_8px_0px_0px_#121212] p-4 pb-8 mb-8 mt-4">
      <Line options={options} data={chartData} />
    </div>
  );
};

export default ProgressChart;
