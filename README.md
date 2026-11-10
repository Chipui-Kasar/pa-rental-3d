# PA Rental Planner (Next.js + Three.js)

Interactive 3D planner for a portable PA system for event hire: Mackie Thump118S subs, Alto TS415 tops,
Yamaha MG10XU mixer, wireless + wired mics, poles/stands, cabling, covers, specs and a ₹3,00,000 budget tracker.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Structure
- `app/` – Next.js App Router shell (server page → client loader → `ssr: false` planner)
- `components/Planner.tsx` – UI: presets, camera buttons, toggles, budget + spec panels
- `lib/three/engine.ts` – scene, lighting, animation, cables, guides, picking, camera tweens
- `lib/three/audioModels.ts`, `miscModels.ts` – procedural models (all geometry/textures generated in code)
- `lib/three/layout.ts` – preset + exploded-view poses
- `lib/specs.ts` – spec data, each value tagged `published` / `approximate` / `unverified`
- `lib/budget.ts` – editable default prices and per-preset quantities

## Data honesty
Only published values are stated as fact. Everything else is tagged **approximate** or **not verified** in the
spec panel – edit `lib/specs.ts` once you have the official datasheets.
# pa-rental-3d
