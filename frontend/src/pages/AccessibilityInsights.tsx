import React from 'react';
import {
  ShieldCheck,
  Activity,
  Sparkles,
  Info,
} from 'lucide-react';
import { ComingSoonBanner } from '../components/ComingSoonBanner';

export const AccessibilityInsights: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
          <span>PATHWISE AI</span>
          <span>/</span>
          <span className="text-blue-400">Accessibility Insights</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Pedestrian Infrastructure & Accessibility Audits
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Urban sidewalk condition telemetry, curb ramp inventory, and compliance analytics.
        </p>
      </div>

      <ComingSoonBanner
        featureName="Accessibility Auditing & Municipal Telemetry"
        targetPhase={2}
        techStack="PostGIS / GeoPandas Sidewalk Auditing + OpenStreetMap Overpass API"
        description="Live municipal audit aggregation and dynamic crowdsource telemetry are scheduled for Phase 2. This interface previews the planned accessibility metrics and reporting dimensions. No fake city-wide statistics are fabricated."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-canvas-900 border border-surface-border p-6 space-y-4 shadow-geo-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Curb Ramp Compliance</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Measures intersection curb transitions, checking for slope compliance (&lt; 8.33% / 1:12 ADA max standard) and detectable tactile domes.
          </p>
          <div className="text-[11px] font-mono text-blue-400/80 bg-surface-panel p-2.5 rounded-lg border border-surface-border">
            Schema Field: <code className="text-white">curb_ramp_grade_pct</code>
          </div>
        </div>

        <div className="rounded-2xl bg-canvas-900 border border-surface-border p-6 space-y-4 shadow-geo-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Surface Quality Index</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Evaluates walkway materials (smooth poured concrete vs cobblestone / cracked asphalt) and vertical heaves affecting rolling mobility.
          </p>
          <div className="text-[11px] font-mono text-emerald-400/80 bg-surface-panel p-2.5 rounded-lg border border-surface-border">
            Schema Field: <code className="text-white">surface_smoothness</code>
          </div>
        </div>

        <div className="rounded-2xl bg-canvas-900 border border-surface-border p-6 space-y-4 shadow-geo-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Nighttime Illumination</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Estimates streetlight coverage along pedestrian corridors to assist low-vision pedestrians and optimize nighttime security.
          </p>
          <div className="text-[11px] font-mono text-cyan-400/80 bg-surface-panel p-2.5 rounded-lg border border-surface-border">
            Schema Field: <code className="text-white">lighting_score (0.0-1.0)</code>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-canvas-900 border border-surface-border p-6 shadow-geo-card">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            Explore sample pedestrian micro-segment attributes directly in the Phase 1 Preview Area on the <a href="/" className="text-cyan-400 underline">Overview</a> dashboard.
          </span>
        </div>
      </div>
    </div>
  );
};
