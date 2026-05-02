import { useEffect, useState } from 'react';
import type { Glider } from './data/types';
import { computeMetrics } from './physics/performance';
import { scalePolarByMass } from './physics/wingLoading';

export default function App() {
  const [gliders, setGliders] = useState<Glider[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/gliders.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setGliders)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return <div className="p-6 text-red-600">Failed to load gliders: {error}</div>;
  }
  if (!gliders) {
    return <div className="p-6 text-slate-500">Loading gliders…</div>;
  }

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Sailplane Compare</h1>
        <p className="text-sm text-slate-600">
          {gliders.length} gliders loaded. Wire up the UI in Week 3.
        </p>
      </header>

      <ul className="space-y-3">
        {gliders.map((g) => {
          const m = computeMetrics(
            scalePolarByMass(g.polarPoints, g.referenceMass, g.referenceMass),
            g.referenceMass,
            g.wingArea,
            1.5
          );
          return (
            <li key={g.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="font-semibold">
                {g.manufacturer} {g.model}{' '}
                <span className="text-xs text-slate-500">({g.competitionClass})</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
                <div>Wing loading: {m.wingLoading.toFixed(1)} kg/m²</div>
                <div>Min sink: {m.minSink.toFixed(2)} m/s</div>
                <div>Best L/D: {m.bestLD.toFixed(1)}</div>
                <div>STF (MC=1.5): {(m.speedToFly * 3.6).toFixed(0)} km/h</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
