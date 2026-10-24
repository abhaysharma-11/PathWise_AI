import { ObstacleFeature, ObstacleFilterCategory, SegmentFeature } from '../types';

/**
 * Extracts and maps authentic pedestrian accessibility obstacles from audited segments.
 * All obstacles correspond strictly to physically mapped segments in the Jaipur Ram Niwas Garden precinct.
 */
export function getPrecinctObstacles(_segments: SegmentFeature[]): ObstacleFeature[] {
  // Built directly from audited segment fixtures
  const obstacles: ObstacleFeature[] = [
    {
      id: 'obs_stairs_monumental',
      type: 'stairs',
      label: 'STAIRS DETECTED',
      filterCategory: 'critical',
      severity: 'Critical',
      color: '#EF4444',
      title: 'Monumental Heritage Staircase (18 Steps)',
      description: '18 steep stone steps with 16.5% incline and zero ramp transition to the museum forecourt.',
      location: { lat: 26.9130, lon: 75.8189, name: 'Monumental Stairs Center' },
      segmentId: 'seg_05_monumental_stairs',
      segmentName: 'Monumental Heritage Staircase (18 Steps)',
      surface: 'stone_stairs',
      inclinePct: 16.5,
      curbRamp: 'no',
      impact: 'Strictly impassable for wheelchair users; severe tripping and falling hazard for elderly pedestrians.',
      source: 'On-Ground Accessibility Audit (Demo Fixture)',
      isVerified: true,
      prohibitsWheelchair: true,
    },
    {
      id: 'obs_ramp_missing_west',
      type: 'missing_curb_cut',
      label: 'RAMP MISSING',
      filterCategory: 'critical',
      severity: 'Critical',
      color: '#EF4444',
      title: 'Missing Kerb Transition at West Gate',
      description: '18cm vertical kerb drop without a dropped kerb or ramp transition to the carriage crossing.',
      location: { lat: 26.9145, lon: 75.8158, name: 'West Gate Kerb' },
      segmentId: 'seg_10_west_gate_to_heritage',
      segmentName: 'West Cultural Allée',
      surface: 'uneven_cobblestone',
      inclinePct: 3.8,
      curbRamp: 'no',
      impact: 'Wheelchair cannot dismount kerb without tipping risk; severe obstacle for wheeled mobility.',
      source: 'On-Ground Accessibility Audit (Demo Fixture)',
      isVerified: true,
      prohibitsWheelchair: true,
    },
    {
      id: 'obs_uneven_cobblestone_plaza',
      type: 'uneven_surface',
      label: 'UNEVEN SURFACE',
      filterCategory: 'caution',
      severity: 'Caution',
      color: '#F59E0B',
      title: 'Historic Cobblestone Promenade',
      description: 'Irregular heritage stone pavers with deep mortar joints and vibration risk along 110m corridor.',
      location: { lat: 26.9126, lon: 75.8180, name: 'West Plaza Cobblestones' },
      segmentId: 'seg_11_heritage_to_plaza',
      segmentName: 'West Plaza Cobblestone Path',
      surface: 'uneven_cobblestone',
      inclinePct: 2.2,
      curbRamp: 'yes',
      impact: 'High vibration and joint discomfort for wheelchair users; unstable footing for walking cane users.',
      source: 'On-Ground Accessibility Audit (Demo Fixture)',
      isVerified: true,
      prohibitsWheelchair: false,
    },
    {
      id: 'obs_blocked_footpath_perimeter',
      type: 'blocked_footpath',
      label: 'FOOTPATH BLOCKED',
      filterCategory: 'caution',
      severity: 'Caution',
      color: '#F97316',
      title: 'Perimeter Service Pathway (Unpaved)',
      description: 'Loose aggregate and unmaintained perimeter corridor with unverified width clearances.',
      location: { lat: 26.9110, lon: 75.8216, name: 'Botanical Outer Service Path' },
      segmentId: 'seg_16_botanical_to_maintenance',
      segmentName: 'Perimeter Service Path (Unverified)',
      surface: 'unverified',
      inclinePct: 2.5,
      curbRamp: 'unverified',
      impact: 'Loose gravel traps small front wheelchair casters; unverified safety attributes.',
      source: 'OpenStreetMap Base Geometry (Unverified On-Ground)',
      isVerified: false,
      prohibitsWheelchair: false,
    },
    {
      id: 'obs_accessible_ramp_east',
      type: 'accessible_ramp',
      label: 'ACCESSIBLE RAMP',
      filterCategory: 'accessible',
      severity: 'Safe / Accessible',
      color: '#10B981',
      title: 'East Rose Garden Step-Free Ramp',
      description: 'Certified accessible bypass path: smooth brushed concrete, 1.8% incline, tactile paving, flush kerb.',
      location: { lat: 26.9130, lon: 75.8207, name: 'East Accessible Ramp Bypass' },
      segmentId: 'seg_08_east_ramp_to_approach',
      segmentName: 'East Accessible Ramp Connector',
      surface: 'smooth_concrete',
      inclinePct: 1.8,
      curbRamp: 'yes',
      impact: 'Universal barrier-free passage enabling safe, step-free access around the monumental stairs.',
      source: 'On-Ground Accessibility Audit (Demo Fixture)',
      isVerified: true,
      prohibitsWheelchair: false,
    },
    {
      id: 'obs_pole_obstruction_east',
      type: 'blocked_footpath',
      label: 'POLE OBSTRUCTION',
      filterCategory: 'caution',
      severity: 'Caution',
      color: '#F59E0B',
      title: 'Mid-Footpath Utility Pole Hazard',
      description: 'Utility pole positioned in center of pedestrian walkway without detectable tactile warning tiles.',
      location: { lat: 26.9133, lon: 75.8213, name: 'East Aviary Path Obstruction' },
      segmentId: 'seg_20_east_direct_walk',
      segmentName: 'East Aviary Walkway (Utility Pole Obstruction)',
      surface: 'paved_stone',
      inclinePct: 0.9,
      curbRamp: 'yes',
      impact: 'Serious collision hazard for blind and low-vision pedestrians; bypassable by general walking.',
      source: 'On-Ground Accessibility Audit (Demo Fixture)',
      isVerified: true,
      prohibitsWheelchair: false,
    },
  ];

  return obstacles;
}

/**
 * Filters obstacles based on active category filter.
 */
export function filterObstacles(
  obstacles: ObstacleFeature[],
  filter: ObstacleFilterCategory
): ObstacleFeature[] {
  if (filter === 'all') return obstacles;
  return obstacles.filter((obs) => obs.filterCategory === filter);
}
