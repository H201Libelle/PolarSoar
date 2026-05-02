/**
 * Contamination model for sailplane polars.
 *
 * Physical basis:
 *   - Bugs:  primarily increase parasitic drag, mostly at high speed.
 *            Tip-strike studies (Boermans, Delft) show ~5-10% L/D loss for
 *            "moderate" bug contamination on modern laminar airfoils.
 *   - Rain:  trips boundary layer to turbulent, increases skin friction
 *            globally. Effect strongest at low CL (high speed). Typical
 *            literature values: 5-15% sink rate increase.
 *   - Ice:   most severe; alters airfoil shape, can destroy laminar bucket.
 *            Easily 30%+ degradation when present.
 *
 * Model: each contamination factor f in [0, 1] linearly scales sink rate.
 * The high-speed end of the polar is penalized more than the low-speed end
 * via a CL-dependent weight (rough proxy: penalty grows linearly with v/vMin).
 *
 * This is a deliberately simple, transparent v1 model. v2 should incorporate
 * actual published wind-tunnel data per airfoil class. Document this clearly
 * in the About page.
 */

import type { PolarPoint } from '../data/types';

export interface ContaminationFactors {
  /** 0..1 */
  bugFactor: number;
  /** 0..1 */
  rainFactor: number;
  /** 0..1 */
  iceFactor: number;
}

/** Maximum sink-rate multipliers when factor = 1 (full contamination). */
export const CONTAMINATION_PENALTY = {
  bugMaxIncrease: 0.12, // +12% sink at v=vMax, full bugs
  bugMinIncrease: 0.03, // +3% sink at v=vMin, full bugs
  rainMaxIncrease: 0.18, // rain penalizes high-speed end more
  rainMinIncrease: 0.05,
  iceMaxIncrease: 0.4, // ice is brutal everywhere
  iceMinIncrease: 0.25,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Apply contamination penalties to a (mass-scaled) polar.
 * Pass in vMin and vMax of the polar so we can scale penalties along the curve.
 */
export function applyContamination(
  points: PolarPoint[],
  factors: ContaminationFactors
): PolarPoint[] {
  const bug = clamp01(factors.bugFactor);
  const rain = clamp01(factors.rainFactor);
  const ice = clamp01(factors.iceFactor);

  if (bug === 0 && rain === 0 && ice === 0) return points;

  // domain for normalization
  const vs = points.map((p) => p.v);
  const vMin = Math.min(...vs);
  const vMax = Math.max(...vs);
  const span = Math.max(vMax - vMin, 1e-6);

  return points.map(({ v, w }) => {
    // t = 0 at vMin (low-speed end), 1 at vMax (high-speed end)
    const t = (v - vMin) / span;

    const bugPenalty =
      bug *
      (CONTAMINATION_PENALTY.bugMinIncrease +
        t * (CONTAMINATION_PENALTY.bugMaxIncrease - CONTAMINATION_PENALTY.bugMinIncrease));
    const rainPenalty =
      rain *
      (CONTAMINATION_PENALTY.rainMinIncrease +
        t * (CONTAMINATION_PENALTY.rainMaxIncrease - CONTAMINATION_PENALTY.rainMinIncrease));
    const icePenalty =
      ice *
      (CONTAMINATION_PENALTY.iceMinIncrease +
        t * (CONTAMINATION_PENALTY.iceMaxIncrease - CONTAMINATION_PENALTY.iceMinIncrease));

    const totalMultiplier = 1 + bugPenalty + rainPenalty + icePenalty;
    return { v, w: w * totalMultiplier };
  });
}
