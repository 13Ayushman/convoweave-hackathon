import React, { useState } from "react";
import { Sliders, Send, Target, Zap, Flame } from "lucide-react";

/**
 * Path: SignalControls.jsx
 * Visual sync with the Convo-Weave Premium UI.
 * Allows developers to simulate biometric/emotional signal shifts for the demo.
 */
export function SignalControls({ onSend }) {
  const [engagement, setEngagement] = useState(0.7);
  const [confusion, setConfusion] = useState(0.2);
  const [stress, setStress] = useState(0.3);

  const send = () => {
    onSend?.({ 
      engagement, 
      confusion, 
      stress, 
      timestamp: Date.now() / 1000 
    });
  };

  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Control Interface</h3>
          <p className="text-2xl font-black">Signal <span className="text-white/20">Emulator</span></p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
          <Sliders size={18} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Engagement Slider */}
        <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] transition-all hover:bg-white/10 group">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Engagement</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">{(engagement * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={engagement} 
            onChange={(e) => setEngagement(Number(e.target.value))}
            className="w-full h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Confusion Slider */}
        <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] transition-all hover:bg-white/10 group">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Confusion</span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">{(confusion * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={confusion} 
            onChange={(e) => setConfusion(Number(e.target.value))}
            className="w-full h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Stress Slider */}
        <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] transition-all hover:bg-white/10 group">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-rose-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Stress</span>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400">{(stress * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={stress} 
            onChange={(e) => setStress(Number(e.target.value))}
            className="w-full h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer accent-rose-500"
          />
        </div>

        {/* Action Button */}
        <button 
          onClick={send}
          className="w-full py-4 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
        >
          <Send size={14} />
          Broadcast Signal
        </button>

        <p className="text-[9px] text-center text-white/20 font-medium px-4">
          Signals are broadcasted to all session participants via the WebSocket manager.
        </p>
      </div>
    </div>
  );
}

export default SignalControls;