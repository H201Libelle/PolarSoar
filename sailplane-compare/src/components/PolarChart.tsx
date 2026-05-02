import { useState } from 'react';
import Plot from 'react-plotly.js';
import { buildSpline, samplePolar } from '../physics/polar';
import { findMinSink, findBestLD } from '../physics/performance';
import { scalePolarByMass } from '../physics/wingLoading';
import { applyModifications, DEFAULT_MOD_CONFIG } from '../physics/modifications';
import type { ModConfig } from '../physics/modifications';
import type { Glider } from '../data/types';

export const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PLOTLY_CONFIG: Record<string, any> = {
  responsive: true,
  displayModeBar: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
};

type SpeedUnit = 'kmh' | 'ms' | 'kts';

interface Props {
  gliders: Glider[];
  wsOverrides: Record<string, number>;
  modConfigs?: Record<string, ModConfig>;
}

function isModified(cfg: ModConfig): boolean {
  return cfg.wingExtension !== 0 || cfg.addWinglets;
}

export function PolarChart({ gliders, wsOverrides, modConfigs = {} }: Props) {
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
    const modCfg = modConfigs[g.id] ?? DEFAULT_MOD_CONFIG;
    const modified = isModified(modCfg);
    const label = `${g.manufacturer} ${g.model}`;
    const labelMod = modified ? `${label} (modified)` : label;

    // Base polar (always computed; shown as ghost when modifications are active)
    const baseScaled = scalePolarByMass(g.polarPoints, g.referenceMass, scaledMass);
    const baseSpline = buildSpline(baseScaled);
    const baseSamples = samplePolar(baseSpline, 150);
    const baseSpeeds = baseSamples.map((p) => +toSpeed(p.v).toFixed(2));
    const baseBestLD = findBestLD(baseSpline);

    if (modified) {
      // Ghost Vz trace — dashed, semi-transparent, same color
      vzTraces.push({
        type: 'scatter',
        mode: 'lines',
        name: `${label} (base)`,
        x: baseSpeeds,
        y: baseSamples.map((p) => +(-p.w).toFixed(3)),
        line: { color, width: 1.5, dash: 'dot' },
        opacity: 0.45,
        hovertemplate:
          `<b>${label} (base)</b><br>` +
          `Speed: %{x:.1f} ${speedUnitLabel}<br>` +
          `Sink: %{customdata:.2f} m/s<br>` +
          `L/D: %{text}<extra></extra>`,
        customdata: baseSamples.map((p) => p.w),
        text: baseSamples.map((p) => (p.v / p.w).toFixed(1)),
      });

      // Ghost L/D trace
      ldTraces.push({
        type: 'scatter',
        mode: 'lines',
        name: `${label} (base)`,
        x: baseSpeeds,
        y: baseSamples.map((p) => +(p.v / p.w).toFixed(2)),
        line: { color, width: 1.5, dash: 'dot' },
        opacity: 0.45,
        hovertemplate:
          `<b>${label} (base)</b><br>` +
          `Speed: %{x:.1f} ${speedUnitLabel}<br>` +
          `L/D: %{y:.1f}<extra></extra>`,
      });

      // Best L/D marker on base for Vz chart (open diamond)
      vzTraces.push({
        type: 'scatter',
        mode: 'markers',
        showlegend: false,
        x: [+toSpeed(baseBestLD.v).toFixed(2)],
        y: [+(-baseBestLD.w).toFixed(3)],
        marker: { color, size: 8, symbol: 'diamond-open', opacity: 0.5 },
        hovertemplate:
          `<b>${label} (base)</b><br>Best L/D: ${baseBestLD.ld.toFixed(1)} @ ${toSpeed(baseBestLD.v).toFixed(speedDecimals)} ${speedUnitLabel}<extra></extra>`,
      });

      // Best L/D marker on base for L/D chart
      ldTraces.push({
        type: 'scatter',
        mode: 'markers',
        showlegend: false,
        x: [+toSpeed(baseBestLD.v).toFixed(2)],
        y: [+baseBestLD.ld.toFixed(2)],
        marker: { color, size: 8, symbol: 'diamond-open', opacity: 0.5 },
        hovertemplate:
          `<b>${label} (base)</b><br>Best L/D: ${baseBestLD.ld.toFixed(1)} @ ${toSpeed(baseBestLD.v).toFixed(speedDecimals)} ${speedUnitLabel}<extra></extra>`,
      });
    }

    // Modified (or unmodified) polar — solid, full opacity
    const modifiedPoints = applyModifications(g.polarPoints, g.wingspan, g.wingArea, modCfg);
    const scaledPoints = scalePolarByMass(modifiedPoints, g.referenceMass, scaledMass);
    const spline = buildSpline(scaledPoints);
    const samples = samplePolar(spline, 150);
    const minSink = findMinSink(spline);
    const bestLD = findBestLD(spline);
    const speeds = samples.map((p) => +toSpeed(p.v).toFixed(2));

    // --- Vz chart ---
    vzTraces.push({
      type: 'scatter',
      mode: 'lines',
      name: labelMod,
      x: speeds,
      y: samples.map((p) => +(-p.w).toFixed(3)),
      line: { color, width: 2.5 },
      hovertemplate:
        `<b>${labelMod}</b><br>` +
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
        `<b>${labelMod}</b><br>Min sink: ${minSink.w.toFixed(2)} m/s @ ${toSpeed(minSink.v).toFixed(speedDecimals)} ${speedUnitLabel}<extra></extra>`,
    });

    vzTraces.push({
      type: 'scatter',
      mode: 'markers',
      showlegend: false,
      x: [+toSpeed(bestLD.v).toFixed(2)],
      y: [+(-bestLD.w).toFixed(3)],
      marker: { color, size: 9, symbol: 'diamond' },
      hovertemplate:
        `<b>${labelMod}</b><br>Best L/D: ${bestLD.ld.toFixed(1)} @ ${toSpeed(bestLD.v).toFixed(speedDecimals)} ${speedUnitLabel}<extra></extra>`,
    });

    // --- L/D chart ---
    ldTraces.push({
      type: 'scatter',
      mode: 'lines',
      name: labelMod,
      x: speeds,
      y: samples.map((p) => +(p.v / p.w).toFixed(2)),
      line: { color, width: 2.5 },
      hovertemplate:
        `<b>${labelMod}</b><br>` +
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
        `<b>${labelMod}</b><br>Best L/D: ${bestLD.ld.toFixed(1)} @ ${toSpeed(bestLD.v).toFixed(speedDecimals)} ${speedUnitLabel}<extra></extra>`,
    });
  });

  const commonXAxis = {
    title: { text: speedLabel },
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
                title: { text: 'Vz (m/s)' },
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
          <p className="mt-1 text-xs text-slate-400">◆ best L/D &nbsp;● min sink &nbsp;╌ best L/D tangent &nbsp;◇ base best L/D</p>
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
                title: { text: 'L/D (dimensionless)' },
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
          <p className="mt-1 text-xs text-slate-400">◆ best L/D &nbsp;◇ base best L/D</p>
        </div>
      </div>
    </div>
  );
}
