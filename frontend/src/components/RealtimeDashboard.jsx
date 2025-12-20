import React, { useMemo } from "react";
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale } from "chart.js";
import { Line } from "react-chartjs-2";

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale);

export function RealtimeDashboard({ signals, summary }) {
  const participants = Object.entries(signals);

  const chartData = useMemo(() => {
    const labels = participants.map(([id]) => id.slice(0, 6));
    const engagement = participants.map(([, s]) => s.engagement ?? 0);
    const confusion = participants.map(([, s]) => s.confusion ?? 0);
    const stress = participants.map(([, s]) => s.stress ?? 0);
    return {
      labels,
      datasets: [
        { label: "Engagement", data: engagement, borderColor: "#22c55e", backgroundColor: "#22c55e33" },
        { label: "Confusion", data: confusion, borderColor: "#eab308", backgroundColor: "#eab30833" },
        { label: "Stress", data: stress, borderColor: "#ef4444", backgroundColor: "#ef444433" },
      ],
    };
  }, [participants]);

  return (
    <div className="card">
      <h3>Realtime Dashboard</h3>
      <div className="summary">
        <div><strong>Participants:</strong> {summary?.participants ?? participants.length}</div>
        <div><strong>Engagement:</strong> {summary?.engagement ?? "-"}</div>
        <div><strong>Confusion:</strong> {summary?.confusion ?? "-"}</div>
        <div><strong>Stress:</strong> {summary?.stress ?? "-"}</div>
        <div><strong>Note:</strong> {summary?.note ?? "Waiting for signals"}</div>
      </div>
      <Line
        data={chartData}
        options={{
          responsive: true,
          animation: false,
          scales: { y: { min: 0, max: 1 } },
          plugins: { legend: { position: "bottom" } },
        }}
      />
    </div>
  );
}
