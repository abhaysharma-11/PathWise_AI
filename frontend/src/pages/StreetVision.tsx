import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Camera,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Trash2,
  ChevronRight,
  Check,
  Layers,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  SampleImage,
  VisionAnalyzeResponse,
  BarrierCategory,
  BarrierType,
  CandidateSegment,
  BarrierReportItem,
  Coordinate,
} from '../types';
import {
  fetchSampleImages,
  analyzeStreetImage,
  matchCandidateSegments,
  submitUserBarrierReport,
  fetchBarrierReports,
  checkExpirations,
  deleteBarrierReport,
  resetDynamicBarriers,
  getApiBaseUrl,
} from '../services/api';
import { StreetVisionCanvas } from '../components/StreetVisionCanvas';

export const StreetVision: React.FC = () => {
  // Wizard Step: 1 = Add Photo, 2 = Identify Problem, 3 = Confirm Location, 4 = Submit Report
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Photo & Samples
  const [sampleImages, setSampleImages] = useState<SampleImage[]>([]);
  const [selectedSample, setSelectedSample] = useState<SampleImage | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 2: Problem Identification & AI Inference
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalyzeResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BarrierCategory>('parked_vehicle_blocking_footpath');
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);

  // Step 3: Location Confirmation & Segment Matching
  const [locationCoord, setLocationCoord] = useState<Coordinate>({ lat: 26.9140, lon: 75.8198 });
  const [candidateSegments, setCandidateSegments] = useState<CandidateSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [matchingSegments, setMatchingSegments] = useState<boolean>(false);
  const [isAmbiguous, setIsAmbiguous] = useState<boolean>(false);
  const [matchMessage, setMatchMessage] = useState<string>('');

  // Step 4: Submission & Expiration
  const [barrierType, setBarrierType] = useState<BarrierType>('temporary');
  const [durationMinutes, setDurationMinutes] = useState<number>(1); // Default to 1 min for live hackathon demo
  const [reportNotes, setReportNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{ id: string; message: string } | null>(null);

  // Reports Table & Dynamic State
  const [reportsList, setReportsList] = useState<BarrierReportItem[]>([]);
  const [checkingExpiry, setCheckingExpiry] = useState<boolean>(false);
  const [expiryMessage, setExpiryMessage] = useState<string | null>(null);
  const [resettingBarriers, setResettingBarriers] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Barrier Category Definitions with Accessibility Impact and Severities
  const BARRIER_CATEGORIES = [
    {
      id: 'parked_vehicle_blocking_footpath' as BarrierCategory,
      title: 'Parked Vehicle Blockage',
      desc: 'Scooter or car completely obstructing walkway',
      severity: 'Critical Blockage',
      prohibits: 'Wheelchairs & Strollers',
    },
    {
      id: 'stairs' as BarrierCategory,
      title: 'Stairs & Steps',
      desc: 'Flight of steps without accessible ramp transition',
      severity: 'Critical Barrier',
      prohibits: 'Wheelchairs',
    },
    {
      id: 'missing_curb_ramp' as BarrierCategory,
      title: 'Missing Kerb Ramp',
      desc: 'Abrupt vertical drop between pavement and road',
      severity: 'High Obstacle',
      prohibits: 'Wheelchairs',
    },
    {
      id: 'broken_footpath' as BarrierCategory,
      title: 'Broken Footpath',
      desc: 'Cracked, displaced, or missing paving slabs',
      severity: 'High Resistance',
      prohibits: 'Impaired Gait',
    },
    {
      id: 'pole_obstruction' as BarrierCategory,
      title: 'Pole Obstruction',
      desc: 'Utility pole, signpost, or pillar in walking path',
      severity: 'Collision Hazard',
      prohibits: 'Blind / Low Vision',
    },
    {
      id: 'missing_footpath' as BarrierCategory,
      title: 'Missing Footpath',
      desc: 'Pedestrians forced directly into active vehicular traffic',
      severity: 'Severe Safety Risk',
      prohibits: 'All Pedestrians',
    },
    {
      id: 'uneven_surface' as BarrierCategory,
      title: 'Uneven Surface',
      desc: 'Historic cobblestones or uneven paving slabs',
      severity: 'Tripping Risk',
      prohibits: 'Elderly & Canes',
    },
  ];

  // Load sample demonstration images & initial reports on mount
  useEffect(() => {
    fetchSampleImages()
      .then((samples) => {
        setSampleImages(samples);
        if (samples.length > 0) {
          handleSelectSample(samples[1] || samples[0]);
        }
      })
      .catch((err) => console.error('Failed to load sample images:', err));

    loadReports();
  }, []);

  const loadReports = () => {
    fetchBarrierReports()
      .then((res) => {
        setReportsList(res.reports || []);
      })
      .catch((err) => console.error('Failed to fetch reports:', err));
  };

  // Poll reports every 10s for live expiry countdown updates
  useEffect(() => {
    const interval = setInterval(loadReports, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle Sample selection
  const handleSelectSample = async (sample: SampleImage) => {
    setSelectedSample(sample);
    setUploadError(null);
    setSubmissionSuccess(null);

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/vision/sample-images/${sample.filename}`);
      if (!res.ok) throw new Error('Failed to fetch sample image');
      const blob = await res.blob();
      const file = new File([blob], sample.filename, { type: 'image/jpeg' });
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(blob));

      // Use sample GPS coordinates
      setLocationCoord({ lat: sample.location.lat, lon: sample.location.lon });

      // Run AI inference
      await runAnalysis(file);

      // Pre-set category if known
      if (sample.primary_barrier) {
        setSelectedCategory(sample.primary_barrier);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error loading sample');
    }
  };

  // File drag & drop
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setUploadError(null);
    setSelectedSample(null);
    setSubmissionSuccess(null);

    const valid = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!valid.includes(file.type.toLowerCase())) {
      setUploadError('Invalid format. Please upload JPG, JPEG, or PNG.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File exceeds 15MB limit.');
      return;
    }

    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisResult(null);
    runAnalysis(file);
  };

  const runAnalysis = async (fileToAnalyze = uploadedFile) => {
    if (!fileToAnalyze) return;
    setAnalyzing(true);
    setUploadError(null);

    try {
      const result = await analyzeStreetImage(fileToAnalyze);
      setAnalysisResult(result);
      if (result.gps_coordinates) {
        setLocationCoord(result.gps_coordinates);
      }
      if (result.detections.length > 0) {
        setSelectedDetectionId(result.detections[0].id);
        const cat = result.detections[0].barrier_category;
        if (cat) {
          setSelectedCategory(cat);
        }
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Inference pipeline failure');
    } finally {
      setAnalyzing(false);
    }
  };

  // When moving to Step 3: search candidate segments around current coordinates
  const handleProceedToStep3 = async () => {
    setCurrentStep(3);
    setMatchingSegments(true);
    try {
      const res = await matchCandidateSegments(locationCoord.lat, locationCoord.lon, 120);
      setCandidateSegments(res.candidate_segments);
      setIsAmbiguous(res.is_ambiguous);
      setMatchMessage(res.message);
      if (res.candidate_segments.length > 0) {
        setSelectedSegmentId(res.matched_closest_segment_id || res.candidate_segments[0].segment_id);
      }
    } catch (err) {
      console.error('Failed to match candidate segments:', err);
    } finally {
      setMatchingSegments(false);
    }
  };

  // Final Step 4: Submit Barrier Report
  const handleSubmitReport = async () => {
    if (!selectedSegmentId) {
      setUploadError('Please select an associated footpath segment.');
      return;
    }

    setSubmitting(true);
    setUploadError(null);

    try {
      const result = await submitUserBarrierReport({
        barrier_category: selectedCategory,
        segment_id: selectedSegmentId,
        latitude: locationCoord.lat,
        longitude: locationCoord.lon,
        barrier_type: barrierType,
        duration_minutes: barrierType === 'temporary' ? durationMinutes : undefined,
        description: reportNotes || `Reported ${selectedCategory.replace(/_/g, ' ')}`,
        image_filename: uploadedFile?.name,
        detection_id: selectedDetectionId || undefined,
        notes: reportNotes || undefined,
      });

      setSubmissionSuccess({
        id: result.id,
        message: `Report received. Map updated with ${barrierType} barrier.`,
      });

      loadReports();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to submit barrier report');
    } finally {
      setSubmitting(false);
    }
  };

  // Manual Trigger for Temporary Barrier Expiration
  const handleCheckExpirations = async () => {
    setCheckingExpiry(true);
    setExpiryMessage(null);
    try {
      const res = await checkExpirations();
      setExpiryMessage(
        `Checked expirations: ${res.newly_expired_count} barrier(s) newly expired. Active remaining: ${res.active_barriers_count}.`
      );
      loadReports();
    } catch (err: unknown) {
      setExpiryMessage('Failed to check expirations.');
    } finally {
      setCheckingExpiry(false);
    }
  };

  // Remove or Deactivate Report
  const handleDeleteReport = async (id: string) => {
    try {
      await deleteBarrierReport(id);
      loadReports();
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  // Reset all dynamic barriers to baseline
  const handleResetAllBarriers = async () => {
    setResettingBarriers(true);
    try {
      await resetDynamicBarriers();
      loadReports();
    } catch (err) {
      console.error('Failed to reset barriers:', err);
    } finally {
      setResettingBarriers(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>PATHWISE AI</span>
            <span>/</span>
            <span className="text-cyan-400 font-semibold">Report a Barrier</span>
            <span>/</span>
            <span className="text-emerald-400 font-mono">StreetVision AI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Report a Pedestrian Barrier
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Capture photos of obstacles. Real AI plus community reporting updates active routes within 60 seconds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/route-explorer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-panel hover:bg-slate-800 border border-surface-border text-xs text-cyan-300 font-semibold transition-colors"
          >
            <span>View Map & Routes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {uploadError && (
        <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700/60 text-red-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* 4-Step Progress Indicator Bar */}
      <div className="rounded-2xl bg-canvas-900 border border-surface-border p-3 sm:p-4 shadow-geo-card">
        <div className="grid grid-cols-4 gap-2 text-xs font-mono">
          {[
            { step: 1, label: 'Add Photo' },
            { step: 2, label: 'Identify Problem' },
            { step: 3, label: 'Confirm Location' },
            { step: 4, label: 'Submit Report' },
          ].map((s) => {
            const isCurrent = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (previewUrl || s.step === 1) setCurrentStep(s.step);
                }}
                className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/40 font-bold'
                    : isCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-semibold'
                    : 'bg-canvas-950 border-surface-border text-slate-500'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] shrink-0 font-bold ${
                    isCurrent
                      ? 'bg-cyan-500 text-slate-950'
                      : isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-surface-panel text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.step}
                </div>
                <div className="hidden sm:block truncate leading-tight">
                  <div className="text-[10px] text-slate-400 uppercase">Step {s.step}</div>
                  <div className="truncate text-xs">{s.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          STEP 1: ADD PHOTO
          ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-canvas-900 border border-surface-border p-6 shadow-geo-card space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Step 1: Upload or Select Indian Street Photo</span>
            </h2>

            {/* Curated Sample Demonstration Photos */}
            <div className="space-y-2">
              <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quick-Select Curated Demonstration Photos (Jaipur Precinct):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {sampleImages.map((s) => {
                  const isSelected = selectedSample?.image_id === s.image_id;
                  return (
                    <button
                      key={s.image_id}
                      onClick={() => handleSelectSample(s)}
                      className={`text-left p-3 rounded-xl border transition-all space-y-1.5 ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                          : 'bg-canvas-950 hover:bg-surface-panel border-surface-border'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 uppercase">
                        <span>{s.primary_barrier ? s.primary_barrier.replace(/_/g, ' ') : 'Accessible Ramp'}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                      </div>
                      <div className="font-semibold text-xs text-white line-clamp-1">{s.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                        {s.accessibility_impact}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upload Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-950/30'
                  : 'border-surface-border bg-canvas-950 hover:border-slate-600 hover:bg-surface-panel/30'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-surface-panel border border-surface-border flex items-center justify-center text-cyan-400 mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Upload Custom Street Photograph</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                Drag and drop JPG/PNG file here, or click to browse (Max 15MB).
              </p>
              {uploadedFile && (
                <div className="mt-3 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Selected: {uploadedFile.name}</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Next Step Action */}
            <div className="flex justify-end pt-3 border-t border-surface-border">
              <button
                type="button"
                disabled={!previewUrl || analyzing}
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md"
              >
                <span>Proceed to Identify Problem</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2: IDENTIFY PROBLEM
          ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Image Canvas & Detection */}
            <div className="lg:col-span-7 space-y-3">
              <div className="rounded-2xl bg-canvas-900 border border-surface-border p-4 shadow-geo-card space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Street Photograph & Detection</span>
                  </span>
                  {analysisResult?.gps_coordinates && (
                    <span className="text-[11px] font-mono text-cyan-300">
                      GPS: {analysisResult.gps_coordinates.lat.toFixed(4)},{' '}
                      {analysisResult.gps_coordinates.lon.toFixed(4)}
                    </span>
                  )}
                </div>

                {previewUrl && (
                  <StreetVisionCanvas
                    imageUrl={previewUrl}
                    detections={analysisResult?.detections || []}
                    selectedDetectionId={selectedDetectionId}
                    onSelectDetection={(id) => {
                      setSelectedDetectionId(id);
                      const match = analysisResult?.detections.find((d) => d.id === id);
                      if (match?.barrier_category) setSelectedCategory(match.barrier_category);
                    }}
                    onAddManualBox={async (_bbox, cat) => {
                      setSelectedCategory(cat);
                    }}
                    isDrawingMode={isDrawingMode}
                    setIsDrawingMode={setIsDrawingMode}
                  />
                )}

                <div className="p-2.5 rounded-xl bg-canvas-950 border border-surface-border text-xs text-slate-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-mono text-[11px] text-slate-300">
                      Provenance: {selectedDetectionId ? 'AI Suggested (YOLOv8)' : 'Human Auditor Confirmed'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsDrawingMode(!isDrawingMode)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline font-mono"
                  >
                    {isDrawingMode ? 'Done Drawing' : 'Draw Obstacle Box'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: 7 Explicit Problem Categories */}
            <div className="lg:col-span-5 space-y-3">
              <div className="rounded-2xl bg-canvas-900 border border-surface-border p-4 shadow-geo-card space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Select Barrier Category (7 Classes)
                </h3>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {BARRIER_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-500 shadow-sm ring-1 ring-cyan-500/50'
                            : 'bg-canvas-950 hover:bg-surface-panel border-surface-border'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-white">{cat.title}</div>
                          <div className="text-[11px] text-slate-400">{cat.desc}</div>
                          <div className="text-[10px] font-mono text-red-400">
                            Prohibits: {cat.prohibits}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 font-bold" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-surface-border flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    ← Back to Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToStep3}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow"
                  >
                    <span>Confirm Location</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 3: CONFIRM LOCATION & MATCH SEGMENT
          ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-canvas-900 border border-surface-border p-6 shadow-geo-card space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Step 3: Confirm Footpath Segment Location</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Coordinates Preview */}
              <div className="p-4 rounded-xl bg-canvas-950 border border-surface-border space-y-2">
                <span className="text-xs font-mono uppercase text-slate-400 block font-bold">
                  Surveyed Coordinates (From Photo EXIF)
                </span>
                <div className="flex items-center gap-3 font-mono text-sm text-cyan-300">
                  <span>LAT: {locationCoord.lat.toFixed(5)}</span>
                  <span>LON: {locationCoord.lon.toFixed(5)}</span>
                </div>
                <p className="text-xs text-slate-400">
                  Ram Niwas Garden Demonstration Precinct, Jaipur
                </p>
              </div>

              {/* Match Status / Ambiguity Alert */}
              <div className="p-4 rounded-xl bg-canvas-950 border border-surface-border space-y-2">
                <span className="text-xs font-mono uppercase text-slate-400 block font-bold">
                  Graph Ambiguity Status
                </span>
                {isAmbiguous ? (
                  <div className="text-amber-400 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Multiple close segments identified. Please verify the intended footpath below.</span>
                  </div>
                ) : (
                  <div className="text-emerald-400 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Exact footpath segment isolated with high geographic certainty.</span>
                  </div>
                )}
                <div className="text-[11px] text-slate-400">{matchMessage}</div>
              </div>
            </div>

            {/* Candidate Footpaths List */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-mono uppercase text-slate-400 block font-bold">
                Nearby Footpath Segments:
              </span>

              {matchingSegments ? (
                <div className="text-center py-6 text-xs text-slate-400">Searching graph segments...</div>
              ) : (
                <div className="space-y-2">
                  {candidateSegments.map((seg) => {
                    const isSelected = selectedSegmentId === seg.segment_id;
                    return (
                      <button
                        key={seg.segment_id}
                        type="button"
                        onClick={() => setSelectedSegmentId(seg.segment_id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-500 ring-1 ring-cyan-500/50 shadow-sm'
                            : 'bg-canvas-950 hover:bg-surface-panel border-surface-border'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-white flex items-center gap-2">
                            <span>{seg.name}</span>
                            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                              {seg.distance_meters}m away
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Surface: {seg.surface} • Curb Cut: {seg.curb_ramp}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 font-bold" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-surface-border flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back to Problem
              </button>
              <button
                type="button"
                disabled={!selectedSegmentId}
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow"
              >
                <span>Configure Expiry & Submit</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 4: SUBMIT REPORT & CONFIGURE EXPIRY
          ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-canvas-900 border border-surface-border p-6 shadow-geo-card space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Step 4: Barrier Nature & Expiration Settings</span>
            </h2>

            {/* Success Banner if already submitted */}
            {submissionSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 p-4 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Report Received. Active Navigation Graph Updated!</span>
                </div>
                <p className="text-xs text-slate-300">
                  {submissionSuccess.message} Routes traversing this segment now automatically divert.
                </p>
                <div className="pt-2 flex items-center gap-4">
                  <Link
                    to="/route-explorer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow"
                  >
                    <span>View Detour on Route Explorer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => {
                      setSubmissionSuccess(null);
                      setCurrentStep(1);
                    }}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Submit Another Barrier
                  </button>
                </div>
              </div>
            )}

            {/* Temporary vs Persistent Barrier Toggle */}
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase text-slate-400 block font-bold">
                1. Select Barrier Nature
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBarrierType('temporary')}
                  className={`p-4 rounded-xl border text-left transition-all space-y-1 ${
                    barrierType === 'temporary'
                      ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50 shadow-sm'
                      : 'bg-canvas-950 border-surface-border hover:bg-surface-panel'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-300 uppercase font-mono">
                      Temporary Obstacle
                    </span>
                    {barrierType === 'temporary' && <Check className="w-4 h-4 text-amber-400" />}
                  </div>
                  <p className="text-xs text-slate-300">
                    Parked vehicle, road work, or temporary obstruction that will clear soon.
                  </p>
                  <span className="text-[10px] text-amber-400/90 font-mono block pt-1">
                    Auto-expires and restores pristine route baseline
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBarrierType('persistent')}
                  className={`p-4 rounded-xl border text-left transition-all space-y-1 ${
                    barrierType === 'persistent'
                      ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50 shadow-sm'
                      : 'bg-canvas-950 border-surface-border hover:bg-surface-panel'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-300 uppercase font-mono">
                      Persistent Barrier
                    </span>
                    {barrierType === 'persistent' && <Check className="w-4 h-4 text-purple-400" />}
                  </div>
                  <p className="text-xs text-slate-300">
                    Permanent infrastructure defect (steps, missing curb cut, rough cobblestone).
                  </p>
                  <span className="text-[10px] text-purple-400/90 font-mono block pt-1">
                    Requires municipal renovation to clear
                  </span>
                </button>
              </div>
            </div>

            {/* Expiry Duration Selector (If Temporary) */}
            {barrierType === 'temporary' && (
              <div className="space-y-2 p-4 rounded-xl bg-canvas-950 border border-surface-border">
                <span className="text-xs font-mono uppercase text-slate-400 block font-bold">
                  2. Select Auto-Expiration Duration
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { minutes: 1, label: '60 Seconds', note: 'Live Hackathon Demo' },
                    { minutes: 60, label: '1 Hour', note: 'Short Vehicle Delivery' },
                    { minutes: 1440, label: '24 Hours', note: 'Daily Street Market' },
                    { minutes: 10080, label: '7 Days', note: 'Weekly Utility Repair' },
                  ].map((dur) => (
                    <button
                      key={dur.minutes}
                      type="button"
                      onClick={() => setDurationMinutes(dur.minutes)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        durationMinutes === dur.minutes
                          ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold'
                          : 'bg-canvas-900 border-surface-border text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-mono">{dur.label}</div>
                      <div className="text-[9px] text-slate-500 truncate">{dur.note}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase text-slate-400 block font-bold">
                3. Additional Notes / Citizen Context
              </span>
              <input
                type="text"
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="e.g. Delivery scooter parked directly on curb ramp, completely blocking access..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas-950 border border-surface-border text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-surface-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back to Location
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitReport}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Updating Active Map...</span>
                ) : (
                  <>
                    <span>SUBMIT BARRIER REPORT</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LIVE BARRIER REPORTS & AUTO-EXPIRATION MANAGEMENT TABLE
          ========================================================================= */}
      <div className="rounded-2xl bg-canvas-900 border border-surface-border p-6 shadow-geo-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Active Barrier Reports & Expiration Lifecycle</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live barriers affecting NetworkX graph edge costs. Temporary barriers auto-expire based on UTC timestamps.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckExpirations}
              disabled={checkingExpiry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-panel hover:bg-slate-800 text-xs text-cyan-300 border border-surface-border transition-colors font-mono"
              title="Trigger immediate expiration check"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingExpiry ? 'animate-spin' : ''}`} />
              <span>Trigger Expiration Check</span>
            </button>

            <button
              onClick={handleResetAllBarriers}
              disabled={resettingBarriers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-xs text-red-300 border border-red-800/40 transition-colors font-mono"
              title="Reset all dynamic barriers to baseline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset to Baseline</span>
            </button>
          </div>
        </div>

        {expiryMessage && (
          <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-700/60 text-cyan-200 text-xs font-mono">
            {expiryMessage}
          </div>
        )}

        {reportsList.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No citizen barrier reports active. Graph is currently operating on pristine baseline audited network.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-surface-border text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Report ID</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Segment</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Expires At / Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/40">
                {reportsList.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-panel/30">
                    <td className="py-2.5 px-3 text-slate-300">{r.id}</td>
                    <td className="py-2.5 px-3 capitalize font-semibold text-white">
                      {r.barrier_category.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-[180px]">
                      {r.segment_name || r.segment_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          r.barrier_type === 'temporary'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                            : 'bg-purple-950/80 text-purple-300 border border-purple-800/50'
                        }`}
                      >
                        {r.barrier_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {r.is_active ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Active {r.expires_at ? `(Exp: ${new Date(r.expires_at).toLocaleTimeString()})` : '(Permanent)'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">Expired / Inactive</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {r.is_active && (
                        <button
                          onClick={() => handleDeleteReport(r.id)}
                          className="text-red-400 hover:text-red-300 text-[11px] underline"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
