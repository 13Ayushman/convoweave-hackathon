import React, { useState, useEffect } from "react";
import { X, Download, FileText, File } from "lucide-react";

export const SummaryModal = ({ sessionId, summary, chatLog, onClose, onExport, isHost }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [mom, setMom] = useState(null);
  const [loadingMom, setLoadingMom] = useState(true);

  // Generate Minutes of Meeting on mount (host only)
  useEffect(() => {
    if (!isHost) {
      setLoadingMom(false);
      return;
    }

    async function generateMom() {
      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}/generate-mom`, {
          method: "POST",
        });

        if (!response.ok) {
          if (response.status === 404) {
            setMom({ error: "Session ended or expired. MOM generation not available." });
          } else {
            setMom({ error: "Unable to generate MOM at this time." });
          }
          setLoadingMom(false);
          return;
        }

        const data = await response.json();
        setMom(data);
      } catch (err) {
        console.error("Failed to generate MOM:", err);
        setMom({ error: "Unable to generate MOM at this time." });
      } finally {
        setLoadingMom(false);
      }
    }
    generateMom();
  }, [sessionId, isHost]);

  const handleExport = async () => {
    setIsExporting(true);
    const report = {
      sessionId,
      timestamp: new Date().toISOString(),
      mom,
      chatCount: chatLog.length,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `convoweave-mom-${sessionId.slice(0, 8)}.json`;
    a.click();
    setIsExporting(false);
    onExport?.();
  };

  const downloadMomPdf = async () => {
    setIsExporting(true);
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}/download-mom-pdf`);
      if (!response.ok) throw new Error("Failed to download PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MOM_${sessionId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Failed to download PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadMomTxt = async () => {
    setIsExporting(true);
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}/download-mom-txt`);
      if (!response.ok) throw new Error("Failed to download TXT");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MOM_${sessionId.slice(0, 8)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("TXT download failed:", err);
      alert("Failed to download TXT");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-black/30 flex items-center justify-between">
          <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 uppercase tracking-wide">
            {isHost ? "Minutes of Meeting (MOM)" : "Meeting Ended"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isHost ? (
            <>
              {/* MOM Content */}
              {loadingMom ? (
                <div className="text-center py-8">
                  <p className="text-cyan-400 font-semibold">Generating Minutes of Meeting...</p>
                </div>
              ) : mom?.error ? (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                  <p className="text-rose-400 font-bold">⚠️ {mom.error}</p>
                </div>
              ) : (
                <>
                  {/* Header Info */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-xs text-white/60 uppercase">Meeting Title</p>
                      <p className="text-sm font-bold text-emerald-400">{mom?.title || "Untitled"}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-xs text-white/60 uppercase">Duration</p>
                      <p className="text-sm font-bold text-white">{mom?.duration || "N/A"}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-xs text-white/60 uppercase">Participants</p>
                      <p className="text-sm font-bold text-white">{mom?.participants || 0}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-xs text-white/60 uppercase">Date</p>
                      <p className="text-xs font-bold text-white">{mom?.date || new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Engagement Metrics */}
                  {(mom?.engagement || mom?.confusion || mom?.stress) && (
                    <div className="bg-black/20 border border-white/5 rounded-xl p-4 mb-4">
                      <p className="text-sm font-bold text-white mb-3">📊 Engagement Metrics</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-xs text-white/60">Engagement</p>
                          <p className="text-lg font-bold text-emerald-400">{mom?.engagement}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-white/60">Confusion</p>
                          <p className="text-lg font-bold text-orange-400">{mom?.confusion}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-white/60">Stress</p>
                          <p className="text-lg font-bold text-rose-400">{mom?.stress}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Agenda */}
                  {mom?.agenda && (
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-cyan-400 mb-2">📌 Agenda</h4>
                      <p className="text-sm text-white/80 leading-relaxed">{mom.agenda}</p>
                    </div>
                  )}

                  {/* Key Discussions */}
                  {mom?.key_discussions && Array.isArray(mom.key_discussions) && (
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-cyan-400 mb-2">💬 Key Discussions</h4>
                      <ul className="text-sm text-white/80 space-y-1 ml-4">
                        {mom.key_discussions.map((disc, idx) => (
                          <li key={idx} className="list-disc">{disc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Decisions */}
                  {mom?.decisions && Array.isArray(mom.decisions) && mom.decisions.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-emerald-400 mb-2">✅ Decisions Made</h4>
                      <ul className="text-sm text-white/80 space-y-1 ml-4">
                        {mom.decisions.map((dec, idx) => (
                          <li key={idx} className="list-disc">{dec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Items */}
                  {mom?.action_items && Array.isArray(mom.action_items) && mom.action_items.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-orange-400 mb-2">📝 Action Items</h4>
                      <ul className="text-sm text-white/80 space-y-1 ml-4">
                        {mom.action_items.map((item, idx) => (
                          <li key={idx} className="list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Executive Summary */}
                  {mom?.summary && (
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-cyan-400 mb-2">📄 Executive Summary</h4>
                      <p className="text-sm text-white/80 leading-relaxed">{mom.summary}</p>
                    </div>
                  )}

                  {/* Next Steps */}
                  {mom?.next_meeting && (
                    <div className="bg-black/20 border border-white/5 rounded-xl p-4 mb-4">
                      <p className="text-sm font-bold text-white mb-1">🗓️ Next Meeting Topic</p>
                      <p className="text-sm text-white/80">{mom.next_meeting}</p>
                    </div>
                  )}

                  {/* Overall Sentiment */}
                  {mom?.overall_sentiment && (
                    <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                      <p className="text-xs text-white/60 uppercase mb-1">Overall Sentiment</p>
                      <p className={`text-lg font-bold ${
                        mom.overall_sentiment === "positive" ? "text-emerald-400" :
                        mom.overall_sentiment === "negative" ? "text-rose-400" : "text-amber-400"
                      }`}>
                        {mom.overall_sentiment.charAt(0).toUpperCase() + mom.overall_sentiment.slice(1)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-lg font-bold text-white mb-4">📹 Meeting Ended</h3>
              <p className="text-white/60 mb-4">
                Thank you for attending! The host will receive the Minutes of Meeting (MOM).
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm text-amber-200">
                  💡 Only the host can access and download the detailed minutes of this meeting.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-black/30 flex gap-2 flex-wrap">
          {isHost && !loadingMom && (
            <>
              <button
                onClick={downloadMomPdf}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition-colors"
              >
                <FileText className="w-4 h-4" />
                {isExporting ? "Downloading..." : "PDF"}
              </button>
              <button
                onClick={downloadMomTxt}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition-colors"
              >
                <File className="w-4 h-4" />
                {isExporting ? "Downloading..." : "TXT"}
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                {isExporting ? "Exporting..." : "JSON"}
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
