import React, { useState, useRef } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export function AudioTranscriber({ sessionId, participantId, enabled = true, onTranscribed }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [result, setResult] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        await sendAudioToBackend(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendAudioToBackend = async (blob) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "audio.wav");

      const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}/transcribe-audio`, {
        method: "POST",
        body: (() => { formData.append("participant_id", participantId || ""); return formData; })(),
      });

      const data = await response.json();
      setResult(data);
      onTranscribed?.(data);
    } catch (err) {
      console.error("Transcription error:", err);
      setResult({ error: err.message });
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="audio-transcriber" style={{ marginBottom: "1rem", padding: "0.5rem", backgroundColor: "#1a1f3a", borderRadius: "8px" }}>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        {!recording ? (
          <button onClick={startRecording} disabled={!enabled} className="btn-small btn-black" style={{ padding: "0.5rem 0.75rem", opacity: enabled ? 1 : 0.6 }}>
            🎤 Start Recording (Whisper)
          </button>
        ) : (
          <button onClick={stopRecording} className="btn-small" style={{ padding: "0.5rem 0.75rem", backgroundColor: "#ef4444", color: "#fff" }}>
            ⏹ Stop Recording
          </button>
        )}
      </div>

      {!enabled && (
        <p style={{ fontSize: "0.85rem", color: "#9ca3af", margin: 0 }}>Whisper is off for this meeting. Toggle it on to enable recording.</p>
      )}

      {transcribing && <p style={{ fontSize: "0.9rem", color: "#06b6d4" }}>Transcribing...</p>}

      {result && !result.error && (
        <div style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
          <p style={{ color: "#10b981", margin: "0.25rem 0" }}>
            <strong>Text:</strong> {result.text}
          </p>
          {result.tone && <p style={{ color: "#fbbf24", margin: "0.25rem 0" }}>Tone: {result.tone}</p>}
          {result.energy && <p style={{ color: "#f87171", margin: "0.25rem 0" }}>Energy: {result.energy}</p>}
          {result.stress_level && (
            <p style={{ color: "#a78bfa", margin: "0.25rem 0" }}>Stress: {Math.round(result.stress_level * 100)}%</p>
          )}
        </div>
      )}

      {result?.error && <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>Error: {result.error}</p>}
    </div>
  );
}
