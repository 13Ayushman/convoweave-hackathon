import { useCallback, useState } from "react";

export function useSignals() {
  const [signals, setSignals] = useState({});
  const [summary, setSummary] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const [participants, setParticipants] = useState({});
  const [transcript, setTranscript] = useState([]);
  const [sttEnabled, setSttEnabled] = useState(false);

  const pushSignal = useCallback((participantId, signal, newSummary) => {
    setSignals((prev) => ({ ...prev, [participantId]: signal }));
    if (newSummary) setSummary(newSummary);
  }, []);

  const pushChat = useCallback((payload) => {
    setChatLog((prev) => [...prev.slice(-50), payload]);
  }, []);

  const registerParticipant = useCallback((participantId, displayName) => {
    setParticipants((prev) => ({ ...prev, [participantId]: displayName }));
  }, []);

  const removeParticipant = useCallback((participantId) => {
    setParticipants((prev) => {
      const next = { ...prev };
      delete next[participantId];
      return next;
    });
    setSignals((prev) => {
      const next = { ...prev };
      delete next[participantId];
      return next;
    });
  }, []);

  const pushTranscript = useCallback((entry) => {
    setTranscript((prev) => [...prev.slice(-49), entry]);
  }, []);

  return {
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
  };
}
