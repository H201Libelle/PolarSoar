import { useState } from 'react';
import Plot from 'react-plotly.js';
import { buildSpline, samplePolar } from '../physics/polar';
import { findMinSink, findBestLD } from '../physics/performance';
import { scalePolarByMass } from '../physics/wingLoading';
import type { Glider } from '../data/types';

export const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea'];

const PLOTLY_CONFIG = {
  responsive: true,
  displayModeBar: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
};

type SpeedUnit = 'kmh' | 'ms' | 'kts';

interface Props {
  gliders: Glider[];
  wsOverrides: Record<string, number>;
}

export function PolarChart({ gliders, wsOverrides }: Props) {
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>('kmh');

  const toSpeed = (ms: number) =>
    speedUnit === 'kmh' ? ms * 3.6 : speedUnit === 'kts' ? ms * 1.94384 : ms;
  const speedLabel = speedUnit === 'kmh' ? 'IAS (km/h)' : speedUnit === 'kts' ? 'IAS (kts)' : 'IAS (m/s)';
  const speedRange = speedUnit === 'kmh' ? [55, 215] : speedUnit === 'kts' ? [30, 116] : [15, 60];
  const speedUnitLabel = speedUnit === 'kmh' ? 'km/h' : speedUnit === 'kts' ? 'kts' : 'm/s';
  const speedDecimals = speedUnit === 'ms' ? 1 : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vzTraces: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ldTraces: any[] = [];

  gliders.forEach((g, i) => {
    const color = COLORS[i % COLORS.length];
    const wsRef = g.referenceMass / g.wingArea;
    const wsCurrent = wsOverrides[g.id] ?? wsRef;
    const scaledMass = wsCurrent * g.wingArea;
    const scaledPoints = scalePolarByMass(g.polarPoints, g.referenceMass, scaledMass);
    const spline = buildSpline(scaledPoints);
    const samples = samplePolar(spline, 150);
    const minSink = findMinSink(spline);
    const bestLD = findBestLD(spline);
    const label = `${g.manufacturer} ${g.model}`;
    const speeds = samples.map((p) => +toSpeed(p.v).toFixed(2));

    // --- Vz chart ---
    vzTraces.push({
      type: 'scatter',
      mode: 'lines',
      name: label,
      x: speeds,
      y: samples.map((p) => +(-p.w).toFixed(3)),
      line: { color, width: 2.5 },
      hovertemplate:
        `<b>${label}</b><br>` +
        `Speed: %{x:.1f} ${speedUnitLabel}<br>` +
        `Sink: %{customdata:.2f} m/s<br>` +
        `L/D: %{text}<extra></extra>`,
      customdata: samples.map((p) => p.w),
      text: samples.map((p) => (p.v / p.w).toFixed(1)),
    });

    vzTraces.push({
      type: 'scatter',
      mode: 'lines',
      showlegend: false,
      x: [0, +toSpeed(bestLD.v).toFixed(2)],
      y: [0, +(-bestLD.w).toFixed(3)],
      line: { color, width: 1, dash: 'dot' },
      hoverinfo: 'skip',
    });

    vzTraces.push({
      type: 'scatter',
      mode: 'markers',
      showlegend: false,
      x: [+toSpeed(minSink.v).toFixed(2)],
      y: [+(-minSink.w).toFixed(3)],
      marker: { color, size: 9, symbol: 'circle' },
      hovertemplate:
        `<b>${label}</b><br>Min sink: ${minSink.w.toFixed(2)} m/s @ ${toSpeed(minSink.v).toFixed(speedDecimals)} ${speedUnitLabel}<extra></extra>`,
    });

    vzTraces.push({
      type: 'scatter',
      mode: 'markers',
      showlegend: false,
      x: [+toSpeed(bestLD.v).toFixed(2)],
      y: [+(-bestLD.w).toFixed(3)],
      marker: { color, size: 9, symbol: 'diamond' },
      hovertemplate:
        `<b>${label}</b><br>Best L/D: ${bestLD.ld.toFixed(1)} @ ${toSpeed(bestLD.v).toFixed(speedDecimals)} ${speedUnitLabel}<extra></extra>`,
    });

    // --- L/D chart ---
    ldTraces.push({
      type: 'scatter',
      mode: 'lines',
      name: label,
      x: speeds,
      y: samples.map((p) => +(p.v / p.w).toFixed(2)),
      line: { color, width: 2.5 },
      hovertemplate:
        `<b>${label}</b><br>` +
        `Speed: %{x:.1f} ${speedUnitLabel}<br>` +
        `L/D: %{y:.1f}<extra></extra>`,
    });

    ldTraces.push({
      type: 'scatter',
      mode: 'markers',
      showlegend: false,
      x: [+toSpeed(bestLD.v).toFixed(2)],
      y: [+bestLD.ld.toFixed(2)],
      marker: { color, size: 9, symbol: 'diamond' },
      hovertemplate:
        `<b>${label}</b><br>Best L/D: ${bestLD.ld.toFixed(1)} @ ${toSpeed(bestLD.v).toFixed(speedDecimals)} ${speedUnitLabel}<extra></extra>`,
    });
  });

  const commonXAxis = {
    title: speedLabel,
    range: speedRange,
    gridcolor: '#e2e8f0',
    zeroline: false,
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-1">
        <span className="mr-2 text-xs text-slate-500">Speed units:</span>
        {(['kmh', 'kts', 'ms'] as SpeedUnit[]).map((u) => (
          <button
            key={u}
            onClick={() => setSpeedUnit(u)}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              speedUnit === u
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {u === 'kmh' ? 'km/h' : u === 'kts' ? 'kts' : 'm/s'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-medium text-slate-600">
            Sink rate (m/s) vs Airspeed ({speedUnitLabel})
          </h3>
          <Plot
            data={vzTraces}
            layout={{
              xaxis: commonXAxis,
              yaxis: {
                title: 'Vz (m/s)',
                range: [-3.6, 0.3],
                gridcolor: '#e2e8f0',
                zeroline: true,
                zerolinecolor: '#94a3b8',
              },
              plot_bgcolor: '#f8fafc',
              paper_bgcolor: '#ffffff',
              margin: { t: 8, r: 16, b: 56, l: 64 },
              legend: { orientation: 'h', y: -0.25, x: 0 },
              hovermode: 'closest',
            }}
            style={{ width: '100%', height: '380px' }}
            config={PLOTLY_CONFIG}
          />
          <p className="mt-1 text-xs text-slate-400">◆ best L/D &nbsp;● min sink &nbsp;╌ best L/D tangent from origin</p>
        </div>

        <div>
          <h3 className="mb-1 text-sm font-medium text-slate-600">
            Glide ratio L/D vs Airspeed ({speedUnitLabel})
          </h3>
          <Plot
            data={ldTraces}
            layout={{
              xaxis: commonXAxis,
              yaxis: {
                title: 'L/D (dimensionless)',
                range: [0, 55],
                gridcolor: '#e2e8f0',
                zeroline: false,
              },
              plot_bgcolor: '#f8fafc',
              paper_bgcolor: '#ffffff',
              margin: { t: 8, r: 16, b: 56, l: 56 },
              legend: { orientation: 'h', y: -0.25, x: 0 },
              hovermode: 'closest',
            }}
            style={{ width: '100%', height: '380px' }}
            config={PLOTLY_CONFIG}
          />
          <p className="mt-1 text-xs text-slate-400">◆ best L/D</p>
        </div>
      </div>
    </div>
  );
}
