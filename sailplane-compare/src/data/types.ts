/**
 * Core data model for sailplane performance.
 *
 * Units convention (SI throughout, convert at UI edge only):
 *   - speed: m/s (true airspeed, sea level standard)
 *   - sink:  m/s (positive number = descending)
 *   - mass:  kg
 *   - area:  m^2
 *   - span:  m
 */

export interface PolarPoint {
  /** True airspeed in m/s */
  v: number;
  /** Sink rate in m/s (positive = descending) */
  w: number;
}

export type DataSource = 'manufacturer' | 'flight_test' | 'idaflieg' | 'estimated' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low';

export interface Glider {
  /** Stable unique ID, e.g. "asw-27b" */
  id: string;
  manufacturer: string;
  model: string;
  /** FAI competition class, e.g. "15m", "18m", "Open", "Standard", "Club" */
  competitionClass?: string;
  /** Year of first flight or certification */
  year?: number;

  // --- geometry ---
  /** Wingspan in meters */
  wingspan: number;
  /** Wing reference area in m^2 */
  wingArea: number;
  /** Aspect ratio (computed if omitted: span^2 / area) */
  aspectRatio?: number;
  hasWinglets: boolean;
  /** Airfoil designation, e.g. "DU 89-134/14" */
  airfoil?: string;

  // --- masses ---
  /** Empty mass in kg */
  emptyMass?: number;
  /** Maximum takeoff mass in kg */
  mtow?: number;
  /** Maximum water ballast in kg (0 if none) */
  maxWaterBallast?: number;

  // --- polar ---
  /** Reference mass at which polarPoints were measured, in kg */
  referenceMass: number;
  /** Raw polar measurement points. Need >= 3 for cubic spline. */
  polarPoints: PolarPoint[];
  /** Stall speed at referenceMass, m/s (optional but useful for plot bounds) */
  vStall?: number;
  /** Vne (never exceed) at referenceMass, m/s (optional) */
  vne?: number;

  // --- provenance ---
  source: DataSource;
  /** Short source code from the database, e.g. "IDA", "MD" */
  sourceId?: string;
  /** Human-readable source label, e.g. "Idaflieg flight-test (D-4525)" */
  sourceLabel?: string;
  confidence?: Confidence;
  /** Free-text notes, citations, caveats */
  notes?: string;
}

/**
 * The user-controlled flight configuration applied on top of a Glider.
 * Everything here is independent of which glider is selected (except mass,
 * which gets clamped per glider).
 */
export interface FlightConfig {
  /** Pilot + parachute + small items, kg */
  pilotMass: number;
  /** Water ballast loaded, kg (will be clamped to glider.maxWaterBallast) */
  waterBallast: number;
  /** Bug contamination 0..1 (0 = clean, 1 = heavy bugs) */
  bugFactor: number;
  /** Rain contamination 0..1 */
  rainFactor: number;
  /** Ice/frost contamination 0..1 */
  iceFactor: number;
  /** MacCready setting in m/s (expected next thermal climb rate) */
  macCready: number;
}

export const DEFAULT_FLIGHT_CONFIG: FlightConfig = {
  pilotMass: 85,
  waterBallast: 0,
  bugFactor: 0,
  rainFactor: 0,
  iceFactor: 0,
  macCready: 1.5,
};

/** Computed performance metrics for a glider in a given configuration. */
export interface PerformanceMetrics {
  /** Total flying mass, kg */
  totalMass: number;
  /** Wing loading, kg/m^2 */
  wingLoading: number;
  /** Minimum sink rate, m/s */
  minSink: number;
  /** Speed at minimum sink, m/s */
  vMinSink: number;
  /** Best L/D ratio (dimensionless) */
  bestLD: number;
  /** Speed at best L/D, m/s */
  vBestLD: number;
  /** Speed-to-fly for current MacCready, m/s */
  speedToFly: number;
  /** Expected average cross-country speed at this MC setting, m/s */
  xcSpeed: number;
}
