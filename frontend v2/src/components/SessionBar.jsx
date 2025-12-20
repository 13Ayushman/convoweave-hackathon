import React from "react";
import { User, Hash, Edit3 } from "lucide-react";

/**
 * Path: SessionBar.jsx
 * Visual sync with the Convo-Weave Premium UI.
 * Provides session identification and user profile management.
 */
export function SessionBar({ sessionId, displayName, onNameChange }) {
  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2rem] p-4 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl transition-all hover:border-white/20">
      
      {/* Session Identity */}
      <div className="flex items-center gap-4 pl-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Hash size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 leading-none mb-1">Active Session</p>
          <p className="text-sm font-mono font-bold text-white tracking-wider truncate max-w-[150px]">
            {sessionId || "Initializing..."}
          </p>
        </div>
      </div>

      {/* User Profile Management */}
      <div className="flex-1 w-full md:w-auto flex items-center gap-4 bg-black/20 border border-white/5 p-2 pr-6 rounded-[1.5rem] group focus-within:border-indigo-500/50 transition-all">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-focus-within:text-indigo-400 transition-colors">
          <User size={18} />
        </div>
        
        <div className="flex-1">
          <label className="block text-[8px] font-black uppercase tracking-[0.1em] text-white/20 mb-0.5">Your Identity</label>
          <div className="relative flex items-center">
            <input
              value={displayName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter display name..."
              className="bg-transparent border-none outline-none text-white text-sm font-bold w-full placeholder:text-white/10"
            />
            <Edit3 size={12} className="text-white/10 absolute right-0 pointer-events-none group-focus-within:text-indigo-400/50" />
          </div>
        </div>
      </div>

      {/* Connection Status Indicator */}
      <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Secure Link</span>
      </div>
    </div>
  );
}

export default SessionBar;