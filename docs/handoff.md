# Movia PCBA Configuratore — Handoff Document

## Progetto

Wizard web 6-step per preventivare ordini PCB + assemblaggio PCBA.
Working dir: `/Users/nikolajfecchio/Documents/Dmep/movia_configuratore_test`
Branch: `main` — MVP completo, build pulita, 54 test passing.

---

## Stack

| Lib | Versione | Uso |
|-----|----------|-----|
| Vite | 5 | Build tool |
| React | 18 | UI |
| TypeScript | 5 | Typing |
| Tailwind CSS | 3 | Styling |
| Zustand | 4 | State management + localStorage persist |
| React Hook Form | latest | Form step 2-3-6 |
| Three.js / @react-three/fiber | r165 / 8 | 3D viewer |
| @react-three/drei | 9 | OrbitControls |
| pcb-stackup | 4.2.8 | Gerber → SVG (NOT @tracespace/render — non esiste su npm) |
| jszip | latest | Estrai ZIP gerber |
| SheetJS (xlsx) | latest | Parse BOM Excel |
| papaparse | latest | Parse BOM/CPL CSV |
| react-dropzone | latest | Upload file |
| react-hot-toast | latest | Notifiche |
| lucide-react | latest | Icone |
| vite-plugin-node-polyfills | 0.26.0 | Polyfill stream/buffer per pcb-stackup in browser |
| Vitest + @testing-library/react | latest | Test |

---

## Architettura file

```
src/
├── types/order.ts          — tutti i tipi dominio
├── store/orderStore.ts     — Zustand store + persist (key: 'movia-pcba-order')
├── lib/
│   ├── priceCalculator.ts  — formula prezzo (mock multiplier tables)
│   ├── bomParser.ts        — parseBOMFromCSV + parseCPLFromCSV
│   ├── gerberParser.ts     — parseGerberZip + detectLayerCount
│   └── api.ts              — mock API (MOCK_MODE se no VITE_API_BASE_URL)
├── components/
│   ├── Layout.tsx          — shell: header + sidebar + main + right panel
│   ├── StepSidebar.tsx     — 6 step nav, completed clickable
│   ├── PricePanel.tsx      — breakdown prezzi, locale it-IT
│   ├── FileDropzone.tsx    — wrapper react-dropzone
│   ├── BOMTable.tsx        — tabella componenti con filtri tab
│   └── PCBViewer3D.tsx     — Three.js viewer (Board + Components + OrbitControls)
├── steps/
│   ├── Step1_GerberUpload.tsx
│   ├── Step2_PCBConfig.tsx
│   ├── Step3_Assembly.tsx
│   ├── Step4_BOMUpload.tsx
│   ├── Step5_PartsReview.tsx
│   └── Step6_Quote.tsx
└── App.tsx                 — STEP_COMPONENTS map + draft restore banner
```

---

## Tipi chiave (src/types/order.ts)

```typescript
interface GerberMeta {
  layers: number
  width: number    // mm
  height: number   // mm
  originX: number  // mm — left edge board in design space
  originY: number  // mm — bottom edge board in design space
  layerSVGs: { top: string; bottom: string }
}

interface CPLItem {
  designator: string
  layer: 'TopLayer' | 'BottomLayer'
  x: number       // mm (convertito da mil se necessario)
  y: number       // mm
  rotation: number
  description: string
  comment?: string
  footprint?: string
}
```

---

## Note critiche implementazione

### pcb-stackup (gerber parser)
- Package reale: `pcb-stackup@4.2.8` (NON `@tracespace/render` — non esiste su npm)
- CJS interop Vite: `const pcbStackup = (pcbStackupModule as any).default ?? pcbStackupModule`
- API: `pcbStackup(Array<{filename, gerber: string}>)` → `{top: {svg, width, height, units, viewBox}, bottom: {...}}`
- `units` può essere `"in"` (Altium default) o `"mm"` → normalizzare sempre in mm: `toMm = units === 'mm' ? 1 : 25.4`
- `viewBox = [originX, originY, w, h]` in unità interne (×1000) → `originX_mm = vb[0]/1000 * toMm`

### vite-plugin-node-polyfills
- Necessario: pcb-stackup usa `readable-stream` / `string_decoder` (Node built-in, non disponibili in browser)
- Cast `nodePolyfills() as any` in vite.config.ts per evitare TS2769 (Vite types version mismatch)
- `defineConfig` da `vitest/config` (non `vite`) per supportare campo `test`

### Zustand persist
- Key: `'movia-pcba-order'`
- `partialize` esclude: `gerberFiles`, `bomFile`, `cplFile` (File non serializzabile)
- Draft banner in App.tsx: mostra se `parsed?.state?.currentStep > 1`

### Navigazione step
- Step 3 assembly disabled → `setStep(6)` (skip step 4 e 5)
- Step 6 "Indietro" → `setStep(assemblyEnabled ? 5 : 3)` (condizionale!)

### PCBViewer3D — allineamento componenti
- Board mesh centrata a `(0,0,0)` in Three.js
- CPL coordinate assolute → offset con centro board:
  - `px = (item.x - originX - width/2) * SCALE`
  - `pz = -(item.y - originY - height/2) * SCALE`  ← flip Z (gerber Y-up → Three.js -Z)
- `SCALE = 0.01` (mm → Three.js units)
- SVG texture: `Blob URL → HTMLImageElement → canvas.drawImage → THREE.CanvasTexture` (async)
- Sfondo: `gl={{ alpha: false }} onCreated={({ gl }) => gl.setClearColor('#e2e8f0')}`
- Fullscreen: `containerRef.current?.requestFullscreen()` + listener `fullscreenchange`

### BOM parser
- Colonna `Populate`: vuota = `true`, `"DNP"` = `false`
- CPL: salta header Altium fino a riga `"Designator"`, rileva `Units used: mil/mm`
- Formato 6 col (Designator/Layer/X/Y/Rotation/Description) o 8 col (+ Comment/Footprint)

---

## Stato test

```
Test Files  10 passed (10)
Tests       54 passed (54)
```

Nessun test per PCBViewer3D (WebGL non disponibile in jsdom) — verificato con `npx tsc --noEmit`.

---

## File campione per test

```
/Users/nikolajfecchio/Downloads/
├── DemoPortale esempio PCBA 2 layer (1).zip   ← gerber 2 layer
├── DemoPortale esempio PCBA 6 layer (1).zip   ← gerber 6 layer (consigliato)
├── GadgetFiera scheda singola (1).zip
└── GadgetFiera scheda pannello (1).zip

/Users/nikolajfecchio/Downloads/pcba_extracted/pcba_6layer/
├── DemoPortaleBOM.xlsx                         ← BOM Excel
└── Pick Place for DemoPortale.csv              ← CPL Altium 8-col, mil
```

---

## Commit recenti

```
da19352  changed bg in 3D preview
f4d7551  fix: import defineConfig from vitest/config to support test field types
873ae69  fix: resolve TS build errors (unused vars, GerberMeta mock fields, vite plugin cast)
828b367  fix: align 3D components to board (unit normalization + origin offset + Z-flip), add fullscreen toggle
0c26d43  feat: complete PCBA configurator MVP with draft restore
```

---

## API mock (src/lib/api.ts)

Attivo quando `VITE_API_BASE_URL` non impostato. Da sostituire con chiamate reali:
- `getProdotti()` → catalogo componenti
- `salvaConfigurazione(order)` → salva preventivo
- `richiediOrdine(id, contact)` → invia ordine

---

## Prossimi step suggeriti

- Collegare API backend reale (env var `VITE_API_BASE_URL`)
- Autenticazione utente (sessioni, storico ordini)
- Gestione pannello multi-board per un ordine
- Formula prezzi con dati reali fornitore
- Validazione gerber più robusta (outline layer obbligatorio)
- Test e2e con Playwright
