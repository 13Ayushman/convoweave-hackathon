import React, { useRef, useEffect } from "react";

/**
 * VideoGrid Component
 * Displays video feeds for all participants in a responsive grid
 * Host sees emotion metrics below participant feeds
 */
export function VideoGrid({
  participants,
  signals,
  videoRef,
  currentParticipantId,
  isHost,
  isMuted,
  cameraOn
}) {
  // Calculate grid layout
  const participantCount = Object.keys(participants).length;
  const getGridLayout = () => {
    if (participantCount <= 1) return { cols: 1, rows: 1 };
    if (participantCount <= 2) return { cols: 2, rows: 1 };
    if (participantCount <= 4) return { cols: 2, rows: 2 };
    if (participantCount <= 6) return { cols: 3, rows: 2 };
    if (participantCount <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: Math.ceil(participantCount / 4) };
  };

  const layout = getGridLayout();

  const getEmotionColor = (value) => {
    if (value > 0.7) return "bg-emerald-500"; // green - high engagement/positive
    if (value > 0.4) return "bg-amber-500"; // yellow - moderate
    if (value > 0.2) return "bg-orange-500"; // orange - low
    return "bg-red-500"; // red - very low
  };

  const getEmotionLabel = (metric) => {
    if (metric > 0.7) return "High";
    if (metric > 0.4) return "Med";
    return "Low";
  };

  return (
    <div
      className="bg-gradient-to-b from-slate-900/50 to-slate-950/30 rounded-3xl border border-white/5 backdrop-blur-lg overflow-hidden shadow-2xl p-4"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        gap: "12px",
        flex: 1,
        overflow: "auto",
      }}
    >
      {/* Current user's video */}
      {cameraOn && (
        <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
          <div className="relative aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 flex gap-2">
              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-bold rounded-lg border border-cyan-500/30">
                You
              </span>
              <span className={`px-2 py-1 text-xs font-bold rounded-lg border ${
                isMuted
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              }`}>
                {isMuted ? "🔇" : "🎤"}
              </span>
            </div>
          </div>
          <div className="p-3 bg-white/5">
            <span className="text-sm font-bold text-white">
              {participants[currentParticipantId] || "You"}
            </span>
            <span className="ml-2 px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded border border-indigo-500/30">
              Host
            </span>
          </div>
        </div>
      )}

      {/* Other participants' videos (placeholder) */}
      {Object.entries(participants).map(([pid, name]) => {
        if (pid === currentParticipantId) return null;

        const signal = signals[pid];
        const emotion = signal ? {
          engagement: signal.engagement || 0,
          confusion: signal.confusion || 0,
          stress: signal.stress || 0,
        } : null;

        return (
          <div key={pid} className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
            <div className="relative aspect-video">
              {/* Placeholder: In real app, would render actual video stream */}
              <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl">🎥</span>
                  <span className="block text-sm text-white/60 mt-2">{name}</span>
                </div>
              </div>
              <div className="absolute top-2 left-2">
                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-bold rounded-lg border border-cyan-500/30">
                  {name}
                </span>
              </div>
            </div>
            <div className="p-3 bg-white/5">
              <span className="text-sm font-bold text-white">{name}</span>

              {/* Host sees emotion metrics for each participant */}
              {isHost && emotion && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Engagement:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getEmotionColor(emotion.engagement)}`}
                          style={{ width: `${emotion.engagement * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-white/80">{getEmotionLabel(emotion.engagement)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Confusion:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getEmotionColor(emotion.confusion)}`}
                          style={{ width: `${emotion.confusion * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-white/80">{getEmotionLabel(emotion.confusion)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Stress:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getEmotionColor(emotion.stress)}`}
                          style={{ width: `${emotion.stress * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-white/80">{getEmotionLabel(emotion.stress)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default VideoGrid;
