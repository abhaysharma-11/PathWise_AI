import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { ConnectionState } from '../types';

interface BackendStatusBadgeProps {
  state: ConnectionState;
  latencyMs: number | null;
  error: string | null;
  onRefresh: () => void;
  compact?: boolean;
}

export const BackendStatusBadge: React.FC<BackendStatusBadgeProps> = ({
  state,
  latencyMs,
  error,
  onRefresh,
  compact = false,
}) => {
  if (state === 'checking') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 shadow-sm animate-pulse">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        <span>Pinging API...</span>
      </div>
    );
  }

  if (state === 'connected') {
    return (
      <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-mono bg-emerald-950/50 text-emerald-300 border border-emerald-700/60 shadow-emerald-soft">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-semibold tracking-wide">Connected</span>
        {latencyMs !== null && (
          <span className="text-[11px] text-emerald-400/80 pl-1 border-l border-emerald-800/80">
            {latencyMs}ms
          </span>
        )}
        <button
          onClick={onRefresh}
          title="Re-check health"
          className="ml-1 p-0.5 text-emerald-400 hover:text-white transition-colors"
          aria-label="Refresh connection status"
        >
          <RefreshCw className="w-3 h-3 hover:rotate-180 transition-transform duration-300" />
        </button>
      </div>
    );
  }

  // Disconnected or Error
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-red-950/40 text-red-300 border border-red-800/50 shadow-sm">
      <span className="inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      <WifiOff className="w-3.5 h-3.5 text-red-400" />
      <span className="font-semibold tracking-wide">Offline</span>
      {!compact && error && (
        <span className="text-[11px] text-red-300/80 truncate max-w-[140px]" title={error}>
          (FastAPI unreachable)
        </span>
      )}
      <button
        onClick={onRefresh}
        title="Retry connection"
        className="ml-1 px-1.5 py-0.5 bg-red-900/60 hover:bg-red-800 text-red-200 rounded text-[10px] font-sans flex items-center gap-1 transition-colors"
      >
        <RefreshCw className="w-2.5 h-2.5" />
        Retry
      </button>
    </div>
  );
};
