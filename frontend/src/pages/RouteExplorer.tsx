import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Accessibility,
  HeartHandshake,
  Footprints,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Navigation2,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { PedestrianMap } from '../components/PedestrianMap';
import { SearchableLocationInput, LandmarkOption } from '../components/SearchableLocationInput';
import { ObstacleDetailCard } from '../components/ObstacleDetailCard';
import { RouteComparisonCard } from '../components/RouteComparisonCard';
import { Link } from 'react-router-dom';
import {
  fetchMapConfig,
  fetchSegments,
  calculateShortestRoute,
  calculateAccessibleRoute,
  fetchConfirmedBarriers,
} from '../services/api';
import { getPrecinctObstacles } from '../services/obstacleService';
import {
  Coordinate,
  MapConfigResponse,
  SegmentFeature,
  RouteResponse,
  RouteProfileType,
  RouteDisplayMode,
  ObstacleFeature,
  ObstacleFilterCategory,
  ConfirmedBarrier,
} from '../types';

export const JAIPUR_LANDMARKS: LandmarkOption[] = [
  { id: 'N1_NORTH_GATE', name: 'North Gate (New Gate Entrance)', lat: 26.9158, lon: 75.8185, description: 'Pedestrian entrance from New Gate / JLN Marg' },
  { id: 'N2_CENTRAL_JUNCTION', name: 'Central Promenade Fountain', lat: 26.9142, lon: 75.8186, description: 'Central circular hub connecting north, east & west gardens' },
  { id: 'N3_WEST_GATE', name: 'West Gate (Ravindra Manch)', lat: 26.9145, lon: 75.8158, description: 'Access to open-air theatre and cultural exhibition hall' },
  { id: 'N4_EAST_GATE', name: 'East Gate (Zoo & Aviary Walk)', lat: 26.9140, lon: 75.8222, description: 'Eastern pedestrian portal near Jaipur Zoo' },
  { id: 'N5_STAIRS_TOP', name: 'Museum North Terrace (Top of Steps)', lat: 26.9133, lon: 75.8188, description: 'Upper promenade overlook facing Albert Hall north facade' },
  { id: 'N6_STAIRS_BOTTOM', name: 'Lower Museum Forecourt', lat: 26.9127, lon: 75.8190, description: 'Lower courtyard below the monumental stairs' },
  { id: 'N7_ALBERT_HALL_PLAZA', name: 'Albert Hall Main Museum Plaza', lat: 26.9122, lon: 75.8193, description: 'Main visitor ticketing plaza and accessible museum entrance' },
  { id: 'N8_EAST_RAMP_ENTRY', name: 'East Rose Garden Ramped Entry', lat: 26.9136, lon: 75.8208, description: 'Beginning of certified accessible ramped pathway' },
  { id: 'N9_EAST_MUSEUM_APPROACH', name: 'East Museum Approach (Tactile Paved)', lat: 26.9125, lon: 75.8205, description: 'Flush curb junction with tactile guidance tiles to main plaza' },
  { id: 'N10_WEST_HERITAGE_WALK', name: 'West Heritage Walk', lat: 26.9130, lon: 75.8168, description: 'Historic pathway paved with heritage uneven cobblestones' },
  { id: 'N11_SOUTH_GARDENS', name: 'South Flower Gardens', lat: 26.9110, lon: 75.8192, description: 'Connecting pathway to south lawn' },
  { id: 'N12_SOUTH_GATE', name: 'South Gate (Hospital Road Exit)', lat: 26.9095, lon: 75.8190, description: 'South gateway towards SMS Hospital junction' },
  { id: 'N13_BOTANICAL_WALK', name: 'Shaded Botanical Walk', lat: 26.9118, lon: 75.8220, description: 'Tree-canopied corridor with rest benches' },
  { id: 'N14_OUTER_MAINTENANCE', name: 'Outer Boundary Walk (Unverified)', lat: 26.9102, lon: 75.8212, description: 'Outer perimeter service path with unverified surface rating' },
];

export const RouteExplorer: React.FC = () => {
  // Map configuration state
  const [mapConfig, setMapConfig] = useState<MapConfigResponse | null>(null);
  const [segments, setSegments] = useState<SegmentFeature[]>([]);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);

  // Route Planning State
  const [startPoint, setStartPoint] = useState<Coordinate | null>(null);
  const [destPoint, setDestPoint] = useState<Coordinate | null>(null);
  const [profile, setProfile] = useState<RouteProfileType>('wheelchair');
  const [routeDisplayMode, setRouteDisplayMode] = useState<RouteDisplayMode>('accessible');
  const [clickMode, setClickMode] = useState<'start' | 'destination' | 'none'>('none');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculated Routes
  const [shortestRoute, setShortestRoute] = useState<RouteResponse | null>(null);
  const [accessibleRoute, setAccessibleRoute] = useState<RouteResponse | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Obstacle Visualization State
  const [activeFilter, setActiveFilter] = useState<ObstacleFilterCategory>('all');
  const [selectedObstacle, setSelectedObstacle] = useState<ObstacleFeature | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SegmentFeature | null>(null);
  const [showSegmentsLayer, setShowSegmentsLayer] = useState<boolean>(true);

  // Mobile Bottom Sheet / Planner Open State
  const [mobilePlannerOpen, setMobilePlannerOpen] = useState<boolean>(true);

  // Dynamic StreetVision Confirmed Barriers
  const [confirmedBarriers, setConfirmedBarriers] = useState<ConfirmedBarrier[]>([]);

  // Obstacles list derived from authentic segments
  const obstacles = useMemo(() => getPrecinctObstacles(segments), [segments]);

  // Merge baseline surveyed obstacles with live StreetVision confirmed barriers
  const allObstacles = useMemo(() => {
    const dynamicObs: ObstacleFeature[] = confirmedBarriers.map((cb) => {
      const isCritical = cb.prohibits_wheelchair || cb.severity === 'critical';
      return {
        id: cb.id,
        type: (cb.barrier_category as any) || 'blocked_footpath',
        label: cb.barrier_category.toUpperCase().replace(/_/g, ' '),
        filterCategory: isCritical ? 'critical' : 'caution',
        severity: isCritical ? 'Critical' : 'Caution',
        color: isCritical ? '#ef4444' : '#f59e0b',
        title: `${cb.barrier_category.replace(/_/g, ' ').toUpperCase()} (StreetVision Confirmed)`,
        description: cb.description,
        location: cb.location,
        segmentId: cb.segment_id,
        segmentName: cb.segment_name || cb.segment_id,
        surface: 'Verified Footpath',
        inclinePct: 0,
        curbRamp: cb.barrier_category === 'missing_curb_ramp' ? 'no' : 'unverified',
        impact: cb.description,
        source: 'StreetVision AI Human Verified',
        isVerified: true,
        prohibitsWheelchair: cb.prohibits_wheelchair,
      };
    });
    return [...obstacles, ...dynamicObs];
  }, [obstacles, confirmedBarriers]);

  // Load Map Config, Graph Segments, and Confirmed Dynamic Barriers
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingConfig(true);
      try {
        const [config, segsRes, barriersRes] = await Promise.all([
          fetchMapConfig(),
          fetchSegments(),
          fetchConfirmedBarriers().catch(() => ({ total_barriers: 0, barriers: [], active_overlay: false })),
        ]);
        if (!isMounted) return;

        setMapConfig(config);
        setSegments(segsRes.segments);
        setConfirmedBarriers(barriersRes.barriers || []);

        // Preload primary demonstration scenario
        if (config.demo_scenarios.length > 0) {
          const defaultScenario = config.demo_scenarios[0];
          setStartPoint(defaultScenario.start);
          setDestPoint(defaultScenario.destination);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to load map data';
        setRouteError(`Initialization error: ${msg}`);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Poll for confirmed barrier updates every 8s (satisfies <60s live update requirement)
  useEffect(() => {
    const pollId = setInterval(async () => {
      try {
        const barriersRes = await fetchConfirmedBarriers();
        setConfirmedBarriers(barriersRes.barriers || []);
      } catch {
        // Silent poll
      }
    }, 8000);
    return () => clearInterval(pollId);
  }, []);

  // Compute Routes function invoking real backend
  const handleCalculateRoutes = useCallback(
    async (start: Coordinate, dest: Coordinate, currentProfile: RouteProfileType) => {
      setCalculating(true);
      setRouteError(null);
      setValidationError(null);

      try {
        const [shortest, accessible] = await Promise.all([
          calculateShortestRoute(start, dest),
          calculateAccessibleRoute(start, dest, currentProfile),
        ]);

        setShortestRoute(shortest);
        setAccessibleRoute(accessible);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Route calculation failed';
        setRouteError(msg);
        setShortestRoute(null);
        setAccessibleRoute(null);
      } finally {
        setCalculating(false);
      }
    },
    []
  );

  // Trigger route computation initially when start & dest are preloaded
  useEffect(() => {
    if (startPoint && destPoint && !shortestRoute && !calculating && !routeError) {
      handleCalculateRoutes(startPoint, destPoint, profile);
    }
  }, [startPoint, destPoint, handleCalculateRoutes, profile, shortestRoute, calculating, routeError]);

  // Handle Find Route button click
  const onSubmitFindRoute = () => {
    if (!startPoint || !destPoint) {
      setValidationError('Please select both a starting location and destination.');
      return;
    }
    handleCalculateRoutes(startPoint, destPoint, profile);
  };

  // Changing Start clears previous results and re-calculates if destination exists
  const handleSetStart = (coord: Coordinate | null) => {
    setStartPoint(coord);
    setShortestRoute(null);
    setAccessibleRoute(null);
    setValidationError(null);
    if (coord && destPoint) {
      handleCalculateRoutes(coord, destPoint, profile);
    }
  };

  // Changing Destination clears previous results and re-calculates if start exists
  const handleSetDest = (coord: Coordinate | null) => {
    setDestPoint(coord);
    setShortestRoute(null);
    setAccessibleRoute(null);
    setValidationError(null);
    if (startPoint && coord) {
      handleCalculateRoutes(startPoint, coord, profile);
    }
  };

  // Swap Start and Destination
  const handleSwapPoints = () => {
    const prevStart = startPoint;
    const prevDest = destPoint;
    setStartPoint(prevDest);
    setDestPoint(prevStart);
    setClickMode('none');
    setShortestRoute(null);
    setAccessibleRoute(null);
    setValidationError(null);
    if (prevDest && prevStart) {
      handleCalculateRoutes(prevDest, prevStart, profile);
    }
  };

  // Handle Profile Switch
  const handleProfileChange = (newProfile: RouteProfileType) => {
    setProfile(newProfile);
    if (startPoint && destPoint) {
      handleCalculateRoutes(startPoint, destPoint, newProfile);
    }
  };

  // Handle Demo Route Dropdown selection
  const handleSelectScenarioId = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scenarioId = e.target.value;
    if (!scenarioId || !mapConfig) return;
    const scenario = mapConfig.demo_scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;

    setStartPoint(scenario.start);
    setDestPoint(scenario.destination);
    setClickMode('none');
    setSelectedObstacle(null);
    setShortestRoute(null);
    setAccessibleRoute(null);
    handleCalculateRoutes(scenario.start, scenario.destination, profile);
  };

  // Handle Map Click to set Start or Destination
  const handleMapClick = (coord: Coordinate) => {
    if (clickMode === 'start') {
      handleSetStart(coord);
      setClickMode('none');
    } else if (clickMode === 'destination') {
      handleSetDest(coord);
      setClickMode('none');
    } else {
      setSelectedObstacle(null);
      setSelectedSegment(null);
    }
  };

  // Default coordinate if map config is loading
  const centerCoord = mapConfig?.center || { lat: 26.9124, lon: 75.8193 };
  const zoomLevel = mapConfig?.default_zoom || 17;

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row overflow-hidden bg-canvas-950">
      {/* =========================================================================
          LEFT / FLOATING NAVIGATION PLANNER
          ========================================================================= */}
      <div
        className={`w-full lg:w-[380px] xl:w-[410px] lg:h-full z-20 flex flex-col bg-canvas-900/95 backdrop-blur-xl border-r border-surface-border shadow-2xl transition-all duration-300 ${
          mobilePlannerOpen ? 'max-h-[85vh] lg:max-h-full' : 'max-h-12 lg:max-h-full'
        } overflow-hidden`}
      >
        {/* Mobile Header Bar Toggle */}
        <div className="lg:hidden px-4 py-2.5 bg-canvas-950 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-bold text-xs text-white font-mono uppercase tracking-wider">
              Accessible Route Planner
            </span>
          </div>
          <button
            onClick={() => setMobilePlannerOpen(!mobilePlannerOpen)}
            className="p-1 text-slate-400 hover:text-white"
            aria-label="Toggle Route Planner"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                mobilePlannerOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Scrollable Planner Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* Active StreetVision Dynamic Overlay Banner */}
          {confirmedBarriers.length > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-950/70 border border-purple-600/50 text-[11px] text-purple-200 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span>StreetVision: {confirmedBarriers.length} barrier(s) active</span>
              </div>
              <Link
                to="/streetvision"
                className="text-purple-300 hover:text-white underline text-[10px] font-mono"
              >
                Inspect &rarr;
              </Link>
            </div>
          )}

          {/* Demo Scenario Preset Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Demo Preset</span>
              </span>
              {loadingConfig ? (
                <span className="flex items-center gap-1 text-[10px] text-cyan-400">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>Loading...</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Jaipur Precinct</span>
              )}
            </div>

            <div className="relative">
              <select
                onChange={handleSelectScenarioId}
                defaultValue="demo_stairs_avoidance"
                className="w-full bg-canvas-950 border border-surface-border rounded-xl px-3 py-2 text-xs text-slate-200 font-medium appearance-none focus:outline-none focus:border-cyan-500 transition-colors pr-8 cursor-pointer"
              >
                {(mapConfig?.demo_scenarios || []).map((sc) => (
                  <option key={sc.id} value={sc.id} className="bg-canvas-900 text-slate-200">
                    {sc.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Section: FROM / TO Locations */}
          <div className="space-y-2 pt-1 border-t border-surface-border/60">
            {/* Field 1: FROM */}
            <SearchableLocationInput
              label="FROM"
              placeholder="Starting location or pick on map..."
              type="start"
              value={startPoint}
              onChange={handleSetStart}
              isPickingOnMap={clickMode === 'start'}
              onTogglePickOnMap={() =>
                setClickMode(clickMode === 'start' ? 'none' : 'start')
              }
              availableLandmarks={JAIPUR_LANDMARKS}
            />

            {/* Swap Button */}
            <div className="flex justify-center -my-1 relative z-10">
              <button
                type="button"
                onClick={handleSwapPoints}
                className="p-1 rounded-full bg-surface-panel hover:bg-surface-hover text-slate-400 hover:text-cyan-400 border border-surface-border shadow-sm transition-all transform hover:rotate-180"
                title="Swap starting location and destination"
                aria-label="Swap locations"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Field 2: TO */}
            <SearchableLocationInput
              label="TO"
              placeholder="Destination or pick on map..."
              type="destination"
              value={destPoint}
              onChange={handleSetDest}
              isPickingOnMap={clickMode === 'destination'}
              onTogglePickOnMap={() =>
                setClickMode(clickMode === 'destination' ? 'none' : 'destination')
              }
              availableLandmarks={JAIPUR_LANDMARKS}
            />
          </div>

          {/* Section: Travel Mode */}
          <div className="space-y-1.5 pt-1 border-t border-surface-border/60">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Travel Mode
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                {
                  id: 'wheelchair' as RouteProfileType,
                  name: 'Wheelchair',
                  icon: Accessibility,
                  desc: 'Step-Free',
                },
                {
                  id: 'blind_low_vision' as RouteProfileType,
                  name: 'Low Vision',
                  icon: Eye,
                  desc: 'Tactile Guide',
                },
                {
                  id: 'elderly' as RouteProfileType,
                  name: 'Elderly',
                  icon: HeartHandshake,
                  desc: 'Gentle Slope',
                },
                {
                  id: 'general_pedestrian' as RouteProfileType,
                  name: 'Walking',
                  icon: Footprints,
                  desc: 'Direct',
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = profile === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleProfileChange(item.id)}
                    className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-emerald-soft ring-1 ring-emerald-500/50'
                        : 'bg-canvas-950 border-surface-border text-slate-400 hover:text-slate-200 hover:bg-surface-hover/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-semibold leading-tight">{item.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Route Display Switcher: Accessible Route | Shortest Route | Compare Both */}
          <div className="space-y-1.5 pt-1 border-t border-surface-border/60">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Route Display
            </div>

            <div className="grid grid-cols-3 gap-1 bg-canvas-950 p-1 rounded-xl border border-surface-border text-xs font-mono">
              <button
                type="button"
                onClick={() => setRouteDisplayMode('accessible')}
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
                onClick={() => setRouteDisplayMode('shortest')}
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
                onClick={() => setRouteDisplayMode('compare')}
                className={`py-1.5 px-1 rounded-lg transition-all text-center font-medium ${
                  routeDisplayMode === 'compare'
                    ? 'bg-surface-panel text-white border border-surface-border font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Display both routes for comparative analysis"
              >
                <span>Compare</span>
              </button>
            </div>
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-2 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Route Calculation Error */}
          {routeError && (
            <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-800/40 text-red-200 text-xs space-y-1 animate-fadeIn">
              <div className="font-semibold text-red-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Routing Error</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono">{routeError}</p>
            </div>
          )}

          {/* Primary Button: Find Accessible Route */}
          <button
            type="button"
            onClick={onSubmitFindRoute}
            disabled={calculating}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-mono text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-emerald-soft hover:shadow-lg active:scale-[0.99]"
          >
            {calculating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Calculating Route...</span>
              </>
            ) : (
              <>
                <Navigation2 className="w-4 h-4 text-black fill-black" />
                <span>Find Accessible Route</span>
              </>
            )}
          </button>

          {/* Route Results Comparison Card */}
          {shortestRoute && accessibleRoute && (
            <RouteComparisonCard
              shortestRoute={shortestRoute}
              accessibleRoute={accessibleRoute}
              routeDisplayMode={routeDisplayMode}
            />
          )}

          {/* Selected Obstacle Card (When a marker is clicked on the map) */}
          {selectedObstacle && (
            <ObstacleDetailCard
              obstacle={selectedObstacle}
              onClose={() => setSelectedObstacle(null)}
              onHighlightSegment={(segId) => {
                const seg = segments.find((s) => s.id === segId);
                if (seg) setSelectedSegment(seg);
              }}
            />
          )}
        </div>
      </div>

      {/* =========================================================================
          RIGHT / HERO INTERACTIVE MAP (Dominant, Realistic Street Map)
          ========================================================================= */}
      <div className="flex-1 h-full min-h-[480px] relative">
        <PedestrianMap
          center={centerCoord}
          zoom={zoomLevel}
          segments={segments}
          obstacles={allObstacles}
          selectedObstacle={selectedObstacle}
          onSelectObstacle={(obs) => {
            setSelectedObstacle(obs);
            setSelectedSegment(null);
            setMobilePlannerOpen(true);
          }}
          shortestRoute={shortestRoute}
          accessibleRoute={accessibleRoute}
          routeDisplayMode={routeDisplayMode}
          startPoint={startPoint}
          destPoint={destPoint}
          onMapClick={handleMapClick}
          onSelectSegment={(seg) => setSelectedSegment(seg)}
          selectedSegment={selectedSegment}
          activeFilter={activeFilter}
          onFilterChange={(f) => setActiveFilter(f)}
          showSegmentsLayer={showSegmentsLayer}
          onToggleSegmentsLayer={() => setShowSegmentsLayer(!showSegmentsLayer)}
          activeProfile={profile}
        />
      </div>
    </div>
  );
};
