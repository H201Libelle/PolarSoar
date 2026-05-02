# Sailplane Compare

Interactive sailplane performance comparison tool. Compare polar curves, wing loading effects, and contamination penalties across gliders directly in the browser.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS for styling
- Plotly.js for polar charts
- Zustand for app state
- TanStack Table for comparison views
- Vitest for unit tests

## Getting started

```bash
npm install
npm run dev          # starts dev server at http://localhost:5173
npm test             # runs unit tests in watch mode
npm run test:run     # one-shot test run
npm run build        # production build into dist/
npm run typecheck    # strict TypeScript check
```

## Architecture

```
src/
├── data/           # Type definitions and dataset loader
├── physics/        # Pure-function math: NO React imports here
│   ├── polar.ts            # Cubic-spline polar interpolation
│   ├── wingLoading.ts      # Mass-scaling transform
│   ├── contamination.ts    # Bug/rain/ice penalty model
│   ├── performance.ts      # Min sink, best L/D, MacCready STF
│   └── __tests__/          # Vitest unit tests
├── components/     # React UI components
├── store/          # Zustand state
└── utils/          # URL encoding, export helpers
```

**Architectural rule:** `src/physics/` is pure math. No React, no fetch, no DOM. This is what makes the app testable and the math reusable.

## Roadmap

### Week 1 — Data foundation ✅ scaffolded
- [x] Type definitions in `src/data/types.ts`
- [x] Sample dataset at `public/data/gliders.json` (3 gliders)
- [x] App boots, fetches dataset, displays count and per-glider metrics
- [ ] Replace sample dataset with full cleaned export from your `Sailplane_PolarDB.xlsx`

### Week 2 — Physics module ✅ scaffolded
- [x] Cubic spline polar interpolation
- [x] Mass scaling (`scalePolarByMass`)
- [x] Contamination model (`applyContamination`)
- [x] Performance metrics (`computeMetrics`: min sink, best L/D, STF, XC speed)
- [x] Unit tests for all of the above
- [ ] Calibrate contamination penalty constants against published references
- [ ] Add validation script for `gliders.json`

### Week 3 — Single glider view
- [ ] Glider search/filter component (by class, manufacturer, span)
- [ ] Detail panel: specs, computed metrics, polar chart
- [ ] Plotly polar chart with L/D tangent line
- [ ] Mobile-responsive layout

### Week 4 — Comparison mode
- [ ] Multi-select up to 4 gliders
- [ ] Overlay polars on one chart
- [ ] Side-by-side TanStack Table of metrics
- [ ] URL state sync via `lz-string` compression

### Week 5 — Configuration & MacCready
- [ ] Pilot weight + water ballast sliders
- [ ] Bug/rain/ice contamination sliders
- [ ] MacCready setting input
- [ ] Live recompute on slider change

### Week 6 — Export & ship
- [ ] PNG export of polar chart (Plotly built-in)
- [ ] PDF export of comparison via html2canvas + jspdf
- [ ] PWA manifest for offline use
- [ ] Deploy to Netlify
- [ ] About page with methodology and citations

## Methodology

This app uses standard sailplane performance physics:

- **Polar interpolation:** natural cubic spline through measured points. Smooth first/second derivatives are required for tangent-based metrics like best L/D and MacCready speed-to-fly.
- **Mass scaling:** `v_new = v_ref · √(m/m_ref)`, `w_new = w_ref · √(m/m_ref)`. Preserves L/D at every angle of attack.
- **Contamination:** linear penalty in sink rate with CL-dependent weighting (high-speed end penalized more for bugs and rain). v1 model is approximate — see `src/physics/contamination.ts` for parameters and physical reasoning.
- **MacCready speed-to-fly:** tangent from `(0, -MC)` to the polar curve. Average XC speed = `MC · v_stf / (MC + sink_at_v_stf)`.

## License

TBD by author.
