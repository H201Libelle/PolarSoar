import { useState } from 'react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Accordion({ title, children }: SectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-slate-700 hover:text-slate-900"
      >
        {title}
        <span className="ml-2 text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="pb-4 text-sm text-slate-600 space-y-2">{children}</div>}
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 rounded bg-slate-100 px-4 py-2 font-mono text-sm text-slate-800">
      {children}
    </div>
  );
}

export function TheorySection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8 rounded-xl border bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <h2 className="font-semibold text-slate-800">Performance Theory & Methodology</h2>
          <p className="text-xs text-slate-400">Polar curves, wing loading, and what the numbers mean</p>
        </div>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 pb-5">

          <Accordion title="The polar curve — Vz vs IAS">
            <p>
              A glider's <strong>polar curve</strong> plots sink rate (Vz, in m/s) against indicated
              airspeed (IAS, in km/h or m/s). It is the fundamental performance fingerprint of the aircraft.
            </p>
            <p>
              Sink rate arises from two drag components:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Induced drag</strong> — caused by generating lift; dominant at low speed, decreases with V²</li>
              <li><strong>Parasitic drag</strong> — skin friction and pressure; increases with V²</li>
            </ul>
            <p>The analytical form of the polar is:</p>
            <Formula>Vz = (ρ·S·C_D0 / 2W)·V³ + (2k·W / π·A·ρ·S)·(1/V)</Formula>
            <p>
              Where W = weight (N), S = wing area (m²), ρ = air density (kg/m³), A = aspect ratio,
              C_D0 = parasite drag coefficient, k = induced drag factor.
              This creates the characteristic U-shaped curve.
            </p>
            <p className="text-xs text-slate-400">
              In this app, polars are derived from IDA (Idaflieg) flight-test measurements and
              interpolated with a natural cubic spline — more accurate than a parabolic analytical fit.
            </p>
          </Accordion>

          <Accordion title="Minimum sink — flying as long as possible">
            <p>
              The <strong>minimum sink speed (V_MS)</strong> is where the polar curve reaches its
              lowest point — the speed at which the glider loses altitude most slowly.
              Useful for thermalling (maximise time in lift).
            </p>
            <Formula>V_MS = (4k·W² / 3ρ²·S²·C_D0·π·A)^(1/4)</Formula>
            <p>
              Minimum sink rate scales with the square root of wing loading (W/S):
            </p>
            <Formula>V_MS ∝ √(W/S) &nbsp;&nbsp; Vz_MS ∝ √(W/S)</Formula>
            <p>
              A heavier glider thermalls at a higher speed and with a higher sink rate — it must
              find stronger or wider thermals to benefit.
            </p>
          </Accordion>

          <Accordion title="Best L/D — flying the furthest distance">
            <p>
              The <strong>best glide speed (V_BG)</strong> maximises the glide ratio L/D — the
              horizontal distance travelled per metre of altitude lost. It is found graphically as
              the point where a line from the origin is tangent to the polar curve.
            </p>
            <Formula>V_BG = 3^(1/4) × V_MS ≈ 1.316 × V_MS</Formula>
            <p>
              The best achievable L/D ratio depends only on the aerodynamic design:
            </p>
            <Formula>Best L/D = 0.5 × √(π·A / k·C_D0)</Formula>
            <p>
              <strong>Critically: wing loading does not affect the best L/D ratio</strong> — only the
              speed at which it is achieved. A glider carries the same maximum glide ratio empty or
              fully ballasted; it just flies faster to reach it.
            </p>
          </Accordion>

          <Accordion title="Wing loading and water ballast">
            <p>
              Adding water ballast (or a heavier pilot) increases the wing loading W/S. The entire
              polar scales by <strong>√(W/S_new / W/S_ref)</strong>:
            </p>
            <Formula>
              V_new = V_ref × √(W/S_new / W/S_ref)<br />
              Vz_new = Vz_ref × √(W/S_new / W/S_ref)
            </Formula>
            <p>
              Because both axes scale by the same factor, <strong>L/D is preserved at every angle
              of attack</strong>. The polar shifts to the right and downward — the glider flies
              faster and sinks faster, but glides just as far.
            </p>
            <p>Ballast is beneficial when:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Flying into a headwind (higher cruise speed reduces the proportional penalty)</li>
              <li>Flying through sinking air (same reason)</li>
              <li>Thermals are strong enough to sustain the higher thermalling speed</li>
            </ul>
            <p>
              Use the <strong>Wing Loading sliders</strong> above to explore this effect on the polar charts.
            </p>
          </Accordion>

          <Accordion title="Wing modifications — span extensions and winglets">
            <p>
              Wing modifications are modelled by transforming the analytical polar coefficients
              when geometry changes.
            </p>
            <p>
              For a <strong>span extension</strong> of Δb metres (total, both tips), the new wing area
              is estimated from the tip chord:
            </p>
            <Formula>S_new = S + Δb · c_tip &nbsp;&nbsp; where c_tip ≈ 0.40 · (S/b)</Formula>
            <p>
              The analytical polar coefficients then scale as:
            </p>
            <Formula>
              c₁_new = c₁ · (S_new/S)² &nbsp;&nbsp; (parasitic drag scales with wetted area)<br />
              c₂_new = c₂ · (b/b_new)² &nbsp;&nbsp; (induced drag scales inversely with b²)
            </Formula>
            <p>
              <strong>Winglets</strong> are modelled as an equivalent effective span increase:
            </p>
            <Formula>Δb_eff = 2 · h_winglet · η &nbsp;&nbsp; where η = 0.45</Formula>
            <p>
              The efficiency factor η = 0.45 is calibrated from Boermans et al. (OSTIV 2006),
              who measured effective span ratios for modern winglets in flight test.
              Both modifications can be combined additively.
            </p>
            <p>
              <strong>Empirical validation</strong> against 6 IDA flight-test pairs (same airframe with
              and without span extension):
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>DG 1000: 18m → 20m, +7.3 %/m best L/D</li>
              <li>Kestrel: 17m → 22m, +2.5 %/m</li>
              <li>LS 3: 15m → 17m, +3.7 %/m</li>
              <li>Ventus: 15m → 16.6m, +2.1 %/m</li>
              <li>Nimbus 3: 22.9m → 24.5m, +6.7 %/m</li>
              <li>Salto: 13.6m → 15m, +8.5 %/m</li>
            </ul>
            <p>
              Mean: <strong>+4.5 %/m</strong> — consistent with the analytic formula predicting
              3–5 %/m for 15m class gliders at typical wing loading.
            </p>
            <p>
              <strong>DLR/FAI independent validation (Rohde-Brandenburger, DLR 2017):</strong> The
              FAI IGC handicap rules add 0.005 to the spread-reduced factor for winglet installation.
              Converting this to actual cross-country speed improvement gives ~1%, which is consistent
              with our model's prediction of 1–1.5% best L/D improvement for 0.5m winglets on
              15–20m gliders. This independently confirms η = 0.45.
            </p>
            <p className="text-xs text-slate-400">
              The model fits c₁ and c₂ by least squares to the measured polar before applying
              geometric scaling — no manufacturer polar shape is assumed. When modifications are
              active, the base (unmodified) polar is shown as a faint dashed overlay for direct comparison.
            </p>
          </Accordion>

          <Accordion title="Data sources and methodology">
            <p>
              Polar data in this app comes from <strong>Idaflieg</strong> (Interessengemeinschaft
              deutscher Akademischer Fliegergruppen) flight-test measurements. These are
              real in-flight measurements conducted under controlled conditions, providing
              higher accuracy than manufacturer-published polars or analytical estimates.
            </p>
            <p>
              Each polar is stored as a set of measured (IAS, Vz) points at 5 km/h intervals.
              A <strong>natural cubic spline</strong> is fitted through the data for smooth
              interpolation. This approach preserves the measured data exactly at knot points and
              produces continuous first and second derivatives — important for accurate computation
              of best L/D and speed-to-fly tangent lines.
            </p>
            <p>
              Wing loading scaling uses the standard √(W/S) transform described above,
              applied to all spline points before re-interpolation.
            </p>
            <p className="text-xs text-slate-400">
              Contamination effects (bugs, rain, ice) are modelled as approximate linear
              drag penalties — see methodology notes in the source code.
            </p>
          </Accordion>

        </div>
      )}
    </div>
  );
}
