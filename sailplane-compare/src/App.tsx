import { useEffect, useMemo, useState } from 'react';
import type { Glider } from './data/types';
import { computeMetrics } from './physics/performance';
import { scalePolarByMass } from './physics/wingLoading';
import { DEFAULT_MOD_CONFIG } from './physics/modifications';
import type { ModConfig } from './physics/modifications';
import { approximateGliders } from './physics/approximate';
import { PolarChart, COLORS } from './components/PolarChart';
import { WingLoadPanel } from './components/WingLoadPanel';
import { ModificationsPanel } from './components/ModificationsPanel';
import { TheorySection } from './components/TheorySection';
import { LoginScreen } from './components/LoginScreen';
import type { UserTier } from './components/LoginScreen';

const BORDER_COLORS = ['border-blue-500', 'border-red-500', 'border-green-500', 'border-purple-500'];

export default function App() {
  const [userTier, setUserTier] = useState<UserTier | null>(() => {
    const stored = sessionStorage.getItem('spade_auth');
    return stored === 'private' || stored === 'public' ? stored : null;
  });

  const [allGliders, setAllGliders] = useState<Glider[] | null>(null);
  const [error, setError]           = useState<string | null>(null);

  // Which model names are selected for comparison (ordered, max 4)
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  // Per-model: which glider id (variant) is active
  const [activeVariants, setActiveVariants] = useState<Record<string, string>>({});
  // Per-glider-id: wing-loading override (kg/m²)
  const [wsOverrides, setWsOverrides]       = useState<Record<string, number>>({});
  // Per-glider-id: modification config
  const [modConfigs, setModConfigs]         = useState<Record<string, ModConfig>>({});

  useEffect(() => {
    if (!userTier) return;
    fetch(import.meta.env.BASE_URL + 'data/gliders.json')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((gliders: Glider[]) =>
        userTier === 'public' ? approximateGliders(gliders) : gliders
      )
      .then(setAllGliders)
      .catch((e) => setError(String(e)));
  }, [userTier]);

  // Group gliders by model name
  const glidersByModel = useMemo<Record<string, Glider[]>>(() => {
    if (!allGliders) return {};
    const out: Record<string, Glider[]> = {};
    for (const g of allGliders) {
      if (!out[g.model]) out[g.model] = [];
      out[g.model].push(g);
    }
    return out;
  }, [allGliders]);

  // Sorted list of unique model names for display
  const modelNames = useMemo(
    () => Object.keys(glidersByModel).sort(),
    [glidersByModel]
  );

  // Resolve the active Glider for a model name
  function activeGlider(modelName: string): Glider | undefined {
    const variants = glidersByModel[modelName] ?? [];
    const id = activeVariants[modelName];
    return variants.find((g) => g.id === id) ?? variants[0];
  }

  function toggleModel(modelName: string) {
    setSelectedModels((prev) => {
      if (prev.includes(modelName)) return prev.filter((m) => m !== modelName);
      if (prev.length >= 4) return prev;
      const g = activeGlider(modelName);
      if (!g) return prev;
      // Initialise defaults for newly selected model
      setWsOverrides((ws) =>
        ws[g.id] !== undefined ? ws : { ...ws, [g.id]: +(g.referenceMass / g.wingArea).toFixed(1) }
      );
      setModConfigs((mc) =>
        mc[g.id] !== undefined ? mc : { ...mc, [g.id]: DEFAULT_MOD_CONFIG }
      );
      return [...prev, modelName];
    });
  }

  function switchVariant(modelName: string, gliderId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const isSelected = selectedModels.includes(modelName);
    const g = (glidersByModel[modelName] ?? []).find((x) => x.id === gliderId);
    if (!g) return;
    setActiveVariants((prev) => ({ ...prev, [modelName]: gliderId }));
    // Initialise WS/mod for the new variant if not already set
    setWsOverrides((ws) =>
      ws[g.id] !== undefined ? ws : { ...ws, [g.id]: +(g.referenceMass / g.wingArea).toFixed(1) }
    );
    setModConfigs((mc) =>
      mc[g.id] !== undefined ? mc : { ...mc, [g.id]: DEFAULT_MOD_CONFIG }
    );
    // If model was already selected, we need to re-add it to force refresh
    if (isSelected) {
      setSelectedModels((prev) => [...prev]); // trigger re-render with new variant
    }
  }

  function handleWsChange(id: string, ws: number) {
    setWsOverrides((prev) => ({ ...prev, [id]: ws }));
  }

  function handleModChange(id: string, cfg: ModConfig) {
    setModConfigs((prev) => ({ ...prev, [id]: cfg }));
  }

  if (!userTier) return <LoginScreen onLogin={(tier) => setUserTier(tier)} />;

  if (error)      return <div className="p-6 text-red-600">Failed to load gliders: {error}</div>;
  if (!allGliders) return <div className="p-6 text-slate-500">Loading gliders…</div>;

  // Resolved selected gliders (one per model, using active variant)
  const selectedGliders = selectedModels
    .map((m) => activeGlider(m))
    .filter((g): g is Glider => g !== undefined);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          SPADE <span className="font-normal text-slate-500">— Sailplane Performance Analysis Database</span>
        </h1>
        <p className="text-sm text-slate-500">
          Click a glider to plot its polar. Select up to 4 to compare. Adjust wing loading with the sliders.
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
          <ModificationsPanel
            gliders={selectedGliders}
            modConfigs={modConfigs}
            onChange={handleModChange}
          />
          <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
            <PolarChart
              gliders={selectedGliders}
              wsOverrides={wsOverrides}
              modConfigs={modConfigs}
            />
            <p className="mt-2 text-xs text-slate-400">
              ◆ best L/D &nbsp;● min sink &nbsp;╌ best L/D tangent from origin &nbsp;◇ base best L/D
            </p>
          </div>
        </>
      )}

      {/* Search / glider list */}
      <GliderList
        modelNames={modelNames}
        glidersByModel={glidersByModel}
        selectedModels={selectedModels}
        activeVariants={activeVariants}
        wsOverrides={wsOverrides}
        onToggle={toggleModel}
        onSwitchVariant={switchVariant}
      />

      <TheorySection />
    </div>
  );
}

// ── Glider list sub-component ─────────────────────────────────────────────────
interface GliderListProps {
  modelNames: string[];
  glidersByModel: Record<string, Glider[]>;
  selectedModels: string[];
  activeVariants: Record<string, string>;
  wsOverrides: Record<string, number>;
  onToggle: (model: string) => void;
  onSwitchVariant: (model: string, id: string, e: React.MouseEvent) => void;
}

function GliderList({
  modelNames, glidersByModel, selectedModels, activeVariants,
  wsOverrides, onToggle, onSwitchVariant,
}: GliderListProps) {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  const allClasses = useMemo(() => {
    const set = new Set<string>();
    for (const variants of Object.values(glidersByModel)) {
      variants.forEach((g) => { if (g.competitionClass) set.add(g.competitionClass); });
    }
    return ['All', ...Array.from(set).sort()];
  }, [glidersByModel]);

  const filtered = useMemo(() =>
    modelNames.filter((m) => {
      const g = (glidersByModel[m] ?? [])[0];
      const matchesSearch = m.toLowerCase().includes(search.toLowerCase()) ||
        (g?.manufacturer ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesClass = classFilter === 'All' || g?.competitionClass === classFilter;
      return matchesSearch && matchesClass;
    }),
    [modelNames, glidersByModel, search, classFilter]
  );

  return (
    <div>
      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search gliders…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-56"
        />
        <div className="flex flex-wrap gap-1">
          {allClasses.map((cls) => (
            <button
              key={cls}
              onClick={() => setClassFilter(cls)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                classFilter === cls
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">{filtered.length} gliders</span>
      </div>

      <ul className="space-y-2">
        {filtered.map((modelName) => {
          const variants  = glidersByModel[modelName] ?? [];
          const selIdx    = selectedModels.indexOf(modelName);
          const isSelected = selIdx !== -1;
          const activeId  = activeVariants[modelName] ?? variants[0]?.id;
          const g         = variants.find((x) => x.id === activeId) ?? variants[0];
          if (!g) return null;

          const borderColor = isSelected ? BORDER_COLORS[selIdx % BORDER_COLORS.length] : 'border-slate-200';
          const color       = isSelected ? COLORS[selIdx % COLORS.length] : undefined;
          const ws          = wsOverrides[g.id] ?? (g.referenceMass / g.wingArea);
          const scaledMass  = ws * g.wingArea;
          const m           = computeMetrics(
            scalePolarByMass(g.polarPoints, g.referenceMass, scaledMass),
            scaledMass, g.wingArea, 1.5
          );

          return (
            <li
              key={modelName}
              onClick={() => onToggle(modelName)}
              className={`cursor-pointer rounded-lg border-2 bg-white p-3 shadow-sm transition-all hover:shadow-md ${borderColor}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-800" style={color ? { color } : {}}>
                    {g.manufacturer} {modelName}
                  </span>{' '}
                  <span className="text-xs font-normal text-slate-400">
                    ({g.competitionClass ?? '—'})
                  </span>
                </div>
                {isSelected && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    selected
                  </span>
                )}
              </div>

              {/* Source variant selector — only shown when multiple sources exist */}
              {variants.length > 1 && (
                <div
                  className="mt-1.5 flex flex-wrap items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-slate-400 mr-1">Data source:</span>
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={(e) => onSwitchVariant(modelName, v.id, e)}
                      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        v.id === activeId
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {v.sourceLabel ?? v.sourceId ?? v.source}
                    </button>
                  ))}
                </div>
              )}

              {/* Metrics row */}
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-slate-600 md:grid-cols-4">
                <div>W/S: <span className="font-medium">{m.wingLoading.toFixed(1)} kg/m²</span></div>
                <div>Min sink: <span className="font-medium">{m.minSink.toFixed(2)} m/s</span></div>
                <div>Best L/D: <span className="font-medium">{m.bestLD.toFixed(1)}</span></div>
                <div>STF (MC=1.5): <span className="font-medium">{(m.speedToFly * 3.6).toFixed(0)} km/h</span></div>
              </div>

              {/* Source note for single-source gliders */}
              {variants.length === 1 && (
                <div className="mt-1 text-xs text-slate-400">
                  {g.sourceLabel ?? g.source}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
