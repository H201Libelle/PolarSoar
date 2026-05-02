import { useEffect, useState } from 'react';
import type { Glider } from './data/types';
import { computeMetrics } from './physics/performance';
import { scalePolarByMass } from './physics/wingLoading';
import { PolarChart, COLORS } from './components/PolarChart';
import { WingLoadPanel } from './components/WingLoadPanel';
import { TheorySection } from './components/TheorySection';

const BORDER_COLORS = ['border-blue-500', 'border-red-500', 'border-green-500', 'border-purple-500'];

export default function App() {
  const [gliders, setGliders] = useState<Glider[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wsOverrides, setWsOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/gliders.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setGliders)
      .catch((e) => setError(String(e)));
  }, []);

  function toggleGlider(g: Glider) {
    setSelectedIds((prev) => {
      if (prev.includes(g.id)) return prev.filter((x) => x !== g.id);
      // initialise W/S override to reference value on first selection
      setWsOverrides((ws) =>
        ws[g.id] !== undefined ? ws : { ...ws, [g.id]: +(g.referenceMass / g.wingArea).toFixed(1) }
      );
      return [...prev, g.id];
    });
  }

  function handleWsChange(id: string, ws: number) {
    setWsOverrides((prev) => ({ ...prev, [id]: ws }));
  }

  if (error) return <div className="p-6 text-red-600">Failed to load gliders: {error}</div>;
  if (!gliders) return <div className="p-6 text-slate-500">Loading gliders…</div>;

  const selectedGliders = selectedIds
    .map((id) => gliders.find((g) => g.id === id)!)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sailplane Compare</h1>
        <p className="text-sm text-slate-500">
          Click a glider to plot its polar. Select multiple to compare. Adjust wing loading with the sliders.
        </p>
      </header>

      {selectedGliders.length === 0 ? (
        <div className="mb-6 flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400">
          Select a glider below to see its polar curve
        </div>
      ) : (
        <>
          <WingLoadPanel
            gliders={selectedGliders}
            wsOverrides={wsOverrides}
            onChange={handleWsChange}
          />
          <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
            <PolarChart gliders={selectedGliders} wsOverrides={wsOverrides} />
            <p className="mt-2 text-xs text-slate-400">
              ◆ best L/D &nbsp;● min sink &nbsp;╌ best L/D tangent from origin
            </p>
          </div>
        </>
      )}

      <ul className="space-y-3">
        {gliders.map((g) => {
          const selIdx = selectedIds.indexOf(g.id);
          const isSelected = selIdx !== -1;
          const borderColor = isSelected ? BORDER_COLORS[selIdx % BORDER_COLORS.length] : 'border-slate-200';
          const ws = wsOverrides[g.id] ?? g.referenceMass / g.wingArea;
          const scaledMass = ws * g.wingArea;
          const m = computeMetrics(
            scalePolarByMass(g.polarPoints, g.referenceMass, scaledMass),
            scaledMass,
            g.wingArea,
            1.5
          );

          return (
            <li
              key={g.id}
              onClick={() => toggleGlider(g)}
              className={`cursor-pointer rounded-lg border-2 bg-white p-4 shadow-sm transition-all hover:shadow-md ${borderColor}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-800">
                  <span style={isSelected ? { color: COLORS[selIdx % COLORS.length] } : {}}>
                    {g.manufacturer} {g.model}
                  </span>{' '}
                  <span className="text-xs font-normal text-slate-400">({g.competitionClass})</span>
                </div>
                {isSelected && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    selected
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600 md:grid-cols-4">
                <div>W/S: <span className="font-medium">{m.wingLoading.toFixed(1)} kg/m²</span></div>
                <div>Min sink: <span className="font-medium">{m.minSink.toFixed(2)} m/s</span></div>
                <div>Best L/D: <span className="font-medium">{m.bestLD.toFixed(1)}</span></div>
                <div>STF (MC=1.5): <span className="font-medium">{(m.speedToFly * 3.6).toFixed(0)} km/h</span></div>
              </div>
            </li>
          );
        })}
      </ul>

      <TheorySection />
    </div>
  );
}
