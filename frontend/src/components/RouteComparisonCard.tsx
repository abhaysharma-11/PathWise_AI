import React, { useState } from 'react';
import { RouteResponse, RouteDisplayMode } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronDown,
  Info,
  Compass,
} from 'lucide-react';

interface RouteComparisonCardProps {
  shortestRoute: RouteResponse;
  accessibleRoute: RouteResponse;
  routeDisplayMode: RouteDisplayMode;
  onSetDisplayMode?: (mode: RouteDisplayMode) => void;
}

export const RouteComparisonCard: React.FC<RouteComparisonCardProps> = ({
  shortestRoute,
  accessibleRoute,
  routeDisplayMode,
  onSetDisplayMode,
}) => {
  const [insightsExpanded, setInsightsExpanded] = useState<boolean>(false);

  const isIdentical = accessibleRoute.is_identical_to_shortest;
  const detourDistance = Math.max(
    0,
    Math.round(accessibleRoute.distance_meters - shortestRoute.distance_meters)
  );

  const confidence = accessibleRoute.confidence || shortestRoute.confidence;

  const confidenceBadgeColor =
    !confidence
      ? 'text-slate-400 bg-slate-900 border-slate-700'
      : confidence.score >= 75
      ? 'text-emerald-400 bg-emerald-950/70 border-emerald-700/60'
      : confidence.score >= 45
      ? 'text-amber-400 bg-amber-950/70 border-amber-700/60'
      : 'text-red-400 bg-red-950/70 border-red-700/60';

  return (
    <div className="rounded-2xl bg-canvas-900 border border-surface-border p-3.5 shadow-2xl space-y-3 animate-fadeIn">
      {/* Three Functional View Tabs: Accessible Route | Shortest Route | Compare Both */}
      {onSetDisplayMode && (
        <div className="grid grid-cols-3 gap-1 bg-canvas-950 p-1 rounded-xl border border-surface-border text-xs font-mono">
          <button
            type="button"
            onClick={() => onSetDisplayMode('accessible')}
            className={`py-1.5 px-1 rounded-lg transition-all text-center font-medium ${
              routeDisplayMode === 'accessible'
                ? 'bg-emerald-500 text-black font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Show only the accessible route in emerald green"
          >
            <span>Accessible</span>
          </button>

          <button
            type="button"
            onClick={() => onSetDisplayMode('shortest')}
            className={`py-1.5 px-1 rounded-lg transition-all text-center font-medium ${
              routeDisplayMode === 'shortest'
                ? 'bg-cyan-500 text-black font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Show only the shortest pedestrian route in cyan"
          >
            <span>Shortest</span>
          </button>

          <button
            type="button"
            onClick={() => onSetDisplayMode('compare')}
            className={`py-1.5 px-1 rounded-lg transition-all text-center font-medium ${
              routeDisplayMode === 'compare'
                ? 'bg-surface-panel text-white border border-surface-border font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Display both routes for comparative analysis"
          >
            <span>Compare Both</span>
          </button>
        </div>
      )}

      {/* Header status */}
      <div className="flex items-center justify-between pb-1.5 border-b border-surface-border/70">
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

      {/* Identical Route Notification (Mentor Part 4 exact requirement) */}
      {isIdentical && (
        <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-600/40 text-cyan-200 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Both routes are identical for this journey based on currently available accessibility evidence.
          </p>
        </div>
      )}

      {/* Route Statistics Grid */}
      <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
        {/* Shortest Distance */}
        <div
          className={`p-2 rounded-xl border ${
            routeDisplayMode === 'shortest' || routeDisplayMode === 'compare'
              ? 'bg-cyan-950/20 border-cyan-500/40'
              : 'bg-canvas-950 border-surface-border/60'
          }`}
        >
          <span className="text-[10px] text-cyan-400 font-semibold block leading-tight">SHORTEST</span>
          <div className="text-sm font-extrabold text-white mt-0.5">
            {shortestRoute.distance_meters} m
          </div>
          <span className="text-[9px] text-slate-400 block mt-0.5 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            <span>~{shortestRoute.estimated_duration_minutes}m</span>
          </span>
        </div>

        {/* Accessible Distance */}
        <div
          className={`p-2 rounded-xl border ${
            routeDisplayMode === 'accessible' || routeDisplayMode === 'compare'
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : 'bg-canvas-950 border-surface-border/60'
          }`}
        >
          <span className="text-[10px] text-emerald-400 font-semibold block leading-tight">ACCESSIBLE</span>
          <div className="text-sm font-extrabold text-white mt-0.5">
            {accessibleRoute.distance_meters} m
          </div>
          <span className="text-[9px] text-slate-400 block mt-0.5 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            <span>~{accessibleRoute.estimated_duration_minutes}m</span>
          </span>
        </div>

        {/* Detour Distance */}
        <div className="p-2 rounded-xl bg-canvas-950 border border-surface-border/60">
          <span className="text-[10px] text-slate-400 font-semibold block leading-tight">DETOUR</span>
          <div
            className={`text-sm font-extrabold mt-0.5 ${
              detourDistance > 0 ? 'text-amber-300' : 'text-slate-300'
            }`}
          >
            {detourDistance > 0 ? `+${detourDistance} m` : '0 m'}
          </div>
          <span className="text-[9px] text-slate-500 block mt-0.5">
            {detourDistance > 0 ? 'Safety bypass' : 'Direct path'}
          </span>
        </div>
      </div>

      {/* Barriers Comparison */}
      <div className="space-y-1.5 pt-1 text-[11px]">
        {/* Barriers on Shortest Route */}
        {shortestRoute.barriers_encountered.length > 0 ? (
          <div className="p-2 rounded-xl bg-red-950/20 border border-red-500/30 text-red-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-red-400">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{shortestRoute.barriers_encountered.length} Barrier(s) on Shortest Route</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[10px] text-red-200 font-mono">
              {shortestRoute.barriers_encountered.map((b, i) => (
                <li key={i}>{b.description}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-2 rounded-xl bg-canvas-950 border border-surface-border/50 text-slate-300 flex items-center gap-1.5 text-[10px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Shortest route has no known physical barriers</span>
          </div>
        )}

        {/* Barriers Avoided by Accessible Route */}
        {accessibleRoute.barriers_avoided.length > 0 && (
          <div className="p-2 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{accessibleRoute.barriers_avoided.length} Barrier(s) Safely Avoided</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[10px] text-emerald-200 font-mono">
              {accessibleRoute.barriers_avoided.map((b, i) => (
                <li key={i}>{b.description}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* WHY THIS ROUTE? (Mentor Part 6 requirement) */}
      <div className="p-2.5 rounded-xl bg-canvas-950 border border-surface-border space-y-1">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
          <Info className="w-3 h-3 text-cyan-400" />
          <span>Why This Route?</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed font-sans">
          {accessibleRoute.explanation}
        </p>
      </div>

      {/* =========================================================================
          YOUR ROUTE INSIGHTS (Mentor Part 7 requirement)
          Compact integrated panel in Route Explorer
          ========================================================================= */}
      <div className="rounded-xl bg-canvas-950 border border-surface-border overflow-hidden">
        <button
          type="button"
          onClick={() => setInsightsExpanded(!insightsExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-surface-hover/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white">
              Your Route Insights
            </span>
          </div>
          <div className="flex items-center gap-2">
            {confidence && (
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${confidenceBadgeColor}`}>
                {confidence.score}/100 • {confidence.level}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                insightsExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {insightsExpanded && (
          <div className="p-3 border-t border-surface-border/60 space-y-2.5 text-xs animate-fadeIn">
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              {/* Metric 1: Barriers Avoided */}
              <div className="p-2 rounded-lg bg-surface-panel/40 border border-surface-border/50">
                <span className="text-slate-400 text-[10px] block">BARRIERS AVOIDED</span>
                <span className="text-emerald-300 font-bold text-sm block mt-0.5">
                  {accessibleRoute.barriers_avoided.length}
                </span>
                <span className="text-[9px] text-slate-500">
                  {accessibleRoute.barriers_avoided.length > 0 ? 'Safely bypassed' : 'None on path'}
                </span>
              </div>

              {/* Metric 2: Additional Route Distance */}
              <div className="p-2 rounded-lg bg-surface-panel/40 border border-surface-border/50">
                <span className="text-slate-400 text-[10px] block">ADDITIONAL DISTANCE</span>
                <span className="text-white font-bold text-sm block mt-0.5">
                  +{detourDistance} m
                </span>
                <span className="text-[9px] text-slate-500">
                  {detourDistance > 0 ? 'Detour around barriers' : 'Same as shortest'}
                </span>
              </div>

              {/* Metric 3: Route Evidence Confidence */}
              <div className="p-2 rounded-lg bg-surface-panel/40 border border-surface-border/50">
                <span className="text-slate-400 text-[10px] block">EVIDENCE CONFIDENCE</span>
                <span className="text-cyan-300 font-bold text-sm block mt-0.5">
                  {confidence ? `${confidence.score}/100` : 'N/A'}
                </span>
                <span className="text-[9px] text-slate-500">
                  {confidence?.level || 'Audited ground truth'}
                </span>
              </div>

              {/* Metric 4: Segments Without Recent Imagery */}
              <div className="p-2 rounded-lg bg-surface-panel/40 border border-surface-border/50">
                <span className="text-slate-400 text-[10px] block">MISSING RECENT IMAGERY</span>
                <span className={`font-bold text-sm block mt-0.5 ${
                  (confidence?.segments_without_imagery || 0) > 0 ? 'text-amber-300' : 'text-emerald-400'
                }`}>
                  {confidence?.segments_without_imagery || 0}
                </span>
                <span className="text-[9px] text-slate-500">
                  {(confidence?.segments_without_imagery || 0) > 0 ? 'Lacks imagery <90d' : 'All segments surveyed'}
                </span>
              </div>
            </div>

            {/* Formula Explanation & Disclaimer */}
            {confidence && (
              <div className="p-2 rounded-lg bg-surface-panel/30 border border-surface-border/40 text-[10px] font-mono text-slate-400 space-y-1">
                <div>{confidence.formula_explanation}</div>
                <div className="text-[9px] text-slate-500 italic pt-1 border-t border-surface-border/30">
                  * {confidence.disclaimer}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
