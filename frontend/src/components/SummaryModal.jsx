import React, { useState, useEffect } from "react";

export function SummaryModal({ sessionId, summary, chatLog, onClose, onExport }) {
  const [isExporting, setIsExporting] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryAudio, setSummaryAudio] = useState(null);

  // Generate AI-powered summary on mount
  useEffect(() => {
    async function generateSummary() {
      try {
        const response = await fetch(`http://localhost:8000/sessions/${sessionId}/generate-summary`, {
          method: "POST",
        });
        const data = await response.json();
        setAiSummary(data.summary);
        setSummaryAudio(data.audio);
      } catch (err) {
        console.error("Failed to generate AI summary:", err);
        setAiSummary("Unable to generate AI summary at this time.");
      } finally {
        setLoadingSummary(false);
      }
    }
    generateSummary();
  }, [sessionId]);

  const handleExport = async () => {
    setIsExporting(true);
    const report = {
      sessionId,
      timestamp: new Date().toISOString(),
      summary,
      aiSummary,
      chatCount: chatLog.length,
      chat: chatLog,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `convoweave-${sessionId.slice(0, 8)}.json`;
    a.click();
    setIsExporting(false);
    onExport?.();
  };

  const playAudioSummary = () => {
    if (summaryAudio) {
      const audio = new Audio(summaryAudio);
      audio.play();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Meeting Summary</h2>
        
        {/* AI Summary */}
        {loadingSummary ? (
          <p style={{ color: "#06b6d4" }}>Generating AI summary...</p>
        ) : (
          <div style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#1a1f3a", borderRadius: "8px" }}>
            <h3 style={{ marginTop: 0, color: "#06b6d4" }}>🤖 AI Insights</h3>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{aiSummary}</p>
            {summaryAudio && (
              <button onClick={playAudioSummary} style={{ marginTop: "0.5rem" }}>
                🔊 Play Audio Summary
              </button>
            )}
          </div>
        )}

        <div className="summary-stats">
          <div className="stat">
            <div className="label">Participants</div>
            <div className="value">{summary?.participants || 0}</div>
          </div>
          <div className="stat">
            <div className="label">Avg Engagement</div>
            <div className="value">{(summary?.engagement || 0).toFixed(2)}</div>
          </div>
          <div className="stat">
            <div className="label">Avg Confusion</div>
            <div className="value" style={{ color: summary?.confusion > 0.5 ? "#ef4444" : "#22c55e" }}>
              {(summary?.confusion || 0).toFixed(2)}
            </div>
          </div>
          <div className="stat">
            <div className="label">Avg Stress</div>
            <div className="value" style={{ color: summary?.stress > 0.5 ? "#ef4444" : "#22c55e" }}>
              {(summary?.stress || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="note-box">
          <strong>Insight:</strong> {summary?.note || "No data"}
        </div>

        <div className="chat-summary">
          <h4>Chat History ({chatLog.length})</h4>
          <div className="chat-list">
            {chatLog.slice(-20).map((c, idx) => (
              <div key={idx} className="chat-item">
                <small style={{ color: "#94a3b8" }}>{c.participant_id?.slice(0, 6)}</small>: {c.message}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={handleExport} disabled={isExporting} className="secondary">
            {isExporting ? "Exporting..." : "📥 Download Report"}
          </button>
          <button onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
