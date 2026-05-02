/**
 * Wing modification model: span extensions and winglets.
 *
 * Physical basis:
 *   The analytical glider polar is  Vz = c1·V³ + c2/V  where:
 *     c1 = ρ·S·C_D0 / (2W)      — parasitic drag term
 *     c2 = 2k·W / (π·A·ρ·S)    — induced drag term
 *
 *   A span extension of Δb (total, both sides) changes:
 *     S_new = S + Δb · c_tip    where c_tip ≈ TIP_TAPER · (S/b)
 *     A_new = b_new² / S_new
 *     C_D0_new = C_D0 · (S_new/S)   — wetted area scales parasite drag
 *
 *   This yields:
 *     c1_new = c1 · (S_new/S)²
 *     c2_new = c2 · (b/b_new)²
 *
 *   Winglets are modelled as an effective span increase:
 *     Δb_eff = 2 · h_winglet · WINGLET_EFFICIENCY
 *   where WINGLET_EFFICIENCY ≈ 0.45 is calibrated from published data
 *   (Boermans et al., OSTIV 2006: effective span ratio for modern winglets).
 *
 * Empirical calibration (IDA polar pairs at W/S = 35 kg/m²):
 *   Pair                    dLD/m      Source rows
 *   DG 1000 18m→20m         +7.3%/m   rows 31,34
 *   Kestrel 17m→22m         +2.5%/m   rows 75,77
 *   LS3 15m→17m             +3.7%/m   rows 87,92
 *   Ventus 15m→16.6m        +2.1%/m   rows 124,125
 *   Nimbus3 22.9m→24.5m     +6.7%/m   rows 101,102
 *   Salto 13.6m→15m         +8.5%/m   rows 112,111
 *   Mean:                   +4.5%/m
 *
 * The physics formula predicts ~3–5%/m for 15m class, consistent with observations.
 * DG1000 and Nimbus3 are same-airframe pairs (most reliable).
 */

import type { PolarPoint } from '../data/types';

/** Fraction of tip chord to mean chord (typical taper ratio). */
const TIP_TAPER = 0.40;

/** Effective span per unit winglet height (calibrated from OSTIV data). */
const WINGLET_EFFICIENCY = 0.45;

export type WingExtension = 0 | 0.5 | 1.0 | 1.5 | 2.0 | 3.0;

export interface ModConfig {
  /** Total span increase in metres (both tips combined). 0 = no extension. */
  wingExtension: WingExtension;
  /** Add winglets (only valid if glider does not already have winglets). */
  addWinglets: boolean;
  /** Winglet height per side in metres (default 0.5m). */
  wingletHeight: number;
}

export const DEFAULT_MOD_CONFIG: ModConfig = {
  wingExtension: 0,
  addWinglets: false,
  wingletHeight: 0.5,
};

/**
 * Fit analytical polar coefficients (c1, c2) to measured points by least squares.
 * Model: Vz = c1·V³ + c2/V
 */
function fitCoeffs(points: PolarPoint[]): { c1: number; c2: number } {
  let A11 = 0, A12 = 0, A22 = 0, b1 = 0, b2 = 0;
  for (const { v, w } of points) {
    A11 += v ** 6;
    A12 += v ** 2;
    A22 += 1 / v ** 2;
    b1 += w * v ** 3;
    b2 += w / v;
  }
  const det = A11 * A22 - A12 * A12;
  return {
    c1: (b1 * A22 - b2 * A12) / det,
    c2: (A11 * b2 - A12 * b1) / det,
  };
}

/**
 * Apply wing modifications to a polar.
 *
 * Returns a new set of polar points representing the modified aircraft.
 * The returned points span the same speed range as the input, sampled
 * at the same density. Apply scalePolarByMass afterwards for wing loading.
 */
export function applyModifications(
  points: PolarPoint[],
  wingspan: number,
  wingArea: number,
  config: ModConfig
): PolarPoint[] {
  const { wingExtension, addWinglets, wingletHeight } = config;

  const delta_b_ext = wingExtension;
  const delta_b_wlt = addWinglets ? 2 * wingletHeight * WINGLET_EFFICIENCY : 0;
  const delta_b = delta_b_ext + delta_b_wlt;

  if (delta_b === 0) return points;

  const b_new = wingspan + delta_b;
  const c_tip = TIP_TAPER * (wingArea / wingspan);
  const S_new = wingArea + delta_b * c_tip;

  const { c1, c2 } = fitCoeffs(points);
  const c1_new = c1 * (S_new / wingArea) ** 2;
  const c2_new = c2 * (wingspan / b_new) ** 2;

  const vs = points.map((p) => p.v);
  const v_min = Math.min(...vs);
  const v_max = Math.max(...vs);

  return points.map((p) => {
    // Keep same speed nodes as input so downstream spline stays consistent
    const v = p.v;
    // Clamp to valid speed range
    const vq = Math.max(v_min, Math.min(v_max, v));
    const w = c1_new * vq ** 3 + c2_new / vq;
    return { v, w: Math.max(0.1, w) };
  });
}

/**
 * Summarise the geometric effect of a modification for display.
 */
export function modSummary(
  wingspan: number,
  wingArea: number,
  config: ModConfig
): { b_new: number; S_new: number; A_new: number; A_old: number } {
  const { wingExtension, addWinglets, wingletHeight } = config;
  const delta_b =
    wingExtension + (addWinglets ? 2 * wingletHeight * WINGLET_EFFICIENCY : 0);
  const b_new = wingspan + delta_b;
  const c_tip = TIP_TAPER * (wingArea / wingspan);
  const S_new = wingArea + delta_b * c_tip;
  return {
    b_new: +b_new.toFixed(2),
    S_new: +S_new.toFixed(2),
    A_new: +(b_new ** 2 / S_new).toFixed(1),
    A_old: +(wingspan ** 2 / wingArea).toFixed(1),
  };
}
