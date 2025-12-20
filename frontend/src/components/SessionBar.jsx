import React from "react";

export function SessionBar({ sessionId, displayName, onNameChange }) {
  return (
    <div className="card session-bar">
      <div>
        <div className="label">Session</div>
        <div className="session-id">{sessionId || "..."}</div>
      </div>
      <div className="name-edit">
        <label>
          You:
          <input
            value={displayName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Display name"
          />
        </label>
      </div>
    </div>
  );
}
