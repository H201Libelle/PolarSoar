import { describe, it, expect } from 'vitest';
import { buildSpline, sinkAt, samplePolar } from '../polar';
import type { PolarPoint } from '../../data/types';

// Synthetic polar resembling an ASW-27-class glider in m/s
const ASW27_POLAR: PolarPoint[] = [
  { v: 22.2, w: 0.62 }, // 80 km/h
  { v: 27.8, w: 0.65 }, // 100
  { v: 33.3, w: 0.78 }, // 120
  { v: 38.9, w: 0.97 }, // 140
  { v: 44.4, w: 1.27 }, // 160
  { v: 50.0, w: 1.7 }, // 180
  { v: 55.6, w: 2.27 }, // 200
];

describe('polar spline', () => {
  it('throws on fewer than 3 points', () => {
    expect(() => buildSpline([{ v: 20, w: 0.6 }, { v: 30, w: 0.7 }])).toThrow();
  });

  it('passes through input points exactly', () => {
    const spline = buildSpline(ASW27_POLAR);
    for (const p of ASW27_POLAR) {
      expect(sinkAt(spline, p.v)).toBeCloseTo(p.w, 6);
    }
  });

  it('handles unsorted input', () => {
    const reversed = [...ASW27_POLAR].reverse();
    const spline = buildSpline(reversed);
    expect(sinkAt(spline, 33.3)).toBeCloseTo(0.78, 6);
  });

  it('clamps queries outside domain', () => {
    const spline = buildSpline(ASW27_POLAR);
    expect(sinkAt(spline, 10)).toBe(ASW27_POLAR[0].w);
    expect(sinkAt(spline, 100)).toBe(ASW27_POLAR[ASW27_POLAR.length - 1].w);
  });

  it('produces smooth interpolation between knots', () => {
    const spline = buildSpline(ASW27_POLAR);
    const w1 = sinkAt(spline, 30);
    const w2 = sinkAt(spline, 31);
    // Between 27.8 (w=0.65) and 33.3 (w=0.78), values should be in range
    expect(w1).toBeGreaterThan(0.65);
    expect(w1).toBeLessThan(0.78);
    expect(w2).toBeGreaterThan(w1); // monotonic in this region
  });

  it('samples at requested resolution', () => {
    const spline = buildSpline(ASW27_POLAR);
    const samples = samplePolar(spline, 50);
    expect(samples).toHaveLength(50);
    expect(samples[0].v).toBeCloseTo(spline.vMin, 6);
    expect(samples[samples.length - 1].v).toBeCloseTo(spline.vMax, 6);
  });
});
