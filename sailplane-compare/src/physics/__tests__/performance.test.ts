import { describe, it, expect } from 'vitest';
import {
  findMinSink,
  findBestLD,
  findSpeedToFly,
  crossCountrySpeed,
  computeMetrics,
} from '../performance';
import { buildSpline } from '../polar';
import { scalePolarByMass } from '../wingLoading';
import type { PolarPoint } from '../../data/types';

// ASW-27-class polar; published min sink ~0.6 m/s, best L/D ~48
const ASW27_POLAR: PolarPoint[] = [
  { v: 22.2, w: 0.62 },
  { v: 25.0, w: 0.6 },
  { v: 27.8, w: 0.65 },
  { v: 33.3, w: 0.78 },
  { v: 38.9, w: 0.97 },
  { v: 44.4, w: 1.27 },
  { v: 50.0, w: 1.7 },
  { v: 55.6, w: 2.27 },
];

describe('performance metrics', () => {
  it('finds minimum sink near published value', () => {
    const spline = buildSpline(ASW27_POLAR);
    const ms = findMinSink(spline);
    // expect minimum near v ~ 25 m/s, w ~ 0.6
    expect(ms.v).toBeGreaterThan(22);
    expect(ms.v).toBeLessThan(30);
    expect(ms.w).toBeLessThan(0.62);
    expect(ms.w).toBeGreaterThan(0.55);
  });

  it('finds best L/D in reasonable range', () => {
    const spline = buildSpline(ASW27_POLAR);
    const bld = findBestLD(spline);
    // For this polar, best L/D should be around 40-50
    expect(bld.ld).toBeGreaterThan(35);
    expect(bld.ld).toBeLessThan(55);
    // best L/D speed > min sink speed
    const ms = findMinSink(spline);
    expect(bld.v).toBeGreaterThanOrEqual(ms.v);
  });

  it('speed-to-fly increases with MacCready setting', () => {
    const spline = buildSpline(ASW27_POLAR);
    const stf0 = findSpeedToFly(spline, 0.5);
    const stf2 = findSpeedToFly(spline, 2.0);
    const stf4 = findSpeedToFly(spline, 4.0);
    expect(stf2.v).toBeGreaterThan(stf0.v);
    expect(stf4.v).toBeGreaterThan(stf2.v);
  });

  it('xc speed is zero when MacCready is zero', () => {
    expect(crossCountrySpeed(35, 1.0, 0)).toBe(0);
  });

  it('xc speed is positive and less than airspeed', () => {
    const xc = crossCountrySpeed(40, 1.5, 2.0);
    expect(xc).toBeGreaterThan(0);
    expect(xc).toBeLessThan(40);
  });

  it('mass scaling shifts polar correctly', () => {
    const scaled = scalePolarByMass(ASW27_POLAR, 350, 500);
    const k = Math.sqrt(500 / 350);
    expect(scaled[0].v).toBeCloseTo(ASW27_POLAR[0].v * k, 6);
    expect(scaled[0].w).toBeCloseTo(ASW27_POLAR[0].w * k, 6);
  });

  it('mass scaling preserves L/D ratio', () => {
    const splineLight = buildSpline(ASW27_POLAR);
    const splineHeavy = buildSpline(scalePolarByMass(ASW27_POLAR, 350, 500));
    const ldLight = findBestLD(splineLight).ld;
    const ldHeavy = findBestLD(splineHeavy).ld;
    expect(ldHeavy).toBeCloseTo(ldLight, 1);
  });

  it('computeMetrics returns sensible bundle', () => {
    const m = computeMetrics(ASW27_POLAR, 350, 9.0, 1.5);
    expect(m.totalMass).toBe(350);
    expect(m.wingLoading).toBeCloseTo(350 / 9.0, 4);
    expect(m.minSink).toBeGreaterThan(0);
    expect(m.bestLD).toBeGreaterThan(30);
    expect(m.speedToFly).toBeGreaterThan(m.vMinSink);
    expect(m.xcSpeed).toBeGreaterThan(0);
  });
});
