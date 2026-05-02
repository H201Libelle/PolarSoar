import { COLORS } from './PolarChart';
import type { Glider } from '../data/types';

interface Props {
  gliders: Glider[];
  wsOverrides: Record<string, number>;
  onChange: (id: string, ws: number) => void;
}

export function WingLoadPanel({ gliders, wsOverrides, onChange }: Props) {
  return (
    <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Wing Loading (kg/m²)</h3>
      <div className="space-y-4">
        {gliders.map((g, i) => {
          const color = COLORS[i % COLORS.length];
          const wsRef = +(g.referenceMass / g.wingArea).toFixed(1);
          const wsMin = g.emptyMass ? Math.ceil(g.emptyMass / g.wingArea) : Math.max(15, Math.round(wsRef * 0.75));
          const wsMax = g.mtow ? Math.floor(g.mtow / g.wingArea) : Math.round(wsRef * 1.35);
          const wsCurrent = wsOverrides[g.id] ?? wsRef;

          return (
            <div key={g.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium" style={{ color }}>
                  {g.manufacturer} {g.model}
                </span>
                <span className="tabular-nums text-slate-700">
                  {wsCurrent.toFixed(1)} kg/m²
                  <span className="ml-2 text-xs text-slate-400">
                    (ref {wsRef} · min {wsMin} · max {wsMax})
                  </span>
                </span>
              </div>
              <input
                type="range"
                min={wsMin}
                max={wsMax}
                step={0.5}
                value={wsCurrent}
                onChange={(e) => onChange(g.id, +e.target.value)}
                className="w-full accent-blue-500"
                style={{ accentColor: color }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
