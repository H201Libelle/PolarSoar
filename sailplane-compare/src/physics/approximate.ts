import type { Glider, PolarPoint } from '../data/types';
import { buildSpline, samplePolar } from './polar';

const APPROX_POINTS = 15;

function approximatePolarPoints(points: PolarPoint[]): PolarPoint[] {
  if (points.length < 3) return points;
  const spline = buildSpline(points);
  return samplePolar(spline, APPROX_POINTS).map((p) => ({
    v: +p.v.toFixed(2),
    w: +p.w.toFixed(4),
  }));
}

export function approximateGliders(gliders: Glider[]): Glider[] {
  return gliders.map((g) => ({
    ...g,
    polarPoints: approximatePolarPoints(g.polarPoints),
    source: 'estimated' as const,
    sourceId: undefined,
    sourceLabel: 'Spline approximation',
    confidence: 'medium' as const,
    notes: undefined,
  }));
}
