import React, { useMemo } from "react";
import { 
  Chart, 
  LineController, 
  LineElement, 
  PointElement, 
  LinearScale, 
  Title, 
  CategoryScale,
  Filler,
  Legend,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register Chart.js components including Filler for area charts
Chart.register(
  LineController, 
  LineElement, 
  PointElement, 
  LinearScale, 
  Title, 
  CategoryScale, 
  Filler,
  Legend,
  Tooltip
);

/**
 * Path: RealtimeDashboard.jsx
 * Visual sync with the Convo-Weave Premium UI.
 * Provides a high-level overview of meeting sentiment and engagement trends.
 */
export function RealtimeDashboard({ signals, summary }) {
  const participants = Object.entries(signals || {});

  const chartData = useMemo(() => {
    // Show truncated IDs for the x-axis
    const labels = participants.map(([id]) => id.slice(0, 6));
    const engagement = participants.map(([, s]) => s.engagement ?? 0);
    const confusion = participants.map(([, s]) => s.confusion ?? 0);
    const stress = participants.map(([, s]) => s.stress ?? 0);

    return {
      labels,
      datasets: [
        { 
          label: "Engagement", 
          data: engagement, 
          borderColor: "#10b981", 
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#10b981"
        },
        { 
          label: "Confusion", 
          data: confusion, 
          borderColor: "#fbbf24", 
          backgroundColor: "rgba(251, 191, 36, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#fbbf24"
        },
        { 
          label: "Stress", 
          data: stress, 
          borderColor: "#ef4444", 
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#ef4444"
        },
      ],
    };
  }, [participants]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    },
    scales: { 
      y: { 
        min: 0, 
        max: 1,
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.4)",
          font: { size: 10, family: 'monospace' }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.4)",
          font: { size: 10, family: 'monospace' }
        }
      }
    },
    plugins: { 
      legend: { 
        position: "bottom",
        labels: {
          color: "#fff",
          usePointStyle: true,
          padding: 20,
          font: { size: 11, weight: 'bold' }
        }
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleFont: { size: 12, weight: 'bold' },
        padding: 12,
        cornerRadius: 8,
        displayColors: true
      }
    },
  };

  return (
    <div className="flex flex-col h-full text-white">
      <div className="mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Analysis Console</h3>
        <p className="text-2xl font-black">Group <span className="text-white/20">Pulse</span></p>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatBox label="Active Users" value={summary?.participants ?? participants.length} />
        <StatBox label="Engagement" value={summary?.engagement ?? "-"} color="text-emerald-400" />
        <StatBox label="Confusion" value={summary?.confusion ?? "-"} color="text-amber-400" />
        <StatBox label="Stress" value={summary?.stress ?? "-"} color="text-rose-400" />
      </div>

      {/* Main Chart Card */}
      <div className="flex-1 bg-white/5 border border-white/10 rounded-[2rem] p-6 shadow-2xl relative min-h-[300px]">
        <div className="absolute top-6 right-8 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Live Feed</span>
        </div>
        
        <div className="h-full">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* AI Insight Footer */}
      <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
        <div className="mt-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block mb-0.5">Contextual Note</span>
          <p className="text-xs text-white/70 leading-relaxed italic">
            {summary?.note ?? "Monitoring biometrics for anomalies. Waiting for baseline data..."}
          </p>
        </div>
      </div>
    </div>
  );
}

// Internal Helper for Stats
const StatBox = ({ label, value, color = "text-white" }) => (
  <div className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
    <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">{label}</p>
    <p className={`text-lg font-black ${color}`}>{value}</p>
  </div>
);

export default RealtimeDashboard;