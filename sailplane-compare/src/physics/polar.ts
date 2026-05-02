/**
 * Polar curve evaluation via natural cubic spline interpolation.
 *
 * Why cubic spline: glider polars are smooth physical curves with continuous
 * first and second derivatives in the operating range. Linear interpolation
 * produces kinks that pollute downstream derivatives (best L/D, speed-to-fly
 * which depend on tangents). Quadratic global fits lose accuracy in the
 * high-speed regime where parasitic drag dominates.
 *
 * We build the spline once per Glider+mass combination and cache.
 */

import type { PolarPoint } from '../data/types';

/** Solve tridiagonal system Ax = d for natural cubic spline second derivatives. */
function solveTridiagonal(n: number, a: number[], b: number[], c: number[], d: number[]): number[] {
  // Thomas algorithm
  const cp = new Array(n);
  const dp = new Array(n);
  cp[0] = c[0] / b[0];
  dp[0] = d[0] / b[0];
  for (let i = 1; i < n; i++) {
    const m = b[i] - a[i] * cp[i - 1];
    cp[i] = c[i] / m;
    dp[i] = (d[i] - a[i] * dp[i - 1]) / m;
  }
  const x = new Array(n);
  x[n - 1] = dp[n - 1];
  for (let i = n - 2; i >= 0; i--) {
    x[i] = dp[i] - cp[i] * x[i + 1];
  }
  return x;
}

export interface PolarSpline {
  v: number[]; // sorted speeds
  w: number[]; // sink rates
  m: number[]; // second derivatives at each knot (natural spline => m[0]=m[n-1]=0)
  vMin: number;
  vMax: number;
}

/** Build a natural cubic spline from polar points. Throws if fewer than 3 points. */
export function buildSpline(points: PolarPoint[]): PolarSpline {
  if (points.length < 3) {
    throw new Error(`Need at least 3 polar points for spline, got ${points.length}`);
  }
  // sort by speed and de-duplicate
  const sorted = [...points].sort((p, q) => p.v - q.v);
  const v: number[] = [];
  const w: number[] = [];
  for (const p of sorted) {
    if (v.length === 0 || p.v > v[v.length - 1] + 1e-9) {
      v.push(p.v);
      w.push(p.w);
    }
  }
  const n = v.length;
  if (n < 3) throw new Error('Polar points collapsed to <3 distinct speeds after dedup');

  // build tridiagonal system for natural spline (m[0] = m[n-1] = 0)
  const a = new Array(n).fill(0);
  const b = new Array(n).fill(1);
  const c = new Array(n).fill(0);
  const d = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const hL = v[i] - v[i - 1];
    const hR = v[i + 1] - v[i];
    a[i] = hL;
    b[i] = 2 * (hL + hR);
    c[i] = hR;
    d[i] = 6 * ((w[i + 1] - w[i]) / hR - (w[i] - w[i - 1]) / hL);
  }
  const m = solveTridiagonal(n, a, b, c, d);

  return { v, w, m, vMin: v[0], vMax: v[n - 1] };
}

/** Evaluate sink rate at a given speed. Clamps to spline domain. */
export function sinkAt(spline: PolarSpline, vQuery: number): number {
  const { v, w, m } = spline;
  const n = v.length;
  // clamp to valid range; UI is responsible for warning beyond range
  if (vQuery <= v[0]) return w[0];
  if (vQuery >= v[n - 1]) return w[n - 1];

  // binary search for interval
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (v[mid] > vQuery) hi = mid;
    else lo = mid;
  }
  const h = v[hi] - v[lo];
  const A = (v[hi] - vQuery) / h;
  const B = (vQuery - v[lo]) / h;
  return (
    A * w[lo] +
    B * w[hi] +
    ((A ** 3 - A) * m[lo] + (B ** 3 - B) * m[hi]) * (h ** 2) / 6
  );
}

/** Sample the polar at evenly spaced speeds for plotting. */
export function samplePolar(
  spline: PolarSpline,
  numPoints = 100,
  vMin?: number,
  vMax?: number
): PolarPoint[] {
  const lo = vMin ?? spline.vMin;
  const hi = vMax ?? spline.vMax;
  const out: PolarPoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const v = lo + (hi - lo) * (i / (numPoints - 1));
    out.push({ v, w: sinkAt(spline, v) });
  }
  return out;
}
