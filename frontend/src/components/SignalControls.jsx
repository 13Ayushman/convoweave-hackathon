import React, { useState } from "react";

export function SignalControls({ onSend }) {
  const [engagement, setEngagement] = useState(0.7);
  const [confusion, setConfusion] = useState(0.2);
  const [stress, setStress] = useState(0.3);

  const send = () => {
    onSend?.({ engagement, confusion, stress, timestamp: Date.now() / 1000 });
  };

  return (
    <div className="card">
      <h3>Send Mock Signals</h3>
      <div className="slider">
        <label>Engagement {engagement.toFixed(2)}</label>
        <input type="range" min="0" max="1" step="0.01" value={engagement} onChange={(e) => setEngagement(Number(e.target.value))} />
      </div>
      <div className="slider">
        <label>Confusion {confusion.toFixed(2)}</label>
        <input type="range" min="0" max="1" step="0.01" value={confusion} onChange={(e) => setConfusion(Number(e.target.value))} />
      </div>
      <div className="slider">
        <label>Stress {stress.toFixed(2)}</label>
        <input type="range" min="0" max="1" step="0.01" value={stress} onChange={(e) => setStress(Number(e.target.value))} />
      </div>
      <button onClick={send}>Send Signal</button>
    </div>
  );
}
