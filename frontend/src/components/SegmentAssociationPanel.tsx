import React, { useState, useEffect } from 'react';
import {
  VisionDetection,
  Coordinate,
  CandidateSegment,
  BarrierCategory,
} from '../types';
import {
  matchCandidateSegments,
  confirmBarrier,
} from '../services/api';
import {
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Compass,
  ArrowRight,
  ShieldAlert,
  Loader2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SegmentAssociationPanelProps {
  detection: VisionDetection;
  initialLocation: Coordinate | null;
  onBarrierConfirmed: (segmentId: string, barrierCategory: BarrierCategory) => void;
  onClose: () => void;
}

export const SegmentAssociationPanel: React.FC<SegmentAssociationPanelProps> = ({
  detection,
  initialLocation,
  onBarrierConfirmed,
  onClose,
}) => {
  const navigate = useNavigate();

  // Location coordinates (default to image EXIF or Jaipur center)
  const [lat, setLat] = useState<number>(initialLocation?.lat || 26.9130);
  const [lon, setLon] = useState<number>(initialLocation?.lon || 75.8189);
  const radius = 120;

  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [candidateSegments, setCandidateSegments] = useState<CandidateSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isAmbiguous, setIsAmbiguous] = useState<boolean>(false);
  const [matchMessage, setMatchMessage] = useState<string>('');

  const [confirming, setConfirming] = useState<boolean>(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search candidate segments on mount or location change
  const handleSearchSegments = async (searchLat = lat, searchLon = lon) => {
    setLoadingCandidates(true);
    setErrorMsg(null);
    try {
      const res = await matchCandidateSegments(searchLat, searchLon, radius);
      setCandidateSegments(res.candidate_segments);
      setIsAmbiguous(res.is_ambiguous);
      setMatchMessage(res.message);

      if (res.candidate_segments.length > 0) {
        setSelectedSegmentId(res.matched_closest_segment_id || res.candidate_segments[0].segment_id);
      } else {
        setSelectedSegmentId(null);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to query candidate segments');
    } finally {
      setLoadingCandidates(false);
    }
  };

  useEffect(() => {
    handleSearchSegments(lat, lon);
  }, []);

  const handleConfirmAssociation = async () => {
    if (!selectedSegmentId) return;
    setConfirming(true);
    setErrorMsg(null);

    const targetCategory = detection.barrier_category || 'stairs';
    const selectedSeg = candidateSegments.find((s) => s.segment_id === selectedSegmentId);

    try {
      const result = await confirmBarrier({
        detection_id: detection.id,
        segment_id: selectedSegmentId,
        barrier_category: targetCategory,
        description: detection.notes || `${detection.label} obstacle confirmed on ${selectedSeg?.name || selectedSegmentId}`,
        location: { lat, lon, name: selectedSeg?.name },
        severity: 'critical',
        verification_status: 'human_verified',
        source: 'streetvision_ai',
        notes: detection.notes || undefined,
      });

      setConfirmedSuccess(
        `Barrier successfully registered on segment '${result.segment_name || selectedSegmentId}'! ` +
        `Wheelchair and accessible route calculations will now actively avoid this walkway.`
      );
      onBarrierConfirmed(selectedSegmentId, targetCategory);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to associate barrier with segment');
    } finally {
      setConfirming(false);
    }
  };

  const selectedSegment = candidateSegments.find((s) => s.segment_id === selectedSegmentId);

  return (
    <div className="rounded-2xl bg-canvas-900 border border-cyan-500/40 p-5 space-y-4 shadow-2xl relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
          <Compass className="w-3.5 h-3.5" />
          <span>SC-02 FOOTPATH SEGMENT ASSOCIATION WORKFLOW</span>
        </div>
        <h3 className="text-base font-bold text-white tracking-tight">
          Link Barrier to NetworkX Pedestrian Graph
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Map detection <span className="font-mono text-cyan-300">[{detection.label}]</span> to its verified ground segment ID to update the dynamic accessibility overlay.
        </p>
      </div>

      {/* Coordinates Form */}
      <div className="p-3.5 rounded-xl bg-canvas-950 border border-surface-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Image Geolocation Origin:</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {initialLocation?.name || 'EXIF / User Coordinate'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[10px] font-mono text-slate-400">LATITUDE</label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value))}
              className="w-full bg-canvas-900 border border-surface-border rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-400">LONGITUDE</label>
            <input
              type="number"
              step="0.0001"
              value={lon}
              onChange={(e) => setLon(parseFloat(e.target.value))}
              className="w-full bg-canvas-900 border border-surface-border rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Quick Presets for Jaipur Demonstration Precinct */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] text-slate-500 font-mono py-1">Demo Presets:</span>
          <button
            onClick={() => {
              setLat(26.9130);
              setLon(75.8189);
              handleSearchSegments(26.9130, 75.8189);
            }}
            className="text-[11px] px-2 py-0.5 rounded bg-surface-panel hover:bg-slate-800 text-slate-300 border border-surface-border transition-colors"
          >
            Monumental Stairs (Albert Hall)
          </button>
          <button
            onClick={() => {
              setLat(26.9150);
              setLon(75.8185);
              handleSearchSegments(26.9150, 75.8185);
            }}
            className="text-[11px] px-2 py-0.5 rounded bg-surface-panel hover:bg-slate-800 text-slate-300 border border-surface-border transition-colors"
          >
            North Gate Allée
          </button>
          <button
            onClick={() => {
              setLat(26.9138);
              setLon(75.8163);
              handleSearchSegments(26.9138, 75.8163);
            }}
            className="text-[11px] px-2 py-0.5 rounded bg-surface-panel hover:bg-slate-800 text-slate-300 border border-surface-border transition-colors"
          >
            West Heritage Walk
          </button>
        </div>
      </div>

      {/* Candidate Segments List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
          <span>Nearby Candidate Footpath Segments ({candidateSegments.length}):</span>
          {loadingCandidates && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
        </div>
        {matchMessage && (
          <div className="text-[11px] text-slate-400 font-mono leading-tight">
            {matchMessage}
          </div>
        )}

        {isAmbiguous && (
          <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-600/50 text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-300">Ambiguous Proximity Detected</div>
              <p className="text-[11px] mt-0.5 text-amber-200/90 leading-tight">
                Multiple footpath segments are within 12 meters of this coordinate. Please explicitly select the correct segment below.
              </p>
            </div>
          </div>
        )}

        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {candidateSegments.map((seg) => {
            const isSelected = selectedSegmentId === seg.segment_id;
            return (
              <div
                key={seg.segment_id}
                onClick={() => setSelectedSegmentId(seg.segment_id)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                    : 'bg-canvas-950 hover:bg-surface-panel border-surface-border'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>{seg.name}</span>
                    {seg.has_stairs && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800">
                        Stairs
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                    <span>ID: {seg.segment_id}</span>
                    <span>•</span>
                    <span>Surface: {seg.surface}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-cyan-400 font-mono">
                    {seg.distance_meters.toFixed(1)}m
                  </div>
                  <div className="text-[10px] text-slate-500">distance</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-700 text-red-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Confirmation Success State */}
      {confirmedSuccess ? (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-600/70 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-300 text-sm">Barrier Confirmed & Graph Updated</div>
              <p className="text-xs mt-1 text-emerald-100/90 leading-relaxed">
                {confirmedSuccess}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/route-explorer')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Test Reroute in Route Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Confirm Barrier Action Button */
        <button
          onClick={handleConfirmAssociation}
          disabled={!selectedSegmentId || confirming}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
        >
          {confirming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating Graph Overlay...</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-emerald-200" />
              <span>Confirm Barrier on {selectedSegment?.name || 'Selected Segment'}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
