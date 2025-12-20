import React from "react";

/**
 * Path: ParticipantList.jsx
 * Modified to match the Convo-Weave Premium UI.
 * Displays real-time RTEM (Real-Time Emotion Monitoring) metrics for all participants.
 */

export function ParticipantList({ participants, signals, currentParticipant }) {
  // Show all participants (even if no signal yet)
  const participantList = Object.entries(participants || {}).map(([id, name]) => ({
    id,
    name,
    signal: signals?.[id] || {},
  }));

  const getEmotionColor = (value) => {
    if (value > 0.7) return "bg-emerald-500";
    if (value > 0.4) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getEmotionLabel = (engagement, confusion, stress) => {
    if (!engagement && !confusion && !stress) return "Idle";
    if (engagement > 0.7) return "Engaged";
    if (confusion > 0.6) return "Confused";
    if (stress > 0.6) return "Stressed";
    return "Neutral";
  };

  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Live Roster</h3>
          <p className="text-2xl font-black">{participantList.length} <span className="text-white/20">Active</span></p>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        {participantList.map((p) => {
          const isCurrent = p.id === currentParticipant;
          const s = p.signal;
          const engagement = Number.isFinite(s.engagement) ? s.engagement : 0;
          const confusion = Number.isFinite(s.confusion) ? s.confusion : 0;
          const stress = Number.isFinite(s.stress) ? s.stress : 0;
          const emotionLabel = getEmotionLabel(engagement, confusion, stress);
          
          const initials = p.name ? p.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '?';

          return (
            <div 
              key={p.id} 
              className={`group relative p-5 rounded-[2rem] border transition-all duration-300 ${
                isCurrent 
                ? "bg-indigo-600 border-indigo-400 shadow-xl shadow-indigo-600/20" 
                : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${isCurrent ? 'bg-white text-indigo-600' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate max-w-[100px]">{p.name}</span>
                      {isCurrent && (
                        <span className="text-[8px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full">Host</span>
                      )}
                    </div>
                    <p className={`text-[10px] font-medium ${isCurrent ? 'text-indigo-100' : 'text-white/40'}`}>
                      {emotionLabel}
                    </p>
                  </div>
                </div>
                
                {/* Visual indicator pulse */}
                <div className={`w-3 h-3 rounded-full ${getEmotionColor(engagement)} ${engagement > 0.5 ? 'animate-pulse' : ''} shadow-lg shadow-current/20`}></div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  { label: "Engagement", val: engagement },
                  { label: "Confusion", val: confusion },
                  { label: "Stress", val: stress }
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-[8px] font-black uppercase tracking-wider ${isCurrent ? 'text-indigo-100' : 'text-white/30'}`}>
                        {metric.label}
                      </span>
                      <span className="text-[9px] font-mono font-bold">
                        {(metric.val * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${isCurrent ? 'bg-indigo-900/40' : 'bg-black/40'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ease-out ${isCurrent ? 'bg-white' : getEmotionColor(metric.val)}`}
                        style={{ width: `${metric.val * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Ensure default export is present to resolve element type errors
export default ParticipantList;