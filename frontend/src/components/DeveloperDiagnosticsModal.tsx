import React, { useState, useEffect } from 'react';
import {
  X,
  Terminal,
  Activity,
  Server,
  Layers,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { fetchSystemDiagnostics } from '../services/api';
import { SystemDiagnosticsResponse, RouteResponse, SegmentFeature } from '../types';

interface DeveloperDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortestRoute: RouteResponse | null;
  accessibleRoute: RouteResponse | null;
  segments: SegmentFeature[];
}

export const DeveloperDiagnosticsModal: React.FC<DeveloperDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  shortestRoute,
  accessibleRoute,
  segments,
}) => {
  const [diagnostics, setDiagnostics] = useState<SystemDiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'system' | 'routes' | 'segments'>('system');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchSystemDiagnostics()
        .then((data) => setDiagnostics(data))
        .catch(() => setDiagnostics(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl max-h-[85vh] bg-canvas-900 border border-surface-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-canvas-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-panel border border-surface-border flex items-center justify-center">
              <Terminal className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <span>Developer & Geospatial Diagnostics</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Technical telemetry, NetworkX engine state, and raw routing payloads
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="px-6 pt-3 border-b border-surface-border/60 flex gap-4 text-xs font-mono">
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-2.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'system'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>System & Engine</span>
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`pb-2.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'routes'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Route Payloads JSON</span>
          </button>
          <button
            onClick={() => setActiveTab('segments')}
            className={`pb-2.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'segments'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Network Segments ({segments.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {activeTab === 'system' && (
            <div className="space-y-4">
              {loading ? (
                <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Loading telemetry...</span>
                </div>
              ) : diagnostics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                  <div className="p-3 bg-canvas-950 rounded-xl border border-surface-border space-y-1">
                    <span className="text-slate-500 text-[10px]">BACKEND SERVICE</span>
                    <div className="text-white font-bold">{diagnostics.service} v{diagnostics.api_version}</div>
                  </div>
                  <div className="p-3 bg-canvas-950 rounded-xl border border-surface-border space-y-1">
                    <span className="text-slate-500 text-[10px]">ENVIRONMENT / PYTHON</span>
                    <div className="text-emerald-400 font-bold">Python {diagnostics.python_version}</div>
                  </div>
                  <div className="p-3 bg-canvas-950 rounded-xl border border-surface-border space-y-1">
                    <span className="text-slate-500 text-[10px]">UPTIME</span>
                    <div className="text-cyan-400 font-bold">{diagnostics.uptime_seconds.toFixed(1)}s</div>
                  </div>
                  <div className="p-3 bg-canvas-950 rounded-xl border border-surface-border space-y-1">
                    <span className="text-slate-500 text-[10px]">CORS ALLOWED ORIGINS</span>
                    <div className="text-slate-300 text-[11px] truncate">{diagnostics.cors_allowed_origins.join(', ')}</div>
                  </div>
                  <div className="p-3 bg-canvas-950 rounded-xl border border-surface-border space-y-1 md:col-span-2">
                    <span className="text-slate-500 text-[10px]">ROUTING & MAPPING ENGINES</span>
                    <div className="text-slate-200 text-xs">
                      NetworkX (Dijkstra) • OpenStreetMap Standard Tiles • Leaflet 1.9.4 • Jaipur Ram Niwas Precinct (14 Nodes / 17 Edges)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-950/20 border border-red-800/40 text-red-300 rounded-xl">
                  Unable to connect to /api/diagnostics endpoint.
                </div>
              )}
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Computed Routes Payload</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify({ shortestRoute, accessibleRoute }, null, 2)
                    )
                  }
                  className="px-2.5 py-1 bg-surface-panel hover:bg-surface-hover border border-surface-border rounded text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <pre className="p-4 bg-canvas-950 border border-surface-border rounded-xl text-[11px] text-cyan-300 overflow-x-auto max-h-96">
                {shortestRoute || accessibleRoute
                  ? JSON.stringify({ shortestRoute, accessibleRoute }, null, 2)
                  : '// No route computed yet. Calculate a route on the map to inspect raw payload.'}
              </pre>
            </div>
          )}

          {activeTab === 'segments' && (
            <div className="space-y-2 font-mono">
              <div className="text-xs text-slate-400 pb-1">
                Audited Graph Segments ({segments.length} bidirectional connections)
              </div>
              <div className="border border-surface-border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-canvas-950 text-slate-400 border-b border-surface-border sticky top-0">
                    <tr>
                      <th className="p-2.5">Segment ID</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Surface</th>
                      <th className="p-2.5">Incline</th>
                      <th className="p-2.5">Curb Ramp</th>
                      <th className="p-2.5">Stairs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/40 text-slate-300">
                    {segments.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-hover/30">
                        <td className="p-2.5 font-bold text-cyan-400">{s.id}</td>
                        <td className="p-2.5">{s.name || s.id}</td>
                        <td className="p-2.5">{s.surface}</td>
                        <td className="p-2.5">{s.incline_pct}%</td>
                        <td className="p-2.5">
                          <span className={s.curb_ramp === 'yes' ? 'text-emerald-400' : 'text-red-400'}>
                            {s.curb_ramp}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {s.has_stairs ? (
                            <span className="text-red-400 font-bold">YES</span>
                          ) : (
                            <span className="text-slate-500">NO</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
