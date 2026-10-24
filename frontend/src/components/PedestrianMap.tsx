import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Coordinate,
  SegmentFeature,
  RouteResponse,
  RouteProfileType,
  RouteDisplayMode,
  ObstacleFeature,
  ObstacleFilterCategory,
} from '../types';
import { Filter, Layers, RotateCcw } from 'lucide-react';

interface PedestrianMapProps {
  center: Coordinate;
  zoom: number;
  segments: SegmentFeature[];
  obstacles: ObstacleFeature[];
  selectedObstacle: ObstacleFeature | null;
  onSelectObstacle: (obstacle: ObstacleFeature | null) => void;
  shortestRoute: RouteResponse | null;
  accessibleRoute: RouteResponse | null;
  routeDisplayMode: RouteDisplayMode;
  startPoint: Coordinate | null;
  destPoint: Coordinate | null;
  onMapClick: (coord: Coordinate) => void;
  onSelectSegment: (segment: SegmentFeature | null) => void;
  selectedSegment: SegmentFeature | null;
  activeFilter: ObstacleFilterCategory;
  onFilterChange: (filter: ObstacleFilterCategory) => void;
  showSegmentsLayer: boolean;
  onToggleSegmentsLayer?: () => void;
  activeProfile?: RouteProfileType;
}

export const PedestrianMap: React.FC<PedestrianMapProps> = ({
  center,
  zoom,
  segments,
  obstacles,
  selectedObstacle,
  onSelectObstacle,
  shortestRoute,
  accessibleRoute,
  routeDisplayMode,
  startPoint,
  destPoint,
  onMapClick,
  onSelectSegment,
  selectedSegment,
  activeFilter,
  onFilterChange,
  showSegmentsLayer,
  onToggleSegmentsLayer,
  activeProfile,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups for dynamic lifecycle
  const segmentsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const highlightSegmentLayerRef = useRef<L.LayerGroup | null>(null);
  const casingLayerRef = useRef<L.Polyline | null>(null);
  const shortestRouteLayerRef = useRef<L.Polyline | null>(null);
  const accessibleRouteLayerRef = useRef<L.Polyline | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const obstaclesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const obstacleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const lastFocusedRouteSigRef = useRef<string | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lon],
      zoom: zoom,
      minZoom: 14,
      maxZoom: 19,
      zoomControl: false, // Clean custom position
    });

    // Legitimate Detailed OpenStreetMap Tile Provider with proper attribution
    const osmTileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    );
    osmTileLayer.addTo(map);

    // Zoom control at bottom right (consumer navigation style)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Force Leaflet recalculation after layout settles
    const invalidateTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    // Initialize layer groups in z-order
    segmentsLayerGroupRef.current = L.layerGroup().addTo(map);
    highlightSegmentLayerRef.current = L.layerGroup().addTo(map);
    obstaclesLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

    // Map Click Listener
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick({
        lat: parseFloat(e.latlng.lat.toFixed(5)),
        lon: parseFloat(e.latlng.lng.toFixed(5)),
        name: `Map Point (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`,
      });
    });

    mapInstanceRef.current = map;

    return () => {
      clearTimeout(invalidateTimer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run once on mount

  // Sync Center and Zoom when initial config arrives
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([center.lat, center.lon], zoom);
  }, [center.lat, center.lon, zoom]);

  // Render Base Pedestrian Network Segments (if toggled on)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = segmentsLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (!showSegmentsLayer) return;

    segments.forEach((seg) => {
      const isSelected = selectedSegment?.id === seg.id;
      const isStair = seg.has_stairs || seg.barrier === 'stairs';
      const isUneven = seg.barrier === 'uneven_surface';

      let color = '#475569'; // Subtle slate
      let weight = 2.5;
      let opacity = 0.5;
      let dashArray: string | undefined = undefined;

      if (isStair) {
        color = '#EF4444'; // Red for stairs
        dashArray = '3, 3';
        weight = 3;
        opacity = 0.75;
      } else if (isUneven) {
        color = '#F59E0B'; // Amber for uneven
        dashArray = '5, 5';
        weight = 3;
        opacity = 0.7;
      }

      if (isSelected) {
        color = '#0284C7';
        weight = 5;
        opacity = 1.0;
      }

      const poly = L.polyline(seg.coordinates, {
        color,
        weight,
        opacity,
        dashArray,
      });

      poly.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectSegment(seg);
      });

      poly.bindTooltip(
        `<div class="text-xs font-sans">
          <div class="font-bold text-white">${seg.name || seg.id}</div>
          <div class="text-slate-300">Surface: ${seg.surface} • Slope: ${seg.incline_pct}%</div>
          ${seg.has_stairs ? '<div class="text-red-400 font-bold">⚠️ Contains Steps/Stairs</div>' : ''}
        </div>`,
        { sticky: true }
      );

      group.addLayer(poly);
    });
  }, [segments, selectedSegment, showSegmentsLayer, onSelectSegment]);

  // Highlight Affected Road Segment (when obstacle or segment is selected, or on shortest route barriers)
  useEffect(() => {
    const group = highlightSegmentLayerRef.current;
    if (!group) return;

    group.clearLayers();

    // 1. Explicitly selected obstacle or segment
    const targetSegId = selectedObstacle?.segmentId || selectedSegment?.id;
    if (targetSegId) {
      const matchedSeg = segments.find((s) => s.id === targetSegId);
      if (matchedSeg) {
        const highlightColor = selectedObstacle?.color || '#0284C7';
        const glowPoly = L.polyline(matchedSeg.coordinates, {
          color: highlightColor,
          weight: 10,
          opacity: 0.35,
        });
        const innerPoly = L.polyline(matchedSeg.coordinates, {
          color: highlightColor,
          weight: 5,
          opacity: 1.0,
        });
        group.addLayer(glowPoly);
        group.addLayer(innerPoly);
        return;
      }
    }

    // 2. Shortest route barrier segments highlighting (tasteful red/amber glow)
    if (shortestRoute && shortestRoute.barriers_encountered.length > 0) {
      shortestRoute.barriers_encountered.forEach((barrier) => {
        const matchedSeg = segments.find((s) => {
          if (s.barrier === barrier.type) return true;
          if (s.has_stairs && barrier.type === 'stairs') return true;
          return s.coordinates.some(
            (c) =>
              Math.abs(c[0] - barrier.location.lat) < 0.0008 &&
              Math.abs(c[1] - barrier.location.lon) < 0.0008
          );
        });

        if (matchedSeg) {
          const barrierColor = barrier.severity === 'critical' ? '#EF4444' : '#F59E0B';
          const glowPoly = L.polyline(matchedSeg.coordinates, {
            color: barrierColor,
            weight: 8,
            opacity: 0.3,
          });
          const innerPoly = L.polyline(matchedSeg.coordinates, {
            color: barrierColor,
            weight: 3.5,
            opacity: 0.85,
            dashArray: '5, 5',
          });
          group.addLayer(glowPoly);
          group.addLayer(innerPoly);
        }
      });
    }
  }, [selectedObstacle, selectedSegment, segments, shortestRoute]);

  // Render Compact Obstacle Markers with Contextual Popups
  useEffect(() => {
    const group = obstaclesLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();
    obstacleMarkersRef.current.clear();

    // Filter obstacles based on active filter
    const visibleObstacles = obstacles.filter((obs) => {
      if (activeFilter === 'all') return true;
      return obs.filterCategory === activeFilter;
    });

    visibleObstacles.forEach((obs) => {
      const isSelected = selectedObstacle?.id === obs.id;

      // Icon symbol based on type
      let iconSymbol = '⚠️';
      if (obs.type === 'stairs') iconSymbol = '🪜';
      else if (obs.type === 'missing_curb_cut' || obs.type === ('missing_curb_ramp' as any)) iconSymbol = '🚫';
      else if (obs.type === 'uneven_surface') iconSymbol = '〰️';
      else if (
        obs.type === 'blocked_footpath' ||
        obs.type === ('parked_vehicle_blocking_footpath' as any) ||
        obs.type === ('pole_obstruction' as any) ||
        obs.type === ('broken_footpath' as any)
      ) iconSymbol = '🚧';
      else if (obs.type === 'accessible_ramp') iconSymbol = '♿';

      // Compact 28px circular marker with high-contrast border and soft shadow
      const markerHtml = `
        <div class="custom-compact-obstacle-pin cursor-pointer transition-transform duration-200 transform hover:scale-125 ${
          isSelected ? 'scale-125' : ''
        }">
          <div style="
            background-color: ${obs.color};
            border: 2.5px solid #FFFFFF;
            color: #FFFFFF;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5), 0 0 0 ${isSelected ? '3px #38BDF8' : '1px rgba(0,0,0,0.2)'};
          ">
            <span>${iconSymbol}</span>
          </div>
        </div>
      `;

      const obstacleIcon = L.divIcon({
        className: 'custom-obstacle-marker-container',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([obs.location.lat, obs.location.lon], { icon: obstacleIcon });

      // Determine affected mobility profile for contextual popup
      const affectedProfile =
        obs.type === 'stairs' || obs.type === 'missing_curb_cut'
          ? 'Wheelchair (Access Restricted) • Elderly (Severe)'
          : obs.type === 'uneven_surface'
          ? 'Elderly (Trip Hazard) • Wheelchair (Vibration)'
          : obs.type === 'blocked_footpath'
          ? 'Blind / Low Vision (Hazard) • Wheelchair'
          : 'General Pedestrian Caution';

      const isTemporary =
        obs.source.toLowerCase().includes('report') ||
        obs.title.toLowerCase().includes('vehicle') ||
        obs.title.toLowerCase().includes('temporary');

      // Compact Contextual Popup (Mentor Part 5 requirement)
      const popupHtml = `
        <div class="p-3 font-sans max-w-[270px] text-slate-100">
          <div class="flex items-center gap-1.5 font-bold text-xs" style="color: ${obs.color}">
            <span>${iconSymbol}</span>
            <span>${obs.label}</span>
          </div>
          <div class="text-xs font-bold text-white mt-1 leading-snug">
            ${obs.title}
          </div>
          <p class="text-[11px] text-slate-300 mt-1 leading-relaxed">
            ${obs.description}
          </p>
          <div class="mt-2.5 pt-2 border-t border-slate-700/60 text-[10px] space-y-1 font-mono text-slate-300">
            <div><strong class="text-slate-400">Affected Profile:</strong> <span class="text-amber-300">${affectedProfile}</span></div>
            <div><strong class="text-slate-400">Status:</strong> ${isTemporary ? 'Temporary Street Obstacle' : 'Persistent Heritage Feature'} • ${obs.isVerified ? 'Human Verified' : 'Ground Surveyed'}</div>
            <div><strong class="text-slate-400">Evidence Source:</strong> ${obs.source}</div>
          </div>
          <div class="mt-2 text-[10px] text-emerald-400 font-sans font-semibold flex items-center gap-1">
            <span>✓ Alternative accessible route available</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 290, className: 'custom-barrier-popup' });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectObstacle(obs);
      });

      marker.bindTooltip(
        `<div class="text-xs font-sans">
          <div class="font-bold text-white flex items-center gap-1">
            <span>${obs.label}</span>
            <span class="text-[10px] text-slate-400">(${obs.severity})</span>
          </div>
          <div class="text-slate-300 text-[11px] mt-0.5">${obs.title}</div>
          <div class="text-[10px] text-cyan-400 font-mono mt-1">Click to view details & popup</div>
        </div>`,
        { sticky: true }
      );

      obstacleMarkersRef.current.set(obs.id, marker);
      group.addLayer(marker);
    });
  }, [obstacles, activeFilter, selectedObstacle, onSelectObstacle]);

  // Auto-focus on primary known barrier ONCE after route calculation
  useEffect(() => {
    if (!shortestRoute || !mapInstanceRef.current) return;
    const sig = `${shortestRoute.node_ids.join('_')}_${activeProfile}`;
    if (lastFocusedRouteSigRef.current === sig) return;
    lastFocusedRouteSigRef.current = sig;

    if (shortestRoute.barriers_encountered.length > 0) {
      const primaryBarrier = shortestRoute.barriers_encountered[0];
      // Find matching obstacle by coordinates or type
      const matched = obstacles.find(
        (o) =>
          Math.abs(o.location.lat - primaryBarrier.location.lat) < 0.0006 &&
          Math.abs(o.location.lon - primaryBarrier.location.lon) < 0.0006
      ) || obstacles.find((o) => o.type === primaryBarrier.type);

      if (matched) {
        const marker = obstacleMarkersRef.current.get(matched.id);
        if (marker) {
          const timer = setTimeout(() => {
            marker.openPopup();
          }, 350);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [shortestRoute, activeProfile, obstacles]);

  // Render Routes according to Route Display Switcher (Accessible | Shortest | Compare Both)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove previous polylines
    if (shortestRouteLayerRef.current) {
      map.removeLayer(shortestRouteLayerRef.current);
      shortestRouteLayerRef.current = null;
    }
    if (accessibleRouteLayerRef.current) {
      map.removeLayer(accessibleRouteLayerRef.current);
      accessibleRouteLayerRef.current = null;
    }
    if (casingLayerRef.current) {
      map.removeLayer(casingLayerRef.current);
      casingLayerRef.current = null;
    }

    const bounds = L.latLngBounds([]);

    // Option A: ACCESSIBLE ROUTE (Show only actual calculated accessible route in prominent emerald)
    if (routeDisplayMode === 'accessible' && accessibleRoute && accessibleRoute.coordinates.length > 0) {
      // Subtle realistic casing
      const casing = L.polyline(accessibleRoute.coordinates, {
        color: '#064E3B',
        weight: 9,
        opacity: 0.7,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Core prominent emerald continuous line
      const accPoly = L.polyline(accessibleRoute.coordinates, {
        color: '#10B981',
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      accPoly.bindTooltip(
        `<div class="font-sans text-xs font-bold text-emerald-400">
          Accessible Route: ${accessibleRoute.distance_meters}m (Step-Free)
        </div>`,
        { sticky: true }
      );

      casingLayerRef.current = casing;
      accessibleRouteLayerRef.current = accPoly;
      accessibleRoute.coordinates.forEach((pt) => bounds.extend(pt));
    }

    // Option B: SHORTEST ROUTE (Show only actual calculated shortest route in clear cyan line)
    else if (routeDisplayMode === 'shortest' && shortestRoute && shortestRoute.coordinates.length > 0) {
      // Subtle casing
      const casing = L.polyline(shortestRoute.coordinates, {
        color: '#164E63',
        weight: 9,
        opacity: 0.7,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Core clear cyan line
      const shortPoly = L.polyline(shortestRoute.coordinates, {
        color: '#06B6D4',
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      shortPoly.bindTooltip(
        `<div class="font-sans text-xs font-bold text-cyan-400">
          Shortest Route: ${shortestRoute.distance_meters}m
          ${shortestRoute.barriers_encountered.length > 0 ? '<br/><span class="text-red-400 text-[11px] font-normal">⚠️ ' + shortestRoute.barriers_encountered.length + ' obstacle(s) encountered</span>' : ''}
        </div>`,
        { sticky: true }
      );

      casingLayerRef.current = casing;
      shortestRouteLayerRef.current = shortPoly;
      shortestRoute.coordinates.forEach((pt) => bounds.extend(pt));
    }

    // Option C: COMPARE BOTH (Display both routes with distinguishable line styles and layering)
    else if (routeDisplayMode === 'compare') {
      const isIdentical = accessibleRoute?.is_identical_to_shortest;

      if (isIdentical && accessibleRoute && accessibleRoute.coordinates.length > 0) {
        // Shared identical route
        const casing = L.polyline(accessibleRoute.coordinates, {
          color: '#064E3B',
          weight: 9,
          opacity: 0.7,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        const sharedPoly = L.polyline(accessibleRoute.coordinates, {
          color: '#10B981',
          weight: 6,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        sharedPoly.bindTooltip(
          `<div class="font-sans text-xs font-bold text-emerald-400">
            Identical Safe Route: ${accessibleRoute.distance_meters}m (Both algorithms selected this path)
          </div>`,
          { sticky: true }
        );

        casingLayerRef.current = casing;
        accessibleRouteLayerRef.current = sharedPoly;
        accessibleRoute.coordinates.forEach((pt) => bounds.extend(pt));
      } else {
        // Distinct routes: Solid Emerald for Accessible, Dashed Cyan for Shortest
        if (accessibleRoute && accessibleRoute.coordinates.length > 0) {
          const casing = L.polyline(accessibleRoute.coordinates, {
            color: '#064E3B',
            weight: 9,
            opacity: 0.7,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          const accPoly = L.polyline(accessibleRoute.coordinates, {
            color: '#10B981',
            weight: 6,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          accPoly.bindTooltip(
            `<div class="font-sans text-xs font-bold text-emerald-400">
              Accessible Route: ${accessibleRoute.distance_meters}m (Step-Free Bypass)
            </div>`,
            { sticky: true }
          );

          casingLayerRef.current = casing;
          accessibleRouteLayerRef.current = accPoly;
          accessibleRoute.coordinates.forEach((pt) => bounds.extend(pt));
        }

        if (shortestRoute && shortestRoute.coordinates.length > 0) {
          const shortPoly = L.polyline(shortestRoute.coordinates, {
            color: '#06B6D4',
            weight: 4,
            opacity: 1.0,
            dashArray: '8, 8',
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          shortPoly.bindTooltip(
            `<div class="font-sans text-xs font-bold text-cyan-400">
              Shortest Route: ${shortestRoute.distance_meters}m
              ${shortestRoute.barriers_encountered.length > 0 ? '<br/><span class="text-red-400 text-[11px] font-normal">⚠️ ' + shortestRoute.barriers_encountered.length + ' obstacle(s)</span>' : ''}
            </div>`,
            { sticky: true }
          );

          shortestRouteLayerRef.current = shortPoly;
          shortestRoute.coordinates.forEach((pt) => bounds.extend(pt));
        }
      }
    }

    // Automatically fit map to calculated route bounds with appropriate padding
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18, animate: true });
    }
  }, [shortestRoute, accessibleRoute, routeDisplayMode]);

  // Render Compact Waypoint Markers (Start: S, Destination: D)
  useEffect(() => {
    const group = markersLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // Compact Start Marker ('S')
    if (startPoint) {
      const startIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            background-color: #047857;
            border: 2.5px solid #FFFFFF;
            color: #FFFFFF;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 13px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.45);
          ">
            S
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([startPoint.lat, startPoint.lon], { icon: startIcon });
      marker.bindTooltip(
        `<div class="text-xs font-bold text-emerald-400">Start: ${startPoint.name || 'Origin'}</div>`,
        { permanent: false }
      );
      group.addLayer(marker);
    }

    // Compact Destination Marker ('D')
    if (destPoint) {
      const destIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            background-color: #0E7490;
            border: 2.5px solid #FFFFFF;
            color: #FFFFFF;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 13px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.45);
          ">
            D
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([destPoint.lat, destPoint.lon], { icon: destIcon });
      marker.bindTooltip(
        `<div class="text-xs font-bold text-cyan-400">Destination: ${destPoint.name || 'Destination'}</div>`,
        { permanent: false }
      );
      group.addLayer(marker);
    }
  }, [startPoint, destPoint]);

  // Recenter helper
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([center.lat, center.lon], zoom, { animate: true });
  };

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-canvas-950 flex flex-col">
      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full flex-1 z-10" />

      {/* Floating Top-Right: Obstacle Filter & Map Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2">
        {/* Obstacle Filter Pills */}
        <div className="flex items-center gap-1 bg-canvas-900/95 backdrop-blur-md p-1 rounded-xl border border-surface-border shadow-geo-card">
          <span className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Filter:</span>
          </span>

          {(
            [
              { id: 'all', label: 'All' },
              { id: 'critical', label: 'Critical' },
              { id: 'caution', label: 'Caution' },
              { id: 'accessible', label: 'Accessible' },
            ] as { id: ObstacleFilterCategory; label: string }[]
          ).map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-black font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover/50'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Network Segments Grid Toggle */}
        {onToggleSegmentsLayer && (
          <button
            onClick={onToggleSegmentsLayer}
            className={`px-3 py-2 rounded-xl text-xs font-mono border backdrop-blur-md transition-all flex items-center gap-1.5 shadow-geo-card ${
              showSegmentsLayer
                ? 'bg-canvas-900/95 border-cyan-500/50 text-cyan-300'
                : 'bg-canvas-900/80 border-surface-border text-slate-400 hover:text-white'
            }`}
            title="Toggle pedestrian graph network pathways"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pathways</span>
          </button>
        )}

        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className="px-3 py-2 rounded-xl bg-canvas-900/95 backdrop-blur-md border border-surface-border text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all shadow-geo-card text-xs font-mono flex items-center gap-1.5"
          title="Recenter map to Jaipur Ram Niwas Precinct"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Recenter</span>
        </button>
      </div>

      {/* Floating Bottom-Left: Dynamic Mode Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-canvas-900/95 backdrop-blur-md border border-surface-border p-2.5 rounded-xl shadow-geo-card text-[11px] font-mono flex items-center gap-3.5 pointer-events-auto">
        {(routeDisplayMode === 'accessible' || routeDisplayMode === 'compare') && (
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            <span className="text-slate-200">Accessible (Step-Free)</span>
          </div>
        )}

        {(routeDisplayMode === 'shortest' || routeDisplayMode === 'compare') && (
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1.5 rounded-full bg-cyan-400 inline-block shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            <span className="text-slate-200">Shortest Route</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-slate-400 border-l border-surface-border pl-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span>Obstacle</span>
        </div>
      </div>
    </div>
  );
};
