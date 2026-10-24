import React from 'react';
import { RouteResponse, RouteDisplayMode } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';

interface RouteComparisonCardProps {
  shortestRoute: RouteResponse;
  accessibleRoute: RouteResponse;
  routeDisplayMode: RouteDisplayMode;
}

export const RouteComparisonCard: React.FC<RouteComparisonCardProps> = ({
  shortestRoute,
  accessibleRoute,
  routeDisplayMode,
}) => {
  const isIdentical = accessibleRoute.is_identical_to_shortest;
  const detourDistance = Math.max(
    0,
    Math.round(accessibleRoute.distance_meters - shortestRoute.distance_meters)
  );

  return (
    <div className="rounded-2xl bg-canvas-900 border border-surface-border p-3.5 shadow-2xl space-y-3 animate-fadeIn">
      {/* Header status */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-border/70">
        <div className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-300">
          {routeDisplayMode === 'accessible'
            ? 'Accessible Route Details'
            : routeDisplayMode === 'shortest'
            ? 'Shortest Route Details'
            : 'Route Comparison'}
        </div>

        {isIdentical ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            <span>Identical Path</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Step-Free Certified</span>
          </span>
        )}
      </div>

      {/* Mode A: ACCESSIBLE ONLY */}
      {routeDisplayMode === 'accessible' && (
        <div className="p-3 rounded-xl bg-canvas-950 border border-emerald-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-xs font-bold text-white font-mono">Step-Free Accessible Route</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
              {accessibleRoute.profile.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-surface-panel/60 p-2 rounded-lg border border-surface-border/60">
              <span className="text-slate-400 text-[10px]">DISTANCE</span>
              <div className="text-base font-bold text-emerald-300 mt-0.5">
                {accessibleRoute.distance_meters} m
              </div>
            </div>
            <div className="bg-surface-panel/60 p-2 rounded-lg border border-surface-border/60">
              <span className="text-slate-400 text-[10px]">EST. WALKING TIME</span>
              <div className="text-base font-bold text-white mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{accessibleRoute.estimated_duration_minutes} min</span>
              </div>
            </div>
          </div>

          <div className="pt-1.5 border-t border-surface-border/50 text-[11px]">
            {accessibleRoute.barriers_avoided.length > 0 ? (
              <div className="text-emerald-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{accessibleRoute.barriers_avoided.length} Obstacle(s) Safely Avoided (Stairs / Kerbs)</span>
              </div>
            ) : (
              <div className="text-slate-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Direct barrier-free corridor</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode B: SHORTEST ONLY */}
      {routeDisplayMode === 'shortest' && (
        <div className="p-3 rounded-xl bg-canvas-950 border border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <span className="text-xs font-bold text-white font-mono">Shortest Pedestrian Route</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
              DISTANCE PRIORITY
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-surface-panel/60 p-2 rounded-lg border border-surface-border/60">
              <span className="text-slate-400 text-[10px]">DISTANCE</span>
              <div className="text-base font-bold text-cyan-300 mt-0.5">
                {shortestRoute.distance_meters} m
              </div>
            </div>
            <div className="bg-surface-panel/60 p-2 rounded-lg border border-surface-border/60">
              <span className="text-slate-400 text-[10px]">EST. WALKING TIME</span>
              <div className="text-base font-bold text-white mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{shortestRoute.estimated_duration_minutes} min</span>
              </div>
            </div>
          </div>

          <div className="pt-1.5 border-t border-surface-border/50 text-[11px]">
            {shortestRoute.barriers_encountered.length > 0 ? (
              <div className="text-red-400 flex items-center gap-1 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{shortestRoute.barriers_encountered.length} Obstacle(s) Encountered on Path</span>
              </div>
            ) : (
              <div className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>No Known Obstacles Encountered</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode C: COMPARE BOTH */}
      {routeDisplayMode === 'compare' && (
        <div className="grid grid-cols-2 gap-2">
          {/* Shortest column */}
          <div className="p-2.5 rounded-xl bg-canvas-950 border border-cyan-500/30 space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
              <span>Shortest</span>
            </span>
            <div className="text-base font-extrabold text-white font-mono leading-none">
              {shortestRoute.distance_meters} m
            </div>
            <div className="text-[10px] text-slate-400">
              ~{shortestRoute.estimated_duration_minutes} min
            </div>
            <div className="text-[10px] pt-1 border-t border-surface-border/40">
              {shortestRoute.barriers_encountered.length > 0 ? (
                <span className="text-red-400 font-medium">
                  ⚠️ {shortestRoute.barriers_encountered.length} Obstacle(s)
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">No Obstacles</span>
              )}
            </div>
          </div>

          {/* Accessible column */}
          <div className="p-2.5 rounded-xl bg-canvas-950 border border-emerald-500/40 space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>Accessible</span>
            </span>
            <div className="text-base font-extrabold text-emerald-300 font-mono leading-none">
              {accessibleRoute.distance_meters} m
            </div>
            <div className="text-[10px] text-slate-400">
              ~{accessibleRoute.estimated_duration_minutes} min
            </div>
            <div className="text-[10px] pt-1 border-t border-surface-border/40">
              {accessibleRoute.barriers_avoided.length > 0 ? (
                <span className="text-emerald-400 font-medium">
                  ✓ {accessibleRoute.barriers_avoided.length} Avoided
                </span>
              ) : (
                <span className="text-slate-300 font-medium">Same Path</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Route Confidence & Missing Imagery Coverage Section */}
      {(() => {
        const activeConfidence =
          routeDisplayMode === 'shortest'
            ? shortestRoute.confidence
            : accessibleRoute.confidence;

        if (!activeConfidence) return null;

        const levelColor =
          activeConfidence.score >= 75
            ? 'text-emerald-400 bg-emerald-950/70 border-emerald-700/60'
            : activeConfidence.score >= 45
            ? 'text-amber-400 bg-amber-950/70 border-amber-700/60'
            : 'text-red-400 bg-red-950/70 border-red-700/60';

        return (
          <div className="p-3 rounded-xl bg-canvas-950 border border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Route Confidence
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${levelColor}`}
              >
                <span>{activeConfidence.score}/100</span>
                <span>• {activeConfidence.level}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
              <div className="bg-surface-panel/40 p-2 rounded border border-surface-border/40">
                <span className="text-slate-400 block">IMAGERY COVERAGE</span>
                <span className="text-white font-bold text-xs">
                  {activeConfidence.imagery_coverage_pct}%
                </span>
                <span className="text-slate-500 block text-[9px] mt-0.5">
                  {activeConfidence.segments_with_imagery}/{activeConfidence.total_segments} segs (&lt;90d)
                </span>
              </div>
              <div className="bg-surface-panel/40 p-2 rounded border border-surface-border/40">
                <span className="text-slate-400 block">NO RECENT IMAGERY</span>
                <span className="text-amber-300 font-bold text-xs">
                  {activeConfidence.segments_without_imagery}
                </span>
                <span className="text-slate-500 block text-[9px] mt-0.5">
                  {activeConfidence.segments_without_imagery === 0
                    ? 'All segments fresh'
                    : 'Unsurveyed segments'}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-mono leading-tight pt-1">
              {activeConfidence.formula_explanation}
            </div>

            <div className="text-[9px] text-slate-500 italic pt-1 border-t border-surface-border/40">
              * {activeConfidence.disclaimer}
            </div>
          </div>
        );
      })()}

      {/* Brief Honest Explanation */}
      <div className="p-2.5 rounded-xl bg-canvas-950 border border-surface-border text-slate-300 text-[11px] leading-relaxed flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          {isIdentical ? (
            <span>
              Both algorithms chose the identical path ({shortestRoute.distance_meters}m). No impassable stairs or kerb barriers exist along this corridor.
            </span>
          ) : routeDisplayMode === 'shortest' ? (
            <span>
              Follows direct pedestrian path ({shortestRoute.distance_meters}m), but encounters steep monumental stairs without ramp access.
            </span>
          ) : (
            <span>
              Step-free route adds +{detourDistance}m detour via certified ramped pathways to safely bypass monumental stairs and inaccessible kerbs.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
