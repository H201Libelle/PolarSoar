/**
 * Performance metrics extracted from a polar curve.
 *
 *   - minSink:   minimum of the polar w(v) over the operating range
 *   - bestLD:    maximum of v/w (note: w in m/s, so L/D = v/w directly)
 *   - speedToFly (MacCready): speed where the tangent from (v=0, w=-MC)
 *                touches the polar curve. Solves for v such that
 *                  d w(v) / dv = (w(v) + MC) / v
 *                Equivalently: tangent line from the climb-rate point.
 *   - xcSpeed:   expected average cross-country speed at MacCready setting MC.
 *                Classic result: V_xc = MC * v_stf / (MC + sink_at_v_stf)
 */

import type { PolarPoint, PerformanceMetrics } from '../data/types';
import { buildSpline, sinkAt, type PolarSpline } from './polar';

const GOLDEN = (Math.sqrt(5) - 1) / 2; // ~0.618

/** Golden-section minimization of a unimodal function on [a, b]. */
function goldenMin(f: (x: number) => number, a: number, b: number, tol = 1e-4): number {
  let x1 = b - GOLDEN * (b - a);
  let x2 = a + GOLDEN * (b - a);
  let f1 = f(x1);
  let f2 = f(x2);
  while (b - a > tol) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = b - GOLDEN * (b - a);
      f1 = f(x1);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = a + GOLDEN * (b - a);
      f2 = f(x2);
    }
  }
  return (a + b) / 2;
}

/** v at minimum sink, scanning the spline domain. */
export function findMinSink(spline: PolarSpline): { v: number; w: number } {
  const v = goldenMin((x) => sinkAt(spline, x), spline.vMin, spline.vMax);
  return { v, w: sinkAt(spline, v) };
}

/** v at best L/D = max v/w. We minimize -v/w. */
export function findBestLD(spline: PolarSpline): { v: number; w: number; ld: number } {
  // L/D undefined as v -> 0 since w stays positive. Start search above vMinSink-ish.
  // Safe lower bound: 1.05 * vMinSink to avoid the climb-impossible region.
  const minSink = findMinSink(spline);
  const lo = Math.max(spline.vMin, minSink.v * 1.0);
  const v = goldenMin((x) => -x / sinkAt(spline, x), lo, spline.vMax);
  const w = sinkAt(spline, v);
  return { v, w, ld: v / w };
}

/**
 * MacCready speed-to-fly: tangent from (0, -mc) to the polar.
 * We minimize (w + mc) / v over v in (0, vMax].
 */
export function findSpeedToFly(spline: PolarSpline, mc: number): { v: number; w: number } {
  if (mc < 0) throw new Error('MacCready setting must be >= 0');
  const minSink = findMinSink(spline);
  // For mc=0, speed-to-fly is best L/D speed.
  const lo = Math.max(spline.vMin, minSink.v);
  const v = goldenMin((x) => (sinkAt(spline, x) + mc) / x, lo, spline.vMax);
  return { v, w: sinkAt(spline, v) };
}

/** Average XC speed at MacCready setting mc. */
export function crossCountrySpeed(stfV: number, stfW: number, mc: number): number {
  if (mc <= 0) return 0;
  return (mc * stfV) / (mc + stfW);
}

/**
 * Compute all metrics for a (mass-and-contamination-adjusted) polar.
 * Caller is responsible for already having applied scalePolarByMass and
 * applyContamination to the points.
 */
export function computeMetrics(
  adjustedPoints: PolarPoint[],
  totalMass: number,
  wingArea: number,
  macCready: number
): PerformanceMetrics {
  const spline = buildSpline(adjustedPoints);
  const minSink = findMinSink(spline);
  const bestLD = findBestLD(spline);
  const stf = findSpeedToFly(spline, macCready);
  const xc = crossCountrySpeed(stf.v, stf.w, macCready);

  return {
    totalMass,
    wingLoading: totalMass / wingArea,
    minSink: minSink.w,
    vMinSink: minSink.v,
    bestLD: bestLD.ld,
    vBestLD: bestLD.v,
    speedToFly: stf.v,
    xcSpeed: xc,
  };
}
