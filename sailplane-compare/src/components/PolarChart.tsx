import Plot from 'react-plotly.js';
import { buildSpline, samplePolar } from '../physics/polar';
import { findMinSink, findBestLD } from '../physics/performance';
import type { Glider } from '../data/types';

export const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea'];

const PLOTLY_CONFIG = {
  responsive: true,
  displayModeBar: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
};

interface Props {
  gliders: Glider[];
}

export function PolarChart({ gliders }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vzTraces: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ldTraces: any[] = [];

  gliders.forEach((g, i) => {
    const color = COLORS[i % COLORS.length];
    const spline = buildSpline(g.polarPoints);
    const samples = samplePolar(spline, 150);
    const minSink = findMinSink(spline);
    const bestLD = findBestLD(spline);
    const label = `${g.manufacturer} ${g.model}`;
    const speedKmh = samples.map((p) => +(p.v * 3.6).toFixed(1));

    // --- Vz chart ---
    vzTraces.push({
      type: 'scatter',
      mode: 'lines',
      name: label,
      x: speedKmh,
      y: samples.map((p) => +(-p.w).toFixed(3)),
      line: { color, width: 2.5 },
      hovertemplate:
        `<b>${label}</b><br>` +
        `Speed: %{x:.0f} km/h<br>` +
        `Sink: %{customdata:.2f} m/s<br>` +
        `L/D: %{text}<extra></extra>`,
      customdata: samples.map((p) => p.w),
      text: samples.map((p) => (p.v / p.w).toFixed(1)),
    });

    // Best L/D tangent from origin
    vzTraces.push({
      type: 'scatter',
      mode: 'lines',
      showlegend: false,
      x: [0, +(bestLD.v * 3.6).toFixed(1)],
      y: [0, +(-bestLD.w).toFixed(3)],
      line: { color, width: 1, dash: 'dot' },
      hoverinfo: 'skip',
    });

    // Min sink marker
    vzTraces.push({
      type: 'scatter',
      mode: 'markers',
      showlegend: false,
      x: [+(minSink.v * 3.6).toFixed(1)],
      y: [+(-minSink.w).toFixed(3)],
      marker: { color, size: 9, symbol: 'circle' },
      hovertemplate:
        `<b>${label}</b><br>Min sink: ${minSink.w.toFixed(2)} m/s @ ${(minSink.v * 3.6).toFixed(0)} km/h<extra></extra>`,
    });

    // Best L/D marker
    vzTraces.push({
      type: 'scatter',
      mode: 'markers',
      showlegend: false,
      x: [+(bestLD.v * 3.6).toFixed(1)],
      y: [+(-bestLD.w).toFixed(3)],
      marker: { color, size: 9, symbol: 'diamond' },
      hovertemplate:
        `<b>${label}</b><br>Best L/D: ${bestLD.ld.toFixed(1)} @ ${(bestLD.v * 3.6).toFixed(0)} km/h<extra></extra>`,
    });

    // --- L/D chart ---
    ldTraces.push({
      type: 'scatter',
      mode: 'lines',
      name: label,
      x: speedKmh,
      y: samples.map((p) => +(p.v / p.w).toFixed(2)),
      line: { color, width: 2.5 },
      hovertemplate:
        `<b>${label}</b><br>` +
        `Speed: %{x:.0f} km/h<br>` +
        `L/D: %{y:.1f}<extra></extra>`,
    });

    // Best L/D marker
    ldTraces.push({
      type: 'scatter',
      mode: 'markers',
      showlegend: false,
      x: [+(bestLD.v * 3.6).toFixed(1)],
      y: [+bestLD.ld.toFixed(2)],
      marker: { color, size: 9, symbol: 'diamond' },
      hovertemplate:
        `<b>${label}</b><br>Best L/D: ${bestLD.ld.toFixed(1)} @ ${(bestLD.v * 3.6).toFixed(0)} km/h<extra></extra>`,
    });
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <h3 className="mb-1 text-sm font-medium text-slate-600">Sink rate vs Airspeed</h3>
        <Plot
          data={vzTraces}
          layout={{
            xaxis: { title: 'IAS (km/h)', range: [55, 215], gridcolor: '#e2e8f0', zeroline: false },
            yaxis: { title: 'Vz (m/s)', range: [-3.6, 0.3], gridcolor: '#e2e8f0', zeroline: true, zerolinecolor: '#94a3b8' },
            plot_bgcolor: '#f8fafc',
            paper_bgcolor: '#ffffff',
            margin: { t: 8, r: 16, b: 56, l: 64 },
            legend: { orientation: 'h', y: -0.25, x: 0 },
            hovermode: 'closest',
          }}
          style={{ width: '100%', height: '380px' }}
          config={PLOTLY_CONFIG}
        />
        <p className="mt-1 text-xs text-slate-400">◆ best L/D &nbsp;● min sink &nbsp;╌ best L/D tangent</p>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-medium text-slate-600">Glide ratio (L/D) vs Airspeed</h3>
        <Plot
          data={ldTraces}
          layout={{
            xaxis: { title: 'IAS (km/h)', range: [55, 215], gridcolor: '#e2e8f0', zeroline: false },
            yaxis: { title: 'L/D', range: [0, 55], gridcolor: '#e2e8f0', zeroline: false },
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
  );
}
