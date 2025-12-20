import React, { useMemo, useState } from "react";
import { MessageSquare, Mic, MicOff, Send } from "lucide-react";
import AudioTranscriber from "./AudioTranscriber";

export function ChatPanel({
  chatLog,
  onSend,
  sessionId,
  participantId,
  sttEnabled,
  onToggleStt,
  transcript,
  isHost,
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
      if (sentiment > 0.65) return "text-emerald-400"; // green - positive
      if (sentiment < 0.35) return "text-rose-400"; // red - negative
      return "text-amber-400"; // yellow - neutral
    }
    return "text-white/60";
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
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900/50 to-slate-950/30 rounded-3xl border border-white/5 backdrop-blur-lg overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-black/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 uppercase tracking-wide">
            Chat & Speech
          </h3>
        </div>
        {isHost && (
          <button
            onClick={onToggleStt}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              sttEnabled
                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                : "bg-white/10 border border-white/20 text-white/60 hover:bg-white/20"
            }`}
          >
            {sttEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            {sttEnabled ? "STT On" : "STT Off"}
          </button>
        )}
      </div>

      {/* Audio Transcriber */}
      <div className="px-6 py-3 border-b border-white/5">
        <AudioTranscriber
          sessionId={sessionId}
          participantId={participantId}
          enabled={sttEnabled}
          onTranscribed={() => {}}
        />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {chatLog.slice(-50).map((c, idx) => (
          <div key={idx} className="flex gap-3 items-start">
            <span className={`text-lg ${getSentimentColor(c.sentiment)}`}>
              {getEmotionEmoji(c.emotion)}
            </span>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-bold text-cyan-400">
                  {c.participant_id || "anon"}
                </span>
                {c.confidence && (
                  <span className="text-xs text-white/40">
                    ({Math.round(c.confidence * 100)}%)
                  </span>
                )}
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{c.message}</p>
            </div>
          </div>
        ))}
        {chatLog.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      {/* Transcript Section */}
      {Array.isArray(transcript) && transcript.length > 0 && (
        <div className="px-6 py-3 border-t border-white/5">
          <h4 className="text-sm font-bold text-amber-400 mb-3 uppercase tracking-wide">
            Meeting Transcript
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {transcript.slice(-50).map((t, i) => (
              <div key={i} className="text-xs text-white/60">
                <span className="font-bold text-white/80">
                  {t.display_name || t.participant_id || "speaker"}:
                </span>{" "}
                {t.text}
                {t.tone && (
                  <span className="ml-2 text-amber-400">({t.tone})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="px-6 py-4 border-t border-white/5 bg-black/30">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-colors"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-white/10 disabled:to-white/10 disabled:text-white/40 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
