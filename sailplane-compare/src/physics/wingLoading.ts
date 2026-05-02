/**
 * Mass-scaling of polar curves.
 *
 * Standard glider polar physics: when flying mass changes from m_ref to m,
 * the entire polar transforms as:
 *
 *   v_new = v_ref * sqrt(m / m_ref)
 *   w_new = w_ref * sqrt(m / m_ref)
 *
 * This preserves L/D at every angle of attack, which is what we want.
 * Reference: any standard sailplane performance text, e.g. Reichmann
 * "Streckensegelflug" or Thomas "Fundamentals of Sailplane Design".
 */

import type { PolarPoint } from '../data/types';

export function scalePolarByMass(
  points: PolarPoint[],
  referenceMass: number,
  newMass: number
): PolarPoint[] {
  if (referenceMass <= 0) throw new Error('referenceMass must be > 0');
  if (newMass <= 0) throw new Error('newMass must be > 0');
  const k = Math.sqrt(newMass / referenceMass);
  return points.map(({ v, w }) => ({ v: v * k, w: w * k }));
}

/** Wing loading in kg/m^2. */
export function wingLoading(mass: number, wingArea: number): number {
  return mass / wingArea;
}
