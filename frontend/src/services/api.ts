import {
  HealthResponse,
  SystemDiagnosticsResponse,
  MapConfigResponse,
  SegmentsResponse,
  RouteResponse,
  Coordinate,
  RouteProfileType,
} from '../types';

const rawBase = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').trim();
const configuredBase = rawBase.replace(/\/+$/, '');

// Maintain active base URL across calls with automatic localhost / 127.0.0.1 loopback fallback
let activeBaseUrl = configuredBase;

export const API_BASE_URL: string = configuredBase;

export function getApiBaseUrl(): string {
  return activeBaseUrl;
}

function getCandidateUrls(primary: string): string[] {
  const clean = primary.trim().replace(/\/+$/, '');
  const list = [clean];
  if (clean.includes('localhost')) {
    list.push(clean.replace('localhost', '127.0.0.1'));
  } else if (clean.includes('127.0.0.1')) {
    list.push(clean.replace('127.0.0.1', 'localhost'));
  }
  return list;
}

/**
 * Resilient fetch wrapper that tries the active base URL, and on Windows loopback
 * IPv6/IPv4 mismatch (e.g. localhost -> ::1 refusal), transparently tries the alternate
 * candidate and permanently caches the responsive address.
 */
async function resilientFetch(path: string, options?: RequestInit): Promise<Response> {
  const candidates = getCandidateUrls(activeBaseUrl);
  let lastError: unknown;

  for (const base of candidates) {
    try {
      const formattedPath = path.startsWith('/') ? path : `/${path}`;
      const url = `${base}${formattedPath}`;
      const response = await fetch(url, options);
      // If we received an HTTP response (even 4xx/5xx), network connectivity is working
      activeBaseUrl = base;
      return response;
    } catch (err) {
      lastError = err;
      // Continue to next candidate loopback if network fetch failed
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to contact API at ${activeBaseUrl}`);
}

export interface HealthCheckResult {
  data: HealthResponse;
  latencyMs: number;
}

/**
 * Pings backend health check endpoint GET /api/health.
 * Never returns mock data; only returns verified backend payload.
 */
export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await resilientFetch('/api/health', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data: HealthResponse = await response.json();
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    if (!data || data.status !== 'ok' || !data.service) {
      throw new Error('Invalid health response format received from backend');
    }

    return {
      data,
      latencyMs,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Connection timed out after 6000ms connecting to ${activeBaseUrl}`);
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Unknown network error while contacting backend');
  }
}

/**
 * Fetches platform diagnostics GET /api/diagnostics
 */
export async function fetchSystemDiagnostics(): Promise<SystemDiagnosticsResponse> {
  const response = await resilientFetch('/api/diagnostics', {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch diagnostics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetches map configuration, demonstration area bounds, and demo presets GET /api/map/config
 */
export async function fetchMapConfig(): Promise<MapConfigResponse> {
  const response = await resilientFetch('/api/map/config', {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch map configuration: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetches all audited pedestrian graph segments GET /api/routes/segments
 */
export async function fetchSegments(): Promise<SegmentsResponse> {
  const response = await resilientFetch('/api/routes/segments', {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch pedestrian segments: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Calculates true shortest pedestrian route POST /api/routes/shortest
 */
export async function calculateShortestRoute(
  start: Coordinate,
  destination: Coordinate
): Promise<RouteResponse> {
  const response = await resilientFetch('/api/routes/shortest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      start,
      destination,
      profile: 'general_pedestrian',
    }),
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      // fallback to statusText
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Calculates accessibility-weighted pedestrian route POST /api/routes/accessible
 */
export async function calculateAccessibleRoute(
  start: Coordinate,
  destination: Coordinate,
  profile: RouteProfileType
): Promise<RouteResponse> {
  const response = await resilientFetch('/api/routes/accessible', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      start,
      destination,
      profile,
    }),
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      // fallback to statusText
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/* Phase 3 StreetVision AI Endpoints */

import {
  SampleImage,
  VisionAnalyzeResponse,
  VisionDetection,
  SegmentMatchResponse,
  ConfirmBarrierRequest,
  ConfirmedBarrier,
  ConfirmedBarriersResponse,
  BarrierCategory,
  VerificationStatus,
  UserBarrierReportRequest,
  BarrierReportItem,
  BarrierReportsResponse,
} from '../types';

/**
 * Fetches curated Indian street demonstration images GET /api/vision/sample-images
 */
export async function fetchSampleImages(): Promise<SampleImage[]> {
  const response = await resilientFetch('/api/vision/sample-images');
  if (!response.ok) {
    throw new Error(`Failed to load sample images: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Analyzes uploaded street image with AI inference & metadata extraction POST /api/vision/analyze
 */
export async function analyzeStreetImage(file: File): Promise<VisionAnalyzeResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await resilientFetch('/api/vision/analyze', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const err = await response.json();
      if (err?.detail) errorDetail = err.detail;
    } catch {
      // fallback
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Updates detection status (confirm, reject, change category, adjust box) PATCH /api/vision/detections/{id}
 */
export async function updateDetection(
  detectionId: string,
  update: {
    barrier_category?: BarrierCategory;
    verification_status?: VerificationStatus;
    bbox?: [number, number, number, number];
    notes?: string;
  }
): Promise<VisionDetection> {
  const response = await resilientFetch(`/api/vision/detections/${detectionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    throw new Error(`Failed to update detection: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Adds manual accessibility annotation POST /api/vision/annotations
 */
export async function createManualAnnotation(payload: {
  image_id: string;
  barrier_category: BarrierCategory;
  bbox: [number, number, number, number];
  accessibility_impact?: string;
  notes?: string;
}): Promise<VisionDetection> {
  const response = await resilientFetch('/api/vision/annotations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create manual annotation: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Matches coordinates to candidate footpath segments POST /api/vision/segment-match
 */
export async function matchCandidateSegments(
  lat: number,
  lon: number,
  radiusMeters = 150.0
): Promise<SegmentMatchResponse> {
  const response = await resilientFetch('/api/vision/segment-match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lat,
      lon,
      radius_meters: radiusMeters,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to match candidate segments: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Confirms barrier and registers it into GraphService overlay POST /api/vision/confirm-barrier
 */
export async function confirmBarrier(payload: ConfirmBarrierRequest): Promise<ConfirmedBarrier> {
  const response = await resilientFetch('/api/vision/confirm-barrier', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const err = await response.json();
      if (err?.detail) errorDetail = err.detail;
    } catch {
      // fallback
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Lists active confirmed dynamic barriers GET /api/vision/barriers
 */
export async function fetchConfirmedBarriers(): Promise<ConfirmedBarriersResponse> {
  const response = await resilientFetch('/api/vision/barriers');
  if (!response.ok) {
    throw new Error(`Failed to fetch confirmed barriers: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Removes a dynamic confirmed barrier DELETE /api/vision/barriers/{id}
 */
export async function removeConfirmedBarrier(barrierId: string): Promise<{ success: boolean; message: string }> {
  const response = await resilientFetch(`/api/vision/barriers/${barrierId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to remove barrier: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Resets all dynamic barriers to pristine baseline POST /api/vision/reset-barriers
 */
export async function resetDynamicBarriers(): Promise<{ success: boolean; message: string }> {
  const response = await resilientFetch('/api/vision/reset-barriers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(`Failed to reset barriers: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Submits citizen barrier report with photo context POST /api/vision/user-report
 */
export async function submitUserBarrierReport(payload: UserBarrierReportRequest): Promise<BarrierReportItem> {
  const response = await resilientFetch('/api/vision/user-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const err = await response.json();
      if (err?.detail) errorDetail = err.detail;
    } catch {
      // fallback
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Lists all reports with active vs expired tallies GET /api/vision/reports
 */
export async function fetchBarrierReports(): Promise<BarrierReportsResponse> {
  const response = await resilientFetch('/api/vision/reports');
  if (!response.ok) {
    throw new Error(`Failed to fetch barrier reports: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Evaluates and cleans up expired temporary barriers POST /api/vision/check-expirations
 */
export async function checkExpirations(): Promise<{ success: boolean; newly_expired_count: number; active_barriers_count: number }> {
  const response = await resilientFetch('/api/vision/check-expirations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(`Failed to check expirations: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Deactivates or removes a barrier report DELETE /api/vision/reports/{id}
 */
export async function deleteBarrierReport(reportId: string): Promise<{ success: boolean; message: string }> {
  const response = await resilientFetch(`/api/vision/reports/${reportId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to remove barrier report: ${response.statusText}`);
  }
  return response.json();
}
