import React, { useState, useEffect } from 'react';
import {
  VisionDetection,
  BarrierCategory,
  VerificationStatus,
} from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Cpu,
  MapPin,
  Check,
  Edit3,
  HelpCircle,
  ArrowRight,
  Bookmark,
} from 'lucide-react';

interface StreetVisionInspectorProps {
  detection: VisionDetection | null;
  onUpdateDetection: (
    detectionId: string,
    update: {
      barrier_category?: BarrierCategory;
      verification_status?: VerificationStatus;
      notes?: string;
    }
  ) => Promise<void>;
  onOpenSegmentMatching: (detection: VisionDetection) => void;
  isUpdating: boolean;
}

export const StreetVisionInspector: React.FC<StreetVisionInspectorProps> = ({
  detection,
  onUpdateDetection,
  onOpenSegmentMatching,
  isUpdating,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BarrierCategory>('stairs');
  const [notes, setNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (detection) {
      if (detection.barrier_category) {
        setSelectedCategory(detection.barrier_category);
      }
      setNotes(detection.notes || '');
      setIsSaved(false);
    }
  }, [detection]);

  if (!detection) {
    return (
      <div className="rounded-2xl bg-canvas-900 border border-surface-border p-6 text-center text-slate-400 space-y-3">
        <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
        <div className="text-sm font-semibold text-slate-300">No Detection Selected</div>
        <p className="text-xs max-w-xs mx-auto">
          Click on any bounding box overlay in the viewport to review its confidence, accessibility impact, and verify or correct its category.
        </p>
      </div>
    );
  }

  const handleConfirm = async () => {
    await onUpdateDetection(detection.id, {
      verification_status: 'human_verified',
      barrier_category: selectedCategory,
      notes: notes.trim() || undefined,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleReject = async () => {
    await onUpdateDetection(detection.id, {
      verification_status: 'rejected',
      notes: notes.trim() || 'Rejected by surveyor as false positive.',
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const getStatusBadge = () => {
    if (detection.verification_status === 'human_verified') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Human Verified</span>
        </span>
      );
    }
    if (detection.verification_status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-950/80 text-red-300 border border-red-700/60">
          <XCircle className="w-3.5 h-3.5" />
          <span>Rejected / Dismissed</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>AI Suggested</span>
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-canvas-900 border border-surface-border p-5 space-y-4 shadow-geo-card">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-surface-border">
        <div>
          <div className="text-[10px] font-mono text-slate-400">DETECTION ID: {detection.id}</div>
          <h3 className="text-base font-bold text-white tracking-tight capitalize mt-0.5">
            {detection.label}
          </h3>
        </div>
        {getStatusBadge()}
      </div>

      {/* Model & Confidence telemetry */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-canvas-950 border border-surface-border">
          <div className="text-[10px] text-slate-400 font-mono">CONFIDENCE</div>
          <div className="text-sm font-bold text-white mt-0.5">
            {Math.round(detection.confidence * 100)}%
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-canvas-950 border border-surface-border">
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <Cpu className="w-3 h-3 text-purple-400" />
            <span>MODEL</span>
          </div>
          <div className="text-xs font-mono text-slate-200 mt-1 truncate" title={detection.model_id}>
            {detection.model_id}
          </div>
        </div>
      </div>

      {/* Accessibility Impact */}
      <div className="p-3 rounded-xl bg-surface-panel border border-surface-border space-y-1">
        <div className="text-[10px] font-mono text-cyan-400 font-semibold uppercase tracking-wider">
          Accessibility Assessment
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {detection.accessibility_impact}
        </p>
      </div>

      {/* Manual Category Correction Dropdown */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Assigned Barrier Category (7 Core Classes):</span>
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as BarrierCategory)}
          className="w-full bg-canvas-950 border border-surface-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 transition-colors"
        >
          <option value="stairs">Stairs / Steps (Impassable for wheelchairs)</option>
          <option value="missing_curb_ramp">Missing Kerb Ramp (Impassable transition)</option>
          <option value="broken_footpath">Broken / Discontinuous Footpath</option>
          <option value="missing_footpath">Missing Footpath (Forced into road)</option>
          <option value="pole_obstruction">Pole / Column Obstruction (&lt; 0.9m)</option>
          <option value="parked_vehicle_blocking_footpath">Parked Vehicle Blocking Footpath</option>
          <option value="uneven_surface">Uneven Cobblestones / Severe Surface</option>
        </select>
      </div>

      {/* Audit Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-slate-400" />
          <span>Surveyor Audit Notes:</span>
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. 18 steps without ramp; measured 16.5% incline on north plaza."
          className="w-full bg-canvas-950 border border-surface-border rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500 resize-none transition-colors"
        />
      </div>

      {/* Verification Actions */}
      <div className="pt-2 border-t border-surface-border space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={isUpdating}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirm & Verify</span>
          </button>

          <button
            onClick={handleReject}
            disabled={isUpdating}
            className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-700/50 text-red-300 text-xs font-semibold transition-all disabled:opacity-50"
            title="Dismiss as false positive"
          >
            Reject
          </button>
        </div>

        {isSaved && (
          <div className="text-[11px] font-mono text-emerald-400 text-center animate-pulse">
            ✓ Status and category updated successfully
          </div>
        )}

        {/* CTA to Match Footpath Segment */}
        <button
          onClick={() => onOpenSegmentMatching(detection)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-900/30 transition-all group"
        >
          <MapPin className="w-4 h-4 text-cyan-200" />
          <span>Match to Footpath Segment</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
