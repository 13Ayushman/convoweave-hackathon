import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { RealtimeDashboard } from "./components/RealtimeDashboard";
import { ParticipantList } from "./components/ParticipantList";
import { ChatPanel } from "./components/ChatPanel";
import { SummaryModal } from "./components/SummaryModal";
import { useWebRTC } from "./hooks/useWebRTC";
import { useSignals } from "./hooks/useSignals";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const FRAME_INTERVAL = 800; // Analyze frame every 0.8 seconds for smoother experience
const SMOOTHING_FACTOR = 0.3; // Lower = smoother (0-1)

export default function App() {
  const [sessionId, setSessionId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ws, setWs] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [joinSessionId, setJoinSessionId] = useState("");
  const [copyHint, setCopyHint] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [createMeetingName, setCreateMeetingName] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [joinDisplayName, setJoinDisplayName] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const analyzeIntervalRef = useRef(null);
  const lastSignalRef = useRef(null); // Store last signal for smoothing

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
      console.log("✓ Session created:", data.session_id);
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
      // Validate session existence before proceeding
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
      alert(
        "Session not found. It may have expired or the ID is incorrect.\n\nPlease create a new session or get a valid session ID."
      );
    }
  }, [joinSessionId, joinDisplayName]);

  // Remove auto-create on mount to let user choose Create/Join

  // Real AI emotion detection from video frames
  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const frameData = canvas.toDataURL("image/jpeg", 0.8);

      const res = await fetch(`${BACKEND_URL}/api/analyze-frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame: frameData, participant_id: participantId }),
      });
      
      if (!res.ok) throw new Error("Analysis failed");
      const result = await res.json();
      
      if (result.detected_face) {
        // Apply exponential smoothing for stable values
        let smoothedSignal;
        if (lastSignalRef.current) {
          smoothedSignal = {
            engagement: lastSignalRef.current.engagement * (1 - SMOOTHING_FACTOR) + result.engagement * SMOOTHING_FACTOR,
            confusion: lastSignalRef.current.confusion * (1 - SMOOTHING_FACTOR) + result.confusion * SMOOTHING_FACTOR,
            stress: lastSignalRef.current.stress * (1 - SMOOTHING_FACTOR) + result.stress * SMOOTHING_FACTOR,
            timestamp: Date.now() / 1000
          };
        } else {
          smoothedSignal = {
            ...result,
            timestamp: Date.now() / 1000
          };
        }
        
        lastSignalRef.current = smoothedSignal;
        sendSignal(smoothedSignal);
      }
    } catch (err) {
      console.error("Frame analysis error:", err);
    }
  }, [participantId]);

  // Auto-analyze frames when media is running
  useEffect(() => {
    if (!mediaStream || !ws) return;
    
    setIsAnalyzing(true);
    analyzeIntervalRef.current = setInterval(analyzeFrame, FRAME_INTERVAL);
    
    return () => {
      if (analyzeIntervalRef.current) clearInterval(analyzeIntervalRef.current);
      setIsAnalyzing(false);
    };
  }, [mediaStream, ws, analyzeFrame]);

  // Join session when we have ids
  useEffect(() => {
    async function join() {
      if (!sessionId || !participantId) return;
      
      try {
        const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/participants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participant_id: participantId, display_name: displayName }),
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.detail || "Failed to join session");
        }
        
        console.log("✓ Joined session as participant:", participantId);
        registerParticipant(participantId, displayName);
        
        const socket = new WebSocket(`${BACKEND_URL.replace("http", "ws")}/ws/${sessionId}/${participantId}`);
        socket.onopen = () => {
          console.log("✓ WebSocket connected");
        };
        socket.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          console.log("WebSocket message:", msg);
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
          if (msg.type === "session_ended") {
            if (msg.payload?.host_id && msg.payload.host_id === participantId) {
              // Host: we likely already requested end; keep summary modal flow
              setShowSummary(true);
            } else {
              alert("This meeting has ended by the host.");
              leaveMeeting();
            }
          }
        };
        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
        setWs(socket);
      } catch (err) {
        console.error("Failed to join session:", err);
        alert("Session not found. It may have expired or the ID is incorrect.\n\nPlease create a new session or get a valid session ID.");
        setShowWelcome(true);
        setSessionId("");
        setParticipantId("");
      }
    }
    join();
  }, [sessionId, participantId, displayName, pushSignal, pushChat, registerParticipant]);

  const sendSignal = useCallback((signal) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not ready, cannot send signal");
      return;
    }
    console.log("Sending signal:", signal);
    ws.send(JSON.stringify({ type: "signal", payload: signal }));
  }, [ws]);

  const sendChat = useMemo(() => {
    return (message) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: "chat", payload: { message } }));
    };
  }, [ws]);

  const endSession = async () => {
    if (!sessionId) return;
    await fetch(`${BACKEND_URL}/sessions/${sessionId}/end`, { method: "POST" });
    setShowSummary(true);
  };

  const leaveMeeting = useCallback(() => {
    // Close WebSocket connection
    if (ws) {
      ws.close();
      setWs(null);
    }
    
    // Stop media streams
    if (mediaStream) {
      stopMedia();
    }
    
    // Reset state
    setSessionId("");
    setParticipantId("");
    setShowSummary(false);
    setShowWelcome(true);
    
    console.log("✓ Left meeting, returning to welcome screen");
  }, [ws, mediaStream, stopMedia]);

  return (
    <div className="app-container">
      {/* Welcome Screen */}
      {showWelcome && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "500px" }}>
            <h2>🎭 Welcome to ConvoWeave</h2>
            <p style={{ marginBottom: "2rem", color: "#9ca3af" }}>
              Real-time emotional intelligence for virtual meetings
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="card">
                <h3>Create a Meeting</h3>
                <input
                  type="text"
                  value={createMeetingName}
                  onChange={(e) => setCreateMeetingName(e.target.value)}
                  placeholder="Meeting name (e.g., Weekly Sync)"
                  className="name-input"
                  style={{ width: "100%", marginBottom: "0.5rem" }}
                />
                <input
                  type="text"
                  value={createDisplayName}
                  onChange={(e) => setCreateDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="name-input"
                  style={{ width: "100%", marginBottom: "0.75rem" }}
                />
                <button onClick={createSession} className="btn-large" style={{ fontSize: "1.05rem" }}>
                  🆕 Create New Meeting
                </button>
              </div>
              <div style={{ textAlign: "center", color: "#6b7280", margin: "0.5rem 0" }}>or</div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value)}
                  placeholder="Enter Session ID"
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #374151",
                    backgroundColor: "#1a1f3a",
                    color: "#fff",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && joinSession()}
                />
              </div>
              <input
                type="text"
                value={joinDisplayName}
                onChange={(e) => setJoinDisplayName(e.target.value)}
                placeholder="Your name"
                className="name-input"
                style={{ width: "100%" }}
                onKeyDown={(e) => e.key === "Enter" && joinSession()}
              />
              <button onClick={joinSession} className="btn-large" style={{ padding: "0.75rem 1.5rem" }}>
                🔗 Join
              </button>
            </div>
            <div
              style={{
                marginTop: "2rem",
                padding: "1rem",
                backgroundColor: "#1a1f3a",
                borderRadius: "8px",
                fontSize: "0.9rem",
              }}
            >
              <p style={{ margin: "0.5rem 0", color: "#06b6d4" }}>
                💡 <strong>Features:</strong>
              </p>
              <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem", color: "#9ca3af" }}>
                <li>Real-time facial emotion detection</li>
                <li>AI-powered chat sentiment analysis</li>
                <li>Speech-to-text with tone analysis</li>
                <li>Meeting summaries with TTS</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>🎭 ConvoWeave</h1>
          <div className="session-info" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="badge" title={sessionId || "No session"}>
              Session: {sessionId ? `${sessionId.slice(0, 8)}…` : "None"}
            </span>
            <button
              className="btn-small btn-black"
              onClick={async () => {
                if (!sessionId) return;
                try {
                  await navigator.clipboard.writeText(sessionId);
                  setCopyHint("Copied full ID");
                  setTimeout(() => setCopyHint(""), 1500);
                } catch {}
              }}
              disabled={!sessionId}
              title={sessionId ? "Copy full session ID" : "No session to copy"}
            >
              📋 Copy ID
            </button>
            <button
              className="btn-small btn-black"
              onClick={async () => {
                if (!sessionId) return;
                const shareText = `Join my ConvoWeave meeting. Session ID: ${sessionId}`;
                const shareUrl = window.location.origin;
                if (navigator.share) {
                  try {
                    await navigator.share({ title: "ConvoWeave Meeting", text: shareText, url: shareUrl });
                  } catch {}
                } else {
                  try {
                    await navigator.clipboard.writeText(shareText);
                    setCopyHint("Share text copied");
                    setTimeout(() => setCopyHint(""), 1500);
                  } catch {}
                }
              }}
              disabled={!sessionId}
              title={sessionId ? "Share session" : "No session to share"}
            >
              🔗 Share
            </button>
            {copyHint && <span className="badge">{copyHint}</span>}
            <span className={`badge ${isAnalyzing ? "active" : ""}`}>
              {isAnalyzing ? "🔴 Live Analysis" : "⚪ Ready"}
            </span>
          </div>
        </div>
        <div className="header-right">
          {isHost && <span className="badge">Host</span>}
          <button onClick={endSession} className="btn-end">End Meeting</button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left: Media */}
        <div className="left-panel">
          <div className="video-card">
            <div className="video-wrapper">
              <video ref={videoRef} autoPlay muted playsInline className="video" />
              <canvas ref={canvasRef} width="320" height="240" style={{ display: "none" }} />
              <div className="video-overlay">{isAnalyzing && <div className="pulse-indicator" />}</div>
            </div>
            <div className="video-controls">
              <button
                onClick={() => (mediaStream ? stopMedia() : startMedia())}
                className={`btn-large ${mediaStream ? "active" : ""}`}
              >
                {mediaStream ? "🎥 Camera ON" : "🎥 Start Camera"}
              </button>
            </div>
          </div>
        </div>

        {/* Center: Host Console */}
        <div className="center-panel">
          {isHost ? (
            <RealtimeDashboard signals={signals} summary={summary} />
          ) : (
            <div className="dashboard-card">
              <h3>Meeting</h3>
              <div className="summary-stats">
                <div className="stat">
                  <div className="stat-label">Participants</div>
                  <div className="stat-value">{Object.keys(participants).length}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Status</div>
                  <div className="stat-value">Waiting for host insights</div>
                </div>
              </div>
              <div className="note-box">Only the host can view detailed analytics, transcription, and AI insights.</div>
            </div>
          )}
          <div style={{ marginTop: "16px" }}>
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
            />
          </div>
        </div>

        {/* Right: Participants */}
        <div className="right-panel">
          <ParticipantList participants={participants} signals={signals} currentParticipant={participantId} />
        </div>
      </div>

      {/* Summary Modal */}
      {showSummary && (
        <SummaryModal sessionId={sessionId} summary={summary} chatLog={chatLog} onClose={leaveMeeting} />)
      }
    </div>
  );
}
