import React, { useState, useRef } from "react";

/**
 * Path: AudioTranscriber.jsx
 * Modified to match the Convo-Weave Premium UI.
 * Integrates with Groq Whisper backend for transcription and emotional tone analysis.
 */

// Safer check for environment variables
const BACKEND_URL = (typeof process !== 'undefined' && process.env && process.env.VITE_BACKEND_URL) 
  || "http://localhost:8000";

// Exporting as a named function to match the import style in ChatPanel.jsx
export const AudioTranscriber = ({ sessionId, participantId, enabled = true, onTranscribed }) => {
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
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendAudioToBackend = async (blob) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "audio.webm");
      formData.append("participant_id", participantId || "local-user");

      const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}/transcribe-audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Server communication failed");

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
    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md mb-4 transition-all overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Groq Whisper</h3>
          <p className="text-[9px] text-white/40">Vocal Tone Analysis</p>
        </div>
        
        {!recording ? (
          <button 
            onClick={startRecording} 
            disabled={!enabled || transcribing} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${
              enabled && !transcribing ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse"></div>
            {transcribing ? 'Processing...' : 'Analyze Voice'}
          </button>
        ) : (
          <button 
            onClick={stopRecording} 
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
            Stop & Process
          </button>
        )}
      </div>

      {!enabled && (
        <div className="py-2 px-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-[9px] text-amber-200 font-medium">Whisper is currently disabled by the host.</p>
        </div>
      )}

      {result && !result.error && (
        <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
            <p className="text-[8px] font-black text-white/30 uppercase mb-1">Transcript</p>
            <p className="text-xs text-white/90 leading-relaxed italic">"{result.text}"</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {result.tone && (
              <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                <p className="text-[7px] font-black text-emerald-500/60 uppercase">Tone</p>
                <p className="text-[10px] font-bold text-emerald-400">{result.tone}</p>
              </div>
            )}
            {result.stress_level && (
              <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                <p className="text-[7px] font-black text-indigo-500/60 uppercase">Stress</p>
                <p className="text-[10px] font-bold text-indigo-400">{Math.round(result.stress_level * 100)}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {result?.error && (
        <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          <p className="text-[9px] text-rose-400 font-bold">Error: {result.error}</p>
        </div>
      )}
    </div>
  );
};

// Also keeping default export for broader compatibility
export default AudioTranscriber;