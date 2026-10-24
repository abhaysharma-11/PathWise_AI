import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
  Eye,
  Info,
} from 'lucide-react';
import { ObstacleFeature } from '../types';

interface ObstacleDetailCardProps {
  obstacle: ObstacleFeature;
  onClose: () => void;
  onHighlightSegment?: (segmentId: string) => void;
}

export const ObstacleDetailCard: React.FC<ObstacleDetailCardProps> = ({
  obstacle,
  onClose,
  onHighlightSegment,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'streetvision'>('details');

  const isCritical = obstacle.filterCategory === 'critical';
  const isCaution = obstacle.filterCategory === 'caution';
  const isAccessible = obstacle.filterCategory === 'accessible';

  const badgeBg = isCritical
    ? 'bg-red-500/10 text-red-400 border-red-500/40'
    : isCaution
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40';

  return (
    <div className="rounded-2xl bg-canvas-900 border border-surface-border shadow-2xl overflow-hidden animate-fadeIn transition-all">
      {/* Top Banner / Category Header */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b border-surface-border/80"
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: obstacle.color,
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase border flex items-center gap-1.5 ${badgeBg}`}
          >
            {isCritical && <ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
            {isCaution && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
            {isAccessible && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{obstacle.label}</span>
          </span>

          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            {obstacle.severity}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Tab buttons */}
          <div className="flex bg-canvas-950 p-0.5 rounded-lg border border-surface-border text-xs">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                activeTab === 'details'
                  ? 'bg-surface-panel text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Audit Details
            </button>
            <button
              onClick={() => setActiveTab('streetvision')}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] flex items-center gap-1 transition-colors ${
                activeTab === 'streetvision'
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-cyan-400'
              }`}
            >
              <Camera className="w-3 h-3 text-cyan-400" />
              <span>StreetVision</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-hover transition-colors ml-1"
            title="Close Obstacle Details"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Content: Details */}
      {activeTab === 'details' && (
        <div className="p-4 space-y-3.5 text-xs">
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>{obstacle.title}</span>
            </h4>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              {obstacle.description}
            </p>
          </div>

          {/* Key Metric Badges */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="bg-canvas-950 p-2.5 rounded-xl border border-surface-border">
              <span className="text-slate-500 uppercase text-[10px] block">Surface Type</span>
              <span className="text-slate-200 font-semibold capitalize mt-0.5 block">
                {obstacle.surface.replace('_', ' ')}
              </span>
            </div>
            <div className="bg-canvas-950 p-2.5 rounded-xl border border-surface-border">
              <span className="text-slate-500 uppercase text-[10px] block">Incline Gradient</span>
              <span className={`font-semibold mt-0.5 block ${obstacle.inclinePct > 8.33 ? 'text-red-400' : 'text-slate-200'}`}>
                {obstacle.inclinePct}% {obstacle.inclinePct > 8.33 && '(> ADA 8.3%)'}
              </span>
            </div>
          </div>

          {/* Mobility Impact Box */}
          <div
            className={`p-3 rounded-xl border space-y-1 ${
              isCritical
                ? 'bg-red-950/20 border-red-800/40 text-red-200'
                : isCaution
                ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
            }`}
          >
            <div className="font-semibold text-[11px] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Accessibility Impact</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300 font-sans">
              {obstacle.impact}
            </p>
          </div>

          {/* Road Segment & Verification Footer */}
          <div className="pt-2 border-t border-surface-border/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Segment:</span>
              <button
                onClick={() => onHighlightSegment && onHighlightSegment(obstacle.segmentId)}
                className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>{obstacle.segmentName}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {obstacle.isVerified ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>On-Ground Verified</span>
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Unverified Surface</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: StreetVision AI Preview (Phase 3 Preparedness) */}
      {activeTab === 'streetvision' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>StreetVision Imagery Detection</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
              Phase 3 Preview
            </span>
          </div>

          {/* Simulated Street View Camera Frame with AI Bounding Box */}
          <div className="relative h-44 rounded-xl overflow-hidden border border-cyan-500/40 bg-canvas-950 flex flex-col justify-between p-3 select-none">
            {/* Viewport Overlay Elements */}
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-mono text-cyan-400/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur">
                REC • CAM-01 JAIPUR
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded backdrop-blur">
                {obstacle.location.lat.toFixed(4)}°N, {obstacle.location.lon.toFixed(4)}°E
              </span>
            </div>

            {/* Simulated Street View Graphical Backdrop */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#22D3EE_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* AI Bounding Box Graphic */}
            <div className="relative my-auto mx-auto w-3/4 h-24 border-2 border-dashed border-cyan-400 bg-cyan-500/10 rounded-lg flex flex-col justify-between p-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500 text-black">
                  {obstacle.label}
                </span>
                <span className="text-[9px] font-mono text-cyan-300 bg-black/70 px-1 rounded">
                  CONF: 94.8%
                </span>
              </div>
              <div className="text-[10px] text-slate-300 font-mono text-center">
                [ROI: {obstacle.segmentId}] • Incline {obstacle.inclinePct}%
              </div>
            </div>

            {/* Bottom Camera Metadata */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 z-10">
              <span>StreetVision Model: YOLOv8-PedSafe</span>
              <span>SC-02 Architecture Ready</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-canvas-950 border border-surface-border text-[11px] text-slate-400 leading-relaxed font-sans">
            <span className="text-slate-300 font-medium">Integration Readiness:</span> Once automated street imagery ingestion is activated in Phase 3, physical road hazards are identified from Google Street View & ground imagery, generating instant geometric accessibility scores.
          </div>
        </div>
      )}
    </div>
  );
};
