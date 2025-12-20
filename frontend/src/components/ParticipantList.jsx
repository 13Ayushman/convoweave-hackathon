import React from "react";

export function ParticipantList({ participants, signals, currentParticipant }) {
  // Show all participants (even if no signal yet)
  const participantList = Object.entries(participants).map(([id, name]) => ({
    id,
    name,
    signal: signals[id],
  }));

  const getEmotionColor = (value) => {
    if (value > 0.7) return "#22c55e";
    if (value > 0.4) return "#eab308";
    return "#ef4444";
  };

  const getEmotionLabel = (engagement, confusion, stress) => {
    if (!engagement && !confusion && !stress) return "Idle";
    if (engagement > 0.7) return "Engaged";
    if (confusion > 0.6) return "Confused";
    if (stress > 0.6) return "Stressed";
    return "Neutral";
  };

  return (
    <div className="participants-card">
      <h3>Participants</h3>
      <div className="participant-count">
        <span>{Object.keys(participants).length}</span> in session
      </div>

      <div className="participant-list">
        {participantList.map((p) => {
          const isCurrent = p.id === currentParticipant;
          const s = p.signal || {};
          const engagement = Number.isFinite(s.engagement) ? s.engagement : 0;
          const confusion = Number.isFinite(s.confusion) ? s.confusion : 0;
          const stress = Number.isFinite(s.stress) ? s.stress : 0;
          const emotionLabel = getEmotionLabel(engagement, confusion, stress);

          return (
            <div key={p.id} className={`participant-card ${isCurrent ? "current" : ""}`}>
              <div className="participant-header">
                <div className="participant-name">{p.name}</div>
                {isCurrent && <span className="badge-you">You</span>}
              </div>

              <div className="emotion-status">
                <div className="emotion-label">{emotionLabel}</div>
                <div className={`emotion-indicator ${emotionLabel.toLowerCase()}`} />
              </div>

              <div className="metrics">
                <div className="metric">
                  <div className="metric-bar">
                    <div
                      className="metric-fill"
                      style={{ width: `${engagement * 100}%`, backgroundColor: getEmotionColor(engagement) }}
                    />
                  </div>
                  <div className="metric-label">
                    <span>Engagement</span>
                    <span className="metric-value">{engagement.toFixed(2)}</span>
                  </div>
                </div>

                <div className="metric">
                  <div className="metric-bar">
                    <div
                      className="metric-fill"
                      style={{ width: `${confusion * 100}%`, backgroundColor: getEmotionColor(confusion) }}
                    />
                  </div>
                  <div className="metric-label">
                    <span>Confusion</span>
                    <span className="metric-value">{confusion.toFixed(2)}</span>
                  </div>
                </div>

                <div className="metric">
                  <div className="metric-bar">
                    <div
                      className="metric-fill"
                      style={{ width: `${stress * 100}%`, backgroundColor: getEmotionColor(stress) }}
                    />
                  </div>
                  <div className="metric-label">
                    <span>Stress</span>
                    <span className="metric-value">{stress.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
