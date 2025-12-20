import React, { useMemo, useState } from "react";
import { AudioTranscriber } from "./AudioTranscriber";

export function ChatPanel({
  chatLog,
  onSend,
  sessionId,
  participantId,
  sttEnabled,
  onToggleStt,
  transcript,
}) {
  const [text, setText] = useState("");

  const send = useMemo(
    () => () => {
      if (!text.trim()) return;
      onSend?.(text.trim());
      setText("");
    },
    [onSend, text]
  );

  const getSentimentColor = (sentiment) => {
    if (typeof sentiment === "number") {
      if (sentiment > 0.65) return "#10b981"; // green - positive
      if (sentiment < 0.35) return "#ef4444"; // red - negative
      return "#fbbf24"; // yellow - neutral
    }
    return "#9ca3af";
  };

  const getEmotionEmoji = (emotion) => {
    const emotionMap = {
      positive: "😊",
      negative: "😕",
      neutral: "😐",
      happy: "😄",
      sad: "😢",
      angry: "😠",
      confused: "😕",
    };
    return emotionMap[emotion?.toLowerCase()] || "💬";
  };

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>Chat & Speech</h3>
        <button className="btn-small btn-black" onClick={onToggleStt}>
          {sttEnabled ? "Whisper: On (toggle off)" : "Whisper: Off (toggle on)"}
        </button>
      </div>
      <AudioTranscriber sessionId={sessionId} participantId={participantId} enabled={sttEnabled} onTranscribed={() => {}} />
      <div className="chat-log">
        {chatLog.slice(-50).map((c, idx) => (
          <div key={idx} className="chat-line" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <span style={{ color: getSentimentColor(c.sentiment), fontSize: "1.1rem" }}>
              {getEmotionEmoji(c.emotion)}
            </span>
            <div style={{ flex: 1 }}>
              <span className="chat-author">{c.participant_id || "anon"}:</span> {c.message}
              {c.confidence && (
                <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "0.5rem" }}>
                  ({Math.round(c.confidence * 100)}%)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {Array.isArray(transcript) && transcript.length > 0 && (
        <div style={{ marginTop: "0.75rem" }}>
          <h4 style={{ margin: "0 0 0.5rem 0" }}>Meeting Transcript</h4>
          <div className="chat-log">
            {transcript.slice(-50).map((t, i) => (
              <div key={i} className="chat-line">
                <strong>{t.display_name || t.participant_id || "speaker"}:</strong> {t.text}
                {t.tone && <span style={{ marginLeft: 6, color: "#fbbf24" }}>({t.tone})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
