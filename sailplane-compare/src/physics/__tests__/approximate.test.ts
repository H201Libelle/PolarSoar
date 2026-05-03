import { describe, it, expect } from 'vitest';
import { approximateGliders } from '../approximate';
import type { Glider } from '../../data/types';

const sampleGlider: Glider = {
  id: 'test-glider',
  model: 'Test',
  manufacturer: 'TestCo',
  wingspan: 15,
  wingArea: 10,
  hasWinglets: false,
  referenceMass: 400,
  source: 'idaflieg',
  sourceId: 'IDA',
  sourceLabel: 'Idaflieg flight-test (D-1234)',
  polarPoints: [
    { v: 18, w: 0.6 },
    { v: 22, w: 0.55 },
    { v: 26, w: 0.58 },
    { v: 30, w: 0.7 },
    { v: 34, w: 0.9 },
    { v: 38, w: 1.2 },
    { v: 42, w: 1.6 },
    { v: 46, w: 2.1 },
    { v: 50, w: 2.7 },
  ],
};

describe('approximateGliders', () => {
  it('replaces polar points with 15 evenly-spaced spline samples', () => {
    const [approx] = approximateGliders([sampleGlider]);
    expect(approx.polarPoints.length).toBe(15);
  });

  it('changes source metadata to spline approximation', () => {
    const [approx] = approximateGliders([sampleGlider]);
    expect(approx.source).toBe('estimated');
    expect(approx.sourceLabel).toBe('Spline approximation');
    expect(approx.sourceId).toBeUndefined();
    expect(approx.notes).toBeUndefined();
  });

  it('preserves non-polar fields', () => {
    const [approx] = approximateGliders([sampleGlider]);
    expect(approx.id).toBe('test-glider');
    expect(approx.model).toBe('Test');
    expect(approx.manufacturer).toBe('TestCo');
    expect(approx.wingspan).toBe(15);
    expect(approx.wingArea).toBe(10);
    expect(approx.referenceMass).toBe(400);
  });

  it('produces points that approximate the original curve', () => {
    const [approx] = approximateGliders([sampleGlider]);
    const pts = approx.polarPoints;
    expect(pts[0].v).toBeCloseTo(sampleGlider.polarPoints[0].v, 1);
    expect(pts[pts.length - 1].v).toBeCloseTo(
      sampleGlider.polarPoints[sampleGlider.polarPoints.length - 1].v,
      1,
    );
    for (const p of pts) {
      expect(p.w).toBeGreaterThan(0);
      expect(p.v).toBeGreaterThan(0);
    }
  });

  it('does not exactly reproduce original measurement points', () => {
    const [approx] = approximateGliders([sampleGlider]);
    const exactMatches = approx.polarPoints.filter((ap) =>
      sampleGlider.polarPoints.some(
        (op) => Math.abs(op.v - ap.v) < 0.001 && Math.abs(op.w - ap.w) < 0.001,
      ),
    );
    expect(exactMatches.length).toBeLessThan(sampleGlider.polarPoints.length / 2);
  });
});
