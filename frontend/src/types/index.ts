export interface HealthResponse {
  status: string;
  service: string;
  phase: number;
  version: string;
  timestamp: string;
  tagline: string;
  environment: string;
  uptime_seconds: number;
}

export interface FeatureModule {
  name: string;
  phase: number;
  status: 'Active' | 'Scheduled' | 'In Development';
  description: string;
}

export interface SystemDiagnosticsResponse {
  service: string;
  phase: number;
  status: string;
  api_version: string;
  server_time: string;
  uptime_seconds: number;
  python_version: string;
  cors_allowed_origins: string[];
  modules: FeatureModule[];
}

export type ConnectionState = 'idle' | 'checking' | 'connected' | 'disconnected';

export interface HealthState {
  state: ConnectionState;
  data: HealthResponse | null;
  error: string | null;
  latencyMs: number | null;
  lastChecked: Date | null;
}

export interface PedestrianSegment {
  segment_id: string;
  street_name: string;
  surface: string;
  width_meters: number;
  curb_ramp_installed: boolean;
  curb_ramp_grade_pct: number;
  tactile_paving: boolean;
  lighting_score: number;
  incline_pct: number;
  accessible_crossing: boolean;
  audible_signals: boolean;
  safety_score_preliminary: number;
}

/* Phase 2 Geospatial & Routing Types */

export type RouteProfileType = 'general_pedestrian' | 'wheelchair' | 'blind_low_vision' | 'elderly';
export type RouteDisplayMode = 'accessible' | 'shortest' | 'compare';

export interface Coordinate {
  lat: number;
  lon: number;
  name?: string;
}

export type ObstacleType =
  | 'stairs'
  | 'pothole'
  | 'missing_curb_cut'
  | 'blocked_footpath'
  | 'uneven_surface'
  | 'accessible_ramp';

export type ObstacleFilterCategory = 'all' | 'critical' | 'caution' | 'accessible';

export interface ObstacleFeature {
  id: string;
  type: ObstacleType;
  label: string;
  filterCategory: 'critical' | 'caution' | 'accessible';
  severity: 'Critical' | 'Caution' | 'Safe / Accessible';
  color: string;
  title: string;
  description: string;
  location: Coordinate;
  segmentId: string;
  segmentName: string;
  surface: string;
  inclinePct: number;
  curbRamp: string;
  impact: string;
  source: string;
  isVerified: boolean;
  prohibitsWheelchair: boolean;
}

export interface AccessibilityBarrier {
  id: string;
  type: 'stairs' | 'missing_curb_cut' | 'steep_incline' | 'uneven_surface' | string;
  description: string;
  location: Coordinate;
  severity: 'low' | 'medium' | 'high' | 'critical';
  prohibits_wheelchair?: boolean;
}

export interface RouteConfidence {
  score: number;
  level: 'High Evidence' | 'Moderate Evidence' | 'Limited Evidence';
  imagery_coverage_pct: number;
  verified_coverage_pct: number;
  segments_with_imagery: number;
  segments_without_imagery: number;
  total_segments: number;
  oldest_imagery_days?: number | null;
  formula_explanation: string;
  disclaimer: string;
}

export interface SegmentFeature {
  id: string;
  name?: string;
  u: string;
  v: string;
  coordinates: [number, number][]; // [lat, lon][]
  length_meters: number;
  highway: string;
  surface: string;
  is_verified: boolean;
  curb_ramp: 'yes' | 'no' | 'unverified';
  has_stairs: boolean;
  incline_pct: number;
  tactile_paving: boolean;
  barrier?: string | null;
  last_imagery_date?: string | null;
  data_source: string;
}

export interface RouteResponse {
  success: boolean;
  route_type: 'shortest' | 'accessible';
  profile: string;
  distance_meters: number;
  estimated_duration_minutes: number;
  coordinates: [number, number][]; // [lat, lon][]
  node_ids: string[];
  segments_count: number;
  barriers_encountered: AccessibilityBarrier[];
  barriers_avoided: AccessibilityBarrier[];
  unverified_segments_count: number;
  confidence?: RouteConfidence | null;
  explanation: string;
  is_identical_to_shortest?: boolean;
  warning_message?: string;
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  start: Coordinate;
  destination: Coordinate;
  expected_shortest_barrier: string;
  expected_accessible_solution: string;
}

export interface ProfileOption {
  id: RouteProfileType;
  name: string;
  icon: string;
  description: string;
  prohibits: string[];
}

export interface MapConfigResponse {
  center: Coordinate;
  default_zoom: number;
  bounding_box: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
  area_name: string;
  city: string;
  state: string;
  country: string;
  description: string;
  demo_scenarios: DemoScenario[];
  available_profiles: ProfileOption[];
  disclaimer: string;
}

export interface SegmentsResponse {
  demonstration_area: string;
  total_segments: number;
  segments: SegmentFeature[];
}

/* Phase 3 StreetVision AI & Annotation Types */

export type BarrierCategory =
  | 'stairs'
  | 'missing_curb_ramp'
  | 'broken_footpath'
  | 'missing_footpath'
  | 'pole_obstruction'
  | 'parked_vehicle_blocking_footpath'
  | 'uneven_surface';

export type DetectionSource = 'ai_detected' | 'human_confirmed' | 'manually_annotated';

export type VerificationStatus = 'ai_suggested' | 'human_verified' | 'rejected';

export interface VisionDetection {
  id: string;
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0..1
  bbox_pixels?: [number, number, number, number]; // [x1, y1, x2, y2]
  accessibility_impact: string;
  barrier_category?: BarrierCategory | null;
  source: DetectionSource;
  verification_status: VerificationStatus;
  model_id: string;
  notes?: string | null;
}

export interface VisionAnalyzeResponse {
  image_id: string;
  filename: string;
  image_width: number;
  image_height: number;
  gps_coordinates?: Coordinate | null;
  detections: VisionDetection[];
  model_info: {
    model_name: string;
    loaded: boolean;
    engine: string;
    total_detections: number;
  };
  inference_time_ms: number;
  raw_model_classes_detected: string[];
  unsupported_classes_notes: string;
  image_url?: string | null;
}

export interface SampleImage {
  image_id: string;
  filename: string;
  title: string;
  location: Coordinate;
  associated_segment_id: string;
  primary_barrier?: BarrierCategory | null;
  secondary_barrier?: BarrierCategory | null;
  source: string;
  verification_status: string;
  accessibility_impact: string;
}

export interface CandidateSegment {
  segment_id: string;
  name: string;
  distance_meters: number;
  highway: string;
  surface: string;
  has_stairs: boolean;
  curb_ramp: string;
  is_verified: boolean;
  coordinates: [number, number][];
}

export interface SegmentMatchResponse {
  query_location: Coordinate;
  candidate_segments: CandidateSegment[];
  matched_closest_segment_id?: string | null;
  is_ambiguous: boolean;
  message: string;
}

export type BarrierType = 'temporary' | 'persistent';

export interface ConfirmBarrierRequest {
  detection_id?: string | null;
  segment_id: string;
  barrier_category: BarrierCategory;
  description: string;
  location: Coordinate;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  verification_status?: VerificationStatus;
  source?: string;
  barrier_type?: BarrierType;
  duration_minutes?: number | null;
  notes?: string | null;
}

export interface ConfirmedBarrier {
  id: string;
  detection_id?: string | null;
  segment_id: string;
  segment_name?: string | null;
  barrier_category: BarrierCategory;
  description: string;
  location: Coordinate;
  severity: string;
  prohibits_wheelchair: boolean;
  cost_multiplier: number;
  verification_status: VerificationStatus;
  source: string;
  barrier_type?: BarrierType;
  duration_minutes?: number | null;
  created_at: string;
  expires_at?: string | null;
  is_active?: boolean;
  image_url?: string | null;
  notes?: string | null;
}

export interface ConfirmedBarriersResponse {
  total_barriers: number;
  barriers: ConfirmedBarrier[];
  active_overlay: boolean;
}

export interface UserBarrierReportRequest {
  barrier_category: BarrierCategory;
  segment_id: string;
  latitude: number;
  longitude: number;
  barrier_type: BarrierType;
  duration_minutes?: number | null;
  description?: string;
  image_url?: string | null;
  image_filename?: string | null;
  detection_id?: string | null;
  notes?: string | null;
}

export interface BarrierReportItem {
  id: string;
  barrier_category: BarrierCategory;
  segment_id: string;
  segment_name?: string | null;
  latitude: number;
  longitude: number;
  barrier_type: BarrierType;
  duration_minutes?: number | null;
  source: string;
  verification_status: string;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
  is_active: boolean;
  prohibits_wheelchair: boolean;
  cost_multiplier: number;
  image_url?: string | null;
  notes?: string | null;
}

export interface BarrierReportsResponse {
  total_reports: number;
  active_count: number;
  expired_count: number;
  reports: BarrierReportItem[];
}
