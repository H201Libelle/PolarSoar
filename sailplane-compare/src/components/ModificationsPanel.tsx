import { COLORS } from './PolarChart';
import type { Glider } from '../data/types';
import type { ModConfig, WingExtension } from '../physics/modifications';
import { modSummary } from '../physics/modifications';

const EXTENSIONS: WingExtension[] = [0, 0.5, 1.0, 1.5, 2.0, 3.0];

interface Props {
  gliders: Glider[];
  modConfigs: Record<string, ModConfig>;
  onChange: (id: string, cfg: ModConfig) => void;
}

export function ModificationsPanel({ gliders, modConfigs, onChange }: Props) {
  return (
    <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Wing Modifications</h3>
        <span className="text-xs text-slate-400">
          Model based on IDA flight-test pairs + analytical polar theory
        </span>
      </div>

      <div className="space-y-5">
        {gliders.map((g, i) => {
          const color = COLORS[i % COLORS.length];
          const cfg = modConfigs[g.id];
          const summary = modSummary(g.wingspan, g.wingArea, cfg);
          const A_old = +(g.wingspan ** 2 / g.wingArea).toFixed(1);
          const isModified = cfg.wingExtension !== 0 || cfg.addWinglets;

          return (
            <div key={g.id} className="rounded-lg border border-slate-100 p-3">
              <div
                className="mb-3 text-sm font-medium"
                style={{ color }}
              >
                {g.manufacturer} {g.model}
                {isModified && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {g.wingspan}m → {summary.b_new}m span &nbsp;|&nbsp;
                    A/R {A_old} → {summary.A_new}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Wing extension */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Span extension (total)
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {EXTENSIONS.map((ext) => (
                      <button
                        key={ext}
                        onClick={() => onChange(g.id, { ...cfg, wingExtension: ext })}
                        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                          cfg.wingExtension === ext
                            ? 'text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        style={cfg.wingExtension === ext ? { backgroundColor: color } : {}}
                      >
                        {ext === 0 ? 'None' : `+${ext}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Winglets */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Winglets
                    {g.hasWinglets && (
                      <span className="ml-1 text-slate-400">(already equipped)</span>
                    )}
                  </label>
                  {g.hasWinglets ? (
                    <span className="text-xs text-slate-400 italic">
                      Winglets already modelled in base polar
                    </span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          onChange(g.id, {
                            ...cfg,
                            addWinglets: !cfg.addWinglets,
                          })
                        }
                        className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                          cfg.addWinglets
                            ? 'text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        style={cfg.addWinglets ? { backgroundColor: color } : {}}
                      >
                        {cfg.addWinglets ? 'Winglets ON' : 'Add winglets'}
                      </button>
                      {cfg.addWinglets && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <span>Height:</span>
                          {[0.3, 0.5, 0.7].map((h) => (
                            <button
                              key={h}
                              onClick={() =>
                                onChange(g.id, { ...cfg, wingletHeight: h })
                              }
                              className={`rounded px-1.5 py-0.5 transition-colors ${
                                cfg.wingletHeight === h
                                  ? 'text-white'
                                  : 'bg-slate-100 hover:bg-slate-200'
                              }`}
                              style={
                                cfg.wingletHeight === h
                                  ? { backgroundColor: color }
                                  : {}
                              }
                            >
                              {h}m
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary row */}
              {isModified && (
                <div className="mt-2 rounded bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                  Wing area: {g.wingArea.toFixed(2)} → {summary.S_new} m² &nbsp;|&nbsp;
                  Aspect ratio: {A_old} → {summary.A_new} &nbsp;|&nbsp;
                  <span className="text-slate-400 italic">
                    Model: analytical polar (c₁·V³ + c₂/V) with modified geometry
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
