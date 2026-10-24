import React, { useRef, useState } from 'react';
import { VisionDetection, BarrierCategory } from '../types';
import { PlusCircle, X, AlertTriangle, ShieldCheck, Tag } from 'lucide-react';

interface StreetVisionCanvasProps {
  imageUrl: string;
  detections: VisionDetection[];
  selectedDetectionId: string | null;
  onSelectDetection: (id: string) => void;
  onAddManualBox?: (bbox: [number, number, number, number], category: BarrierCategory) => void;
  isDrawingMode: boolean;
  setIsDrawingMode: (active: boolean) => void;
}

export const StreetVisionCanvas: React.FC<StreetVisionCanvasProps> = ({
  imageUrl,
  detections,
  selectedDetectionId,
  onSelectDetection,
  onAddManualBox,
  isDrawingMode,
  setIsDrawingMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [newCategory, setNewCategory] = useState<BarrierCategory>('stairs');

  // Handle drawing interaction on canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setStartPoint({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!startPoint || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    const w = Math.abs(currentX - startPoint.x);
    const h = Math.abs(currentY - startPoint.y);

    setCurrentBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (!startPoint || !currentBox || !onAddManualBox) {
      setStartPoint(null);
      setCurrentBox(null);
      return;
    }

    // Only create if box has a minimum size (>= 3% of dimension)
    if (currentBox.w > 0.03 && currentBox.h > 0.03) {
      const ymin = currentBox.y;
      const xmin = currentBox.x;
      const ymax = currentBox.y + currentBox.h;
      const xmax = currentBox.x + currentBox.w;
      onAddManualBox([ymin, xmin, ymax, xmax], newCategory);
      setIsDrawingMode(false);
    }

    setStartPoint(null);
    setCurrentBox(null);
  };

  // Helper for styling box based on status & source
  const getBoxStyle = (det: VisionDetection, isSelected: boolean) => {
    if (det.verification_status === 'rejected') {
      return {
        borderColor: '#ef4444',
        borderStyle: 'dashed' as const,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        badgeBg: 'bg-red-950/80 text-red-300 border-red-700/60',
      };
    }
    if (det.verification_status === 'human_verified') {
      return {
        borderColor: '#10b981',
        borderStyle: 'solid' as const,
        backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.12)',
        badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-600/70',
      };
    }
    if (det.source === 'manually_annotated') {
      return {
        borderColor: '#06b6d4',
        borderStyle: 'solid' as const,
        backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.12)',
        badgeBg: 'bg-cyan-950/90 text-cyan-300 border-cyan-600/70',
      };
    }
    // AI Suggested
    return {
      borderColor: '#f59e0b',
      borderStyle: 'solid' as const,
      backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.12)',
      badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-600/70',
    };
  };

  return (
    <div className="space-y-3">
      {/* Drawing Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-canvas-950 rounded-xl border border-surface-border">
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <span className="font-semibold text-white">Detection Overlays:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[11px] text-slate-400">AI Suggested</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-slate-400">Human Verified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span className="text-[11px] text-slate-400">Manual Annotation</span>
          </div>
        </div>

        {onAddManualBox && (
          <div className="flex items-center gap-2">
            {isDrawingMode ? (
              <div className="flex items-center gap-2 bg-cyan-950/60 border border-cyan-700/50 px-2.5 py-1 rounded-lg text-xs">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300 font-medium">Category:</span>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as BarrierCategory)}
                  className="bg-canvas-900 border border-cyan-800 text-white rounded px-2 py-0.5 text-xs outline-none focus:border-cyan-400"
                >
                  <option value="stairs">Stairs / Steps</option>
                  <option value="missing_curb_ramp">Missing Kerb Ramp</option>
                  <option value="broken_footpath">Broken Footpath</option>
                  <option value="missing_footpath">Missing Footpath</option>
                  <option value="pole_obstruction">Pole Obstruction</option>
                  <option value="parked_vehicle_blocking_footpath">Parked Vehicle</option>
                  <option value="uneven_surface">Uneven Surface</option>
                </select>
                <span className="text-slate-400 text-[11px] ml-1">Click & drag on image to draw</span>
                <button
                  onClick={() => setIsDrawingMode(false)}
                  className="text-slate-400 hover:text-white p-0.5 rounded ml-1"
                  title="Cancel drawing"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsDrawingMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-slate-800 border border-surface-border text-xs text-cyan-300 transition-colors shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Draw Barrier Box</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Image Viewport with Bounding Box Overlay */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative overflow-hidden rounded-2xl bg-canvas-950 border border-surface-border select-none shadow-xl ${
          isDrawingMode ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        <img
          src={imageUrl}
          alt="Street imagery detection viewport"
          className="w-full h-auto block max-h-[580px] object-contain mx-auto pointer-events-none"
        />

        {/* Existing Detections */}
        {detections.map((det) => {
          const [ymin, xmin, ymax, xmax] = det.bbox;
          const top = `${ymin * 100}%`;
          const left = `${xmin * 100}%`;
          const width = `${(xmax - xmin) * 100}%`;
          const height = `${(ymax - ymin) * 100}%`;
          const isSelected = selectedDetectionId === det.id;
          const style = getBoxStyle(det, isSelected);

          return (
            <div
              key={det.id}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDrawingMode) onSelectDetection(det.id);
              }}
              style={{
                top,
                left,
                width,
                height,
                borderColor: style.borderColor,
                borderStyle: style.borderStyle,
                backgroundColor: style.backgroundColor,
              }}
              className={`absolute border-2 transition-all cursor-pointer group ${
                isSelected ? 'ring-2 ring-white/60 shadow-lg z-20' : 'hover:border-white/80 z-10'
              }`}
            >
              {/* Box Tag Banner */}
              <div
                className={`absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-mono font-semibold rounded border whitespace-nowrap shadow-md flex items-center gap-1 pointer-events-none ${
                  style.badgeBg
                }`}
              >
                {det.verification_status === 'human_verified' && (
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                )}
                {det.verification_status === 'ai_suggested' && (
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                )}
                <span>{det.label}</span>
                {det.source === 'ai_detected' && (
                  <span className="opacity-80 text-[9px]">({Math.round(det.confidence * 100)}%)</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Dynamic Box while user is drawing */}
        {currentBox && (
          <div
            style={{
              top: `${currentBox.y * 100}%`,
              left: `${currentBox.x * 100}%`,
              width: `${currentBox.w * 100}%`,
              height: `${currentBox.h * 100}%`,
            }}
            className="absolute border-2 border-cyan-400 bg-cyan-500/20 z-30 pointer-events-none"
          >
            <div className="absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-mono bg-cyan-900 text-cyan-200 rounded border border-cyan-600">
              New: {newCategory.replace('_', ' ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
