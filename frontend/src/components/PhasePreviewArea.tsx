import React, { useState } from 'react';
import {
  Terminal,
  Database,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { HealthResponse, PedestrianSegment } from '../types';
import { API_BASE_URL } from '../services/api';

interface PhasePreviewAreaProps {
  healthData: HealthResponse | null;
  latencyMs: number | null;
  connectionState: 'idle' | 'checking' | 'connected' | 'disconnected';
  onRefreshHealth: () => void;
}

// Embedded sample segment preview representing sample-data/pedestrian_segments.geojson
const sampleSegments: PedestrianSegment[] = [
  {
    segment_id: "seg-001",
    street_name: "5th Avenue (East Sidewalk)",
    surface: "smooth_concrete",
    width_meters: 3.2,
    curb_ramp_installed: true,
    curb_ramp_grade_pct: 4.5,
    tactile_paving: true,
    lighting_score: 0.88,
    incline_pct: 1.2,
    accessible_crossing: true,
    audible_signals: true,
    safety_score_preliminary: 0.94,
  },
  {
    segment_id: "seg-002",
    street_name: "E 34th Street (North Sidewalk)",
    surface: "brick_pavers",
    width_meters: 1.8,
    curb_ramp_installed: true,
    curb_ramp_grade_pct: 7.8,
    tactile_paving: false,
    lighting_score: 0.65,
    incline_pct: 3.4,
    accessible_crossing: false,
    audible_signals: false,
    safety_score_preliminary: 0.68,
  },
  {
    segment_id: "seg-003",
    street_name: "Madison Avenue Crossing",
    surface: "asphalt_crosswalk",
    width_meters: 4.0,
    curb_ramp_installed: true,
    curb_ramp_grade_pct: 5.0,
    tactile_paving: true,
    lighting_score: 0.92,
    incline_pct: 0.5,
    accessible_crossing: true,
    audible_signals: true,
    safety_score_preliminary: 0.96,
  },
];

export const PhasePreviewArea: React.FC<PhasePreviewAreaProps> = ({
  healthData,
  latencyMs,
  connectionState,
  onRefreshHealth,
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'sample-data' | 'roadmap'>('api');
  const [selectedSegment, setSelectedSegment] = useState<PedestrianSegment>(sampleSegments[0]);
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    if (healthData) {
      navigator.clipboard.writeText(JSON.stringify(healthData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="mt-10 rounded-2xl bg-canvas-900 border border-surface-border p-6 lg:p-8 shadow-geo-card">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              PHASE 1 FOUNDATION PREVIEW
            </span>
            <span className="text-xs text-slate-400 font-mono">Live Architectural Verification</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            System Telemetry & Geodata Infrastructure
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real verification of backend endpoints, CORS connectivity, and Phase 2/3 pedestrian schemas.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-canvas-950 p-1 rounded-xl border border-surface-border self-start">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'api'
                ? 'bg-surface-panel text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Health Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('sample-data')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'sample-data'
                ? 'bg-surface-panel text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Pedestrian GeoJSON</span>
          </button>

          <button
            onClick={() => setActiveTab('roadmap')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'roadmap'
                ? 'bg-surface-panel text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Phase Roadmap</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Live API Health Telemetry */}
      {activeTab === 'api' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Live JSON payload viewer */}
          <div className="lg:col-span-2 rounded-xl bg-canvas-950 border border-surface-border overflow-hidden flex flex-col">
            <div className="bg-surface-panel/80 px-4 py-3 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
                <span className="text-slate-300 font-semibold">GET /api/health</span>
                <span className="text-slate-500">→</span>
                <span className="text-slate-400">{API_BASE_URL}/api/health</span>
              </div>

              <div className="flex items-center gap-2">
                {connectionState === 'connected' && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                    HTTP 200 OK
                  </span>
                )}
                {healthData && (
                  <button
                    onClick={handleCopyJson}
                    className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                    title="Copy response JSON"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 font-mono text-xs overflow-x-auto flex-1 bg-canvas-950">
              {connectionState === 'connected' && healthData ? (
                <pre className="text-cyan-300/90 leading-relaxed">
                  {JSON.stringify(healthData, null, 2)}
                </pre>
              ) : connectionState === 'checking' ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="inline-block animate-spin text-cyan-400 mb-2">⏳</div>
                  <p>Querying backend at {API_BASE_URL}/api/health...</p>
                </div>
              ) : (
                <div className="py-10 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <div className="text-slate-300 font-semibold text-sm">
                    Backend Not Responding at {API_BASE_URL}
                  </div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Start the FastAPI backend with:
                    <br />
                    <code className="text-cyan-300 bg-surface-panel px-2 py-1 rounded inline-block mt-2">
                      .venv\Scripts\uvicorn app.main:app --reload
                    </code>
                  </p>
                  <button
                    onClick={onRefreshHealth}
                    className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                  >
                    Retry Health Check
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Connection Metrics */}
          <div className="space-y-4">
            <div className="rounded-xl bg-canvas-950 border border-surface-border p-4 space-y-3">
              <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Telemetry Metrics
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-surface-border/60">
                  <span className="text-slate-400">Connection Status</span>
                  <span className={`font-mono font-semibold ${
                    connectionState === 'connected' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {connectionState.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-surface-border/60">
                  <span className="text-slate-400">Round-Trip Latency</span>
                  <span className="font-mono text-cyan-300">
                    {latencyMs !== null ? `${latencyMs} ms` : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-surface-border/60">
                  <span className="text-slate-400">Target Phase</span>
                  <span className="font-mono text-slate-200">
                    {healthData?.phase ? `Phase ${healthData.phase}` : 'Phase 1'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-surface-border/60">
                  <span className="text-slate-400">Environment</span>
                  <span className="font-mono text-slate-200">
                    {healthData?.environment || 'development'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Backend Uptime</span>
                  <span className="font-mono text-slate-200">
                    {healthData?.uptime_seconds ? `${healthData.uptime_seconds}s` : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-surface-card border border-surface-border p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-2">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>CORS & Gateway Security</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                FastAPI configured with restricted origins (<code className="text-cyan-300">localhost:5173</code>, <code className="text-cyan-300">localhost:5174</code>) driven by <code className="text-slate-300">CORS_ORIGINS</code> env var.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Pedestrian GeoJSON Sample Viewer */}
      {activeTab === 'sample-data' && (
        <div className="mt-6 space-y-4">
          <p className="text-xs text-slate-400">
            Phase 1 provides verified structural schemas in <code className="text-cyan-300">sample-data/pedestrian_segments.geojson</code> to drive accessibility-weighted routing graph algorithms in Phase 2.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Segment Selector List */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                Sample Pedestrian Micro-Segments
              </div>
              {sampleSegments.map((seg) => (
                <button
                  key={seg.segment_id}
                  onClick={() => setSelectedSegment(seg)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                    selectedSegment.segment_id === seg.segment_id
                      ? 'bg-surface-panel border-cyan-500/50 shadow-sm text-white'
                      : 'bg-canvas-950 border-surface-border text-slate-400 hover:text-slate-200 hover:bg-surface-hover/50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-200">{seg.street_name}</div>
                    <div className="font-mono text-[10px] text-cyan-400/80 mt-0.5">
                      ID: {seg.segment_id} • Surface: {seg.surface}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${
                    selectedSegment.segment_id === seg.segment_id ? 'text-cyan-400' : 'text-slate-600'
                  }`} />
                </button>
              ))}
            </div>

            {/* Segment Attribute Inspector */}
            <div className="lg:col-span-2 rounded-xl bg-canvas-950 border border-surface-border p-5">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {selectedSegment.street_name}
                  </h4>
                  <span className="text-[11px] font-mono text-cyan-400">
                    Segment ID: {selectedSegment.segment_id}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-slate-400">Preliminary Safety Index</div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {(selectedSegment.safety_score_preliminary * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-surface-panel/60 p-3 rounded-lg border border-surface-border/60">
                  <div className="text-slate-400 text-[11px]">Sidewalk Width</div>
                  <div className="font-mono font-semibold text-white mt-0.5">{selectedSegment.width_meters} meters</div>
                </div>

                <div className="bg-surface-panel/60 p-3 rounded-lg border border-surface-border/60">
                  <div className="text-slate-400 text-[11px]">Curb Ramp Grade</div>
                  <div className="font-mono font-semibold text-white mt-0.5">
                    {selectedSegment.curb_ramp_installed ? `${selectedSegment.curb_ramp_grade_pct}%` : 'None'}
                  </div>
                </div>

                <div className="bg-surface-panel/60 p-3 rounded-lg border border-surface-border/60">
                  <div className="text-slate-400 text-[11px]">Tactile Paving</div>
                  <div className={`font-mono font-semibold mt-0.5 ${
                    selectedSegment.tactile_paving ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {selectedSegment.tactile_paving ? 'Installed' : 'Missing'}
                  </div>
                </div>

                <div className="bg-surface-panel/60 p-3 rounded-lg border border-surface-border/60">
                  <div className="text-slate-400 text-[11px]">Lighting Estimate</div>
                  <div className="font-mono font-semibold text-white mt-0.5">
                    {(selectedSegment.lighting_score * 100).toFixed(0)} / 100
                  </div>
                </div>

                <div className="bg-surface-panel/60 p-3 rounded-lg border border-surface-border/60">
                  <div className="text-slate-400 text-[11px]">Incline Slope</div>
                  <div className="font-mono font-semibold text-white mt-0.5">{selectedSegment.incline_pct}%</div>
                </div>

                <div className="bg-surface-panel/60 p-3 rounded-lg border border-surface-border/60">
                  <div className="text-slate-400 text-[11px]">Audible Signals</div>
                  <div className={`font-mono font-semibold mt-0.5 ${
                    selectedSegment.audible_signals ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {selectedSegment.audible_signals ? 'Yes (Chime+Vibe)' : 'No'}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-surface-card border border-surface-border text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Phase 2 Usage: </span>
                These attributes will directly weight the graph edge impedance in OSMnx/NetworkX to compute routes that favor ramps &lt; 5%, smooth surfaces, and low-incline sidewalks.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Phase Roadmap */}
      {activeTab === 'roadmap' && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phase 1 Box */}
            <div className="p-5 rounded-xl bg-canvas-950 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  PHASE 1 • ACTIVE
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-bold text-white text-base">Full-Stack Foundation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                FastAPI async server, real GET /api/health validation, CORS authorization, React 18 + Vite + Tailwind client, and geodata schemas.
              </p>
              <div className="pt-2 text-[11px] font-mono text-emerald-400">
                ✓ Fully implemented & validated
              </div>
            </div>

            {/* Phase 2 Box */}
            <div className="p-5 rounded-xl bg-canvas-950 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                  PHASE 2 • SCHEDULED
                </span>
                <span className="text-[11px] font-mono text-slate-500">Coming Soon</span>
              </div>
              <h3 className="font-bold text-white text-base">Graph Routing & Maps</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Integration of Leaflet + OpenStreetMap canvas, NetworkX and OSMnx graph cost functions customized for step-free and low-slope journeys.
              </p>
              <div className="pt-2 text-[11px] font-mono text-cyan-400/80">
                ⏳ Unimplemented in Phase 1
              </div>
            </div>

            {/* Phase 3 Box */}
            <div className="p-5 rounded-xl bg-canvas-950 border border-surface-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                  PHASE 3 • SCHEDULED
                </span>
                <span className="text-[11px] font-mono text-slate-500">Coming Soon</span>
              </div>
              <h3 className="font-bold text-white text-base">StreetVision Hazard CV</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pretrained computer vision edge detection pipeline for construction scaffolds, broken pavement, and transient sidewalk obstructions.
              </p>
              <div className="pt-2 text-[11px] font-mono text-purple-400/80">
                ⏳ Unimplemented in Phase 1
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
