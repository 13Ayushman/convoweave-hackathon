
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import RealtimeDashboard from "./components/RealtimeDashboard";
import ParticipantList from "./components/ParticipantList";
import ChatPanel from "./components/ChatPanel";
import SummaryModal from "./components/SummaryModal";
import VideoGrid from "./components/VideoGrid";
import { useWebRTC } from "./hooks/useWebRTC";
import { useSignals } from "./hooks/useSignals";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export default function App() {
  const [sessionId, setSessionId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ws, setWs] = useState(null);
  const [wsStatus, setWsStatus] = useState("idle");
  const [showSummary, setShowSummary] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [joinSessionId, setJoinSessionId] = useState("");
  const [copyHint, setCopyHint] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [createMeetingName, setCreateMeetingName] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [joinDisplayName, setJoinDisplayName] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [liveCaption, setLiveCaption] = useState(null);
  const [speakingParticipant, setSpeakingParticipant] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('analysis');

  const wsRetryRef = useRef(0);
  const wsReconnectTimerRef = useRef(null);
  const joinedRef = useRef(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const { mediaStream, startMedia, stopMedia } = useWebRTC({ videoRef });
  const {
    signals,
    summary,
    chatLog,
    participants,
    transcript,
    sttEnabled,
    pushSignal,
    pushChat,
    registerParticipant,
    removeParticipant,
    pushTranscript,
    setSttEnabled,
  } = useSignals();

  // Create new session
  const createSession = useCallback(async () => {
    if (!createMeetingName.trim()) {
      alert("Please enter a meeting name");
      return;
    }
    if (!createDisplayName.trim()) {
      alert("Please enter your name");
      return;
    }
    try {
      const newPid = crypto.randomUUID();
      const res = await fetch(`${BACKEND_URL}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createMeetingName.trim(), host_id: newPid, host_display_name: createDisplayName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      setSessionId(data.session_id);
      setParticipantId(newPid);
      setDisplayName(createDisplayName.trim());
      setIsHost(true);
      setShowWelcome(false);
      try {
        await navigator.clipboard.writeText(data.session_id);
        setCopyHint("Session ID copied");
        setTimeout(() => setCopyHint(""), 1500);
      } catch {}
    } catch (err) {
      console.error("Session creation failed:", err);
      alert("Failed to create session. Please try again.");
    }
  }, [createMeetingName, createDisplayName]);

  // Join existing session
  const joinSession = useCallback(async () => {
    if (!joinSessionId.trim()) {
      alert("Please enter a session ID");
      return;
    }
    if (!joinDisplayName.trim()) {
      alert("Please enter your name");
      return;
    }
    const id = joinSessionId.trim();
    try {
      const check = await fetch(`${BACKEND_URL}/sessions/${id}`);
      if (!check.ok) {
        const detail = await check.json().catch(() => ({}));
        throw new Error(detail.detail || "Session not found or expired");
      }
      setSessionId(id);
      setParticipantId(crypto.randomUUID());
      setDisplayName(joinDisplayName.trim());
      setIsHost(false);
      setShowWelcome(false);
    } catch (e) {
      console.error("Join validation failed:", e);
      alert("Session not found. It may have expired or the ID is incorrect.\n\nPlease create a new session or get a valid session ID.");
    }
  }, [joinSessionId, joinDisplayName]);

  // WebSocket connect with auto-reconnect
  useEffect(() => {
    if (!sessionId || !participantId) return;

    let cancelled = false;
    let socket = null;

    const connect = async () => {
      try {
        if (!joinedRef.current) {
          const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/participants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participant_id: participantId, display_name: displayName }),
          });
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || "Failed to join session");
          }
          registerParticipant(participantId, displayName);
          joinedRef.current = true;
        }

        setWsStatus("connecting");
        socket = new WebSocket(`${BACKEND_URL.replace("http", "ws")}/ws/${sessionId}/${participantId}`);

        socket.onopen = () => {
          wsRetryRef.current = 0;
          setWsStatus("connected");
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "session_init") {
              const mapping = msg.payload?.participants || {};
              Object.entries(mapping).forEach(([pid, name]) => registerParticipant(pid, name));
              const hostId = msg.payload?.session?.host_id;
              if (hostId) setIsHost(hostId === participantId);
              if (typeof msg.payload?.stt_enabled === "boolean") setSttEnabled(msg.payload.stt_enabled);
              const initialTranscript = msg.payload?.transcript || [];
              initialTranscript.forEach((entry) => pushTranscript(entry));
            }
            if (msg.type === "session_update") {
              if (msg.payload.display_name) {
                registerParticipant(msg.payload.participant_id, msg.payload.display_name);
              }
              pushSignal(msg.payload.participant_id, msg.payload.signal, msg.payload.summary);
            }
            if (msg.type === "chat") {
              pushChat(msg.payload);
            }
            if (msg.type === "participant_joined") {
              registerParticipant(msg.payload.participant_id, msg.payload.display_name || "Guest");
            }
            if (msg.type === "participant_left") {
              removeParticipant(msg.payload.participant_id);
            }
            if (msg.type === "transcript") {
              pushTranscript(msg.payload);
            }
            if (msg.type === "stt_toggle") {
              setSttEnabled(!!msg.payload?.enabled);
            }
            if (msg.type === "recording_toggle") {
              setIsRecording(!!msg.payload?.recording);
            }
            if (msg.type === "transcript_live") {
              setLiveCaption({
                speaker: msg.payload.display_name || msg.payload.participant_id,
                text: msg.payload.text,
                tone: msg.payload.tone,
              });
              setTimeout(() => setLiveCaption(null), 8000);
            }
            if (msg.type === "participant_speaking") {
              setSpeakingParticipant({
                id: msg.payload.participant_id,
                name: msg.payload.display_name || "Guest",
              });
            }
            if (msg.type === "participant_stopped_speaking") {
              setSpeakingParticipant(null);
            }
            if (msg.type === "session_ended") {
              if (msg.payload?.host_id && msg.payload.host_id === participantId) {
                setShowSummary(true);
              } else {
                alert("This meeting has ended by the host.");
                leaveMeeting();
              }
            }
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err, event.data);
          }
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          setWsStatus("error");
        };

        socket.onclose = () => {
          setWsStatus("closed");
          if (!cancelled && wsRetryRef.current < 5) {
            const delay = Math.min(5000, 500 * (wsRetryRef.current + 1));
            wsRetryRef.current += 1;
            if (wsReconnectTimerRef.current) clearTimeout(wsReconnectTimerRef.current);
            wsReconnectTimerRef.current = setTimeout(connect, delay);
          }
        };

        setWs(socket);
      } catch (err) {
        console.error("Failed to join session:", err);
        alert("Session not found. It may have expired or the ID is incorrect.\n\nPlease create a new session or get a valid session ID.");
        setShowWelcome(true);
        setSessionId("");
        setParticipantId("");
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (wsReconnectTimerRef.current) {
        clearTimeout(wsReconnectTimerRef.current);
        wsReconnectTimerRef.current = null;
      }
      if (socket) {
        try {
          socket.close();
        } catch {}
      }
    };
  }, [sessionId, participantId, displayName, registerParticipant, pushTranscript, pushSignal, pushChat, removeParticipant, setSttEnabled]);

  const sendSignal = useCallback((signal) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "signal", payload: signal }));
  }, [ws]);

  const sendChat = useMemo(() => {
    return (payload) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const message = typeof payload === "string" ? { message: payload } : payload;
      const fullPayload = {
        message: message.message,
        display_name: message.display_name || displayName || "Anonymous",
        timestamp: message.timestamp || Date.now() / 1000,
      };
      ws.send(JSON.stringify({ type: "chat", payload: fullPayload }));
    };
  }, [ws, displayName]);

  const endSession = async () => {
    if (!sessionId) return;
    await fetch(`${BACKEND_URL}/sessions/${sessionId}/end`, { method: "POST" });
    setShowSummary(true);
  };

  const leaveMeeting = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
    }
    if (wsReconnectTimerRef.current) {
      clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = null;
    }
    if (mediaStream) {
      stopMedia();
      setCameraOn(false);
    }
    setSessionId("");
    setParticipantId("");
    setShowSummary(false);
    setShowWelcome(true);
    setWsStatus("idle");
    wsRetryRef.current = 0;
    joinedRef.current = false;
  }, [ws, mediaStream, stopMedia]);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden text-white bg-[#131416]">
      {/* Welcome Screen - Compact Version */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-3xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"/>
                </svg>
              </div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-1">
                Convo-Weave
              </h2>
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                Groq & Mediapipe Engine
              </p>
            </div>
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <h3 className="text-xs font-bold text-white mb-2">Create Meeting</h3>
                <input
                  type="text"
                  value={createMeetingName}
                  onChange={(e) => setCreateMeetingName(e.target.value)}
                  placeholder="Meeting name"
                  className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-indigo-500 mb-2"
                />
                <input
                  type="text"
                  value={createDisplayName}
                  onChange={(e) => setCreateDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-indigo-500 mb-2"
                />
                <button onClick={createSession} className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-all">
                  Start Meeting
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <h3 className="text-xs font-bold text-white mb-2">Join Meeting</h3>
                <input
                  type="text"
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value)}
                  placeholder="Session ID"
                  className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-indigo-500 mb-2 font-mono"
                />
                <input
                  type="text"
                  value={joinDisplayName}
                  onChange={(e) => setJoinDisplayName(e.target.value)}
                  placeholder="Your name"
                  onKeyPress={(e) => e.key === "Enter" && joinSession()}
                  className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-indigo-500 mb-2"
                />
                <button onClick={joinSession} className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-all">
                  Join Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Original Frontend v2 Top Bar */}
      <header className="h-16 px-8 flex items-center justify-between bg-black/40 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"/>
            </svg>
          </div>
          <div>
            <h1 className="font-black text-lg leading-none uppercase tracking-tighter">Convo-Weave</h1>
            <p className="text-[9px] text-indigo-400 font-bold tracking-widest mt-1 uppercase">Groq & Mediapipe Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sessionId && (
            <>
              <button
                onClick={async () => {
                  const link = window.location.origin + "?join=" + sessionId;
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopyHint("Link copied!");
                    setTimeout(() => setCopyHint(""), 2000);
                  } catch {}
                }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2 rounded-full text-xs font-bold transition-all"
              >
                Share Meeting Invite
              </button>
              {copyHint && <span className="text-xs text-emerald-400">{copyHint}</span>}
            </>
          )}
          {isHost && (
            <button onClick={endSession} className="bg-rose-500 hover:bg-rose-600 px-5 py-2 rounded-full text-xs font-bold transition-all">
              End Meeting
            </button>
          )}
        </div>
      </header>

      {/* Main Layout - Original Frontend v2 Design */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Video Grid */}
        <div className="flex-1">
          <VideoGrid
            participants={participants}
            signals={signals}
            videoRef={videoRef}
            currentParticipantId={participantId}
            isHost={isHost}
            isMuted={isMuted}
            cameraOn={cameraOn}
          />
        </div>

        {/* White Sidebar - Original Frontend v2 Theme */}
        <aside className="w-80 bg-white rounded-[2.5rem] flex flex-col text-slate-900 shadow-2xl overflow-hidden">
          {/* Tab Switcher */}
          <div className="flex p-1.5 gap-1 bg-slate-100 m-5 rounded-2xl">
            <button
              onClick={() => setSidebarTab('analysis')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl ${
                sidebarTab === 'analysis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
              }`}
            >
              Analysis
            </button>
            <button
              onClick={() => setSidebarTab('participants')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl ${
                sidebarTab === 'participants' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
              }`}
            >
              People ({Object.keys(participants).length})
            </button>
          </div>

          {/* Analysis Tab Content */}
          {sidebarTab === 'analysis' && (
          <div className="flex-1 px-6 overflow-y-auto">
            {/* Groq Whisper Output */}
            <div className="p-6 bg-indigo-600 rounded-3xl text-white mb-6">
              <p className="text-[10px] font-black opacity-50 uppercase mb-2">Groq Whisper Output</p>
              <p className="text-sm font-medium italic leading-relaxed">
                {isRecording ? "Detecting vocal markers... Transcription active." : "Waiting for audio stream..."}
              </p>
            </div>

            {/* Engagement Metrics */}
            {isHost && (
              <div className="space-y-4 mb-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Attention Rank</h4>
                {Object.entries(participants).map(([pid, name]) => {
                  const signal = signals[pid] || {};
                  return (
                    <div key={pid} className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">{name}</span>
                      <span className="text-indigo-600">{Math.round((signal.engagement || 0) * 100)}%</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Chat Panel */}
            <div className="mt-6">
              <ChatPanel
                chatLog={chatLog}
                onSend={sendChat}
                sessionId={sessionId}
                participantId={participantId}
                sttEnabled={sttEnabled}
                onToggleStt={() => {
                  if (!ws || ws.readyState !== WebSocket.OPEN) return;
                  ws.send(JSON.stringify({ type: "stt_toggle", payload: { enabled: !sttEnabled } }));
                }}
                transcript={transcript}
                isHost={isHost}
              />
            </div>
          </div>
          )}

          {/* Participants Tab Content */}
          {sidebarTab === 'participants' && (
          <div className="flex-1 px-6 overflow-y-auto">
            {Object.entries(participants).map(([pid, name]) => (
              <div key={pid} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl mb-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-600 text-[10px]">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-slate-700">{name}</span>
              </div>
            ))}
          </div>
          )}
        </aside>
      </main>

      {/* Controls Footer */}
      <footer className="h-28 flex items-center justify-center gap-4 px-8">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-5 rounded-2xl transition-all ${!isMuted ? 'bg-white/5' : 'bg-rose-500'}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          </svg>
        </button>
        <button
          onClick={() => {
            if (cameraOn) {
              stopMedia();
              setCameraOn(false);
            } else {
              startMedia();
              setCameraOn(true);
            }
          }}
          className={`p-5 rounded-2xl transition-all ${!cameraOn ? 'bg-white/5' : 'bg-emerald-500'}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
        </button>
        <button
          onClick={() => setIsAnalyzing(!isAnalyzing)}
          className={`px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            isAnalyzing ? 'bg-rose-500' : 'bg-indigo-600 shadow-xl shadow-indigo-500/20'
          }`}
        >
          {isAnalyzing ? "Stop RTEM Analysis" : "Start RTEM Analysis"}
        </button>
      </footer>

      {/* Summary Modal */}
      {showSummary && (
        <SummaryModal
          sessionId={sessionId}
          summary={summary}
          chatLog={chatLog}
          onClose={leaveMeeting}
          onExport={() => {}}
          isHost={isHost}
        />
      )}
    </div>
  );
}