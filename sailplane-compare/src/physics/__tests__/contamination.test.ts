import { describe, it, expect } from 'vitest';
import { applyContamination } from '../contamination';
import { buildSpline } from '../polar';
import { findBestLD } from '../performance';
import type { PolarPoint } from '../../data/types';

const POLAR: PolarPoint[] = [
  { v: 22.2, w: 0.62 },
  { v: 27.8, w: 0.65 },
  { v: 33.3, w: 0.78 },
  { v: 38.9, w: 0.97 },
  { v: 44.4, w: 1.27 },
  { v: 50.0, w: 1.7 },
];

describe('contamination', () => {
  it('returns same points when all factors are zero', () => {
    const result = applyContamination(POLAR, { bugFactor: 0, rainFactor: 0, iceFactor: 0 });
    expect(result).toEqual(POLAR);
  });

  it('increases sink rate when bugs are present', () => {
    const dirty = applyContamination(POLAR, { bugFactor: 1, rainFactor: 0, iceFactor: 0 });
    for (let i = 0; i < POLAR.length; i++) {
      expect(dirty[i].w).toBeGreaterThan(POLAR[i].w);
    }
  });

  it('penalizes high speed more than low speed for bugs', () => {
    const dirty = applyContamination(POLAR, { bugFactor: 1, rainFactor: 0, iceFactor: 0 });
    const lowRatio = dirty[0].w / POLAR[0].w;
    const highRatio = dirty[dirty.length - 1].w / POLAR[POLAR.length - 1].w;
    expect(highRatio).toBeGreaterThan(lowRatio);
  });

  it('ice degrades L/D more than bugs', () => {
    const baseSpline = buildSpline(POLAR);
    const buggySpline = buildSpline(
      applyContamination(POLAR, { bugFactor: 1, rainFactor: 0, iceFactor: 0 })
    );
    const icySpline = buildSpline(
      applyContamination(POLAR, { bugFactor: 0, rainFactor: 0, iceFactor: 1 })
    );
    const baseLD = findBestLD(baseSpline).ld;
    const buggyLD = findBestLD(buggySpline).ld;
    const icyLD = findBestLD(icySpline).ld;
    expect(buggyLD).toBeLessThan(baseLD);
    expect(icyLD).toBeLessThan(buggyLD);
  });

  it('clamps factors to [0, 1]', () => {
    const out = applyContamination(POLAR, { bugFactor: 5, rainFactor: -2, iceFactor: 0 });
    const expected = applyContamination(POLAR, { bugFactor: 1, rainFactor: 0, iceFactor: 0 });
    expect(out[0].w).toBeCloseTo(expected[0].w, 6);
  });
});
