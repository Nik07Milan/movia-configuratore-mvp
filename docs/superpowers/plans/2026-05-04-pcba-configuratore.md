# PCBA Configuratore Frontend — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 6-step wizard frontend for PCBA orders with Gerber/BOM/CPL parsing, real-time mock pricing, and Three.js 3D board preview.

**Architecture:** Vite + React + TypeScript SPA. Zustand store holds all order state. Each step reads/writes the store. A mock API layer mirrors the future Movia REST contract. Three.js (via R3F) renders the PCB board with SMD components from CPL data.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, Zustand 4, React Hook Form, Three.js r165, @react-three/fiber 8, @react-three/drei 9, @tracespace/render@4.x, jszip, xlsx, papaparse, react-dropzone, react-hot-toast, Vitest, @testing-library/react

---

## Chunk 1: Project Setup + Types + Store

### Task 1: Scaffold project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Init Vite project**

```bash
cd /Users/nikolajfecchio/Documents/Dmep/movia_configuratore_test
npm create vite@latest . -- --template react-ts
```
Expected: project files created, no errors.

- [ ] **Step 2: Install all dependencies**

```bash
npm install zustand react-hook-form @hookform/resolvers zod \
  three @react-three/fiber @react-three/drei \
  @tracespace/render@4 jszip xlsx papaparse \
  react-dropzone react-hot-toast lucide-react

npm install -D \
  tailwindcss@3 postcss autoprefixer \
  @types/three @types/papaparse \
  vitest @vitest/coverage-v8 \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  jsdom
```
Expected: node_modules populated, no peer dep errors.

- [ ] **Step 3: Configure Tailwind**

```bash
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 4: Set up src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Configure Vitest in vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 6: Create test setup file**

Create `src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Update tsconfig.json to include test globals**

Ensure `compilerOptions` includes:
```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

- [ ] **Step 8: Smoke test**

```bash
npm run dev
```
Expected: Vite dev server starts on http://localhost:5173

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

### Task 2: Define shared TypeScript types

**Files:**
- Create: `src/types/order.ts`
- Create: `src/types/order.test.ts`

- [ ] **Step 1: Write type sanity test**

Create `src/types/order.test.ts`:
```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type { BOMItem, CPLItem, PriceBreakdown, PCBConfig, AssemblyConfig } from './order'

describe('order types', () => {
  it('BOMItem has populate as boolean', () => {
    expectTypeOf<BOMItem['populate']>().toEqualTypeOf<boolean>()
  })

  it('CPLItem comment is optional', () => {
    expectTypeOf<CPLItem['comment']>().toEqualTypeOf<string | undefined>()
  })

  it('PriceBreakdown has stencil field', () => {
    expectTypeOf<PriceBreakdown['stencil']>().toEqualTypeOf<number>()
  })

  it('solderPaste is union type', () => {
    expectTypeOf<AssemblyConfig['solderPaste']>().toEqualTypeOf<'HighTemp' | 'LeadFree' | 'Standard'>()
  })

  it('PCBConfig layers union', () => {
    expectTypeOf<PCBConfig['layers']>().toEqualTypeOf<1|2|4|6|8|10|12|14|16>()
  })
})
```

- [ ] **Step 2: Run test — expect type errors (file not found)**

```bash
npx vitest run src/types/order.test.ts
```
Expected: FAIL — cannot find module './order'

- [ ] **Step 3: Create src/types/order.ts**

```typescript
export type PCBMaterial = 'FR4' | 'Flex' | 'Aluminum' | 'CopperCore' | 'Rogers' | 'PTFE'
export type PCBLayers = 1 | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16
export type ProductType = 'Industrial' | 'Aerospace' | 'Medical'
export type AssemblyType = 'Economic' | 'Standard'
export type AssemblySide = 'Top' | 'Bottom' | 'Both'
export type SolderPaste = 'HighTemp' | 'LeadFree' | 'Standard'
export type Packaging = 'Antistatic' | 'Standard' | 'None'
export type CPLLayer = 'TopLayer' | 'BottomLayer'

export interface GerberMeta {
  layers: number
  width: number   // mm
  height: number  // mm
  layerSVGs: {
    top: string
    bottom: string
  }
}

export interface PCBConfig {
  material: PCBMaterial
  layers: PCBLayers
  width: number
  height: number
  qty: number
  productType: ProductType
  thickness: number
  surfaceFinish: string
  solderMaskColor: string
  silkscreenColor: string
}

export interface AssemblyConfig {
  type: AssemblyType
  side: AssemblySide
  qty: number
  toolingHoles: 'ByMovia' | 'ByCustomer'
  partsSelection: 'ByCustomer' | 'ByMovia'
  bakeComponents: boolean
  boardCleaning: boolean
  flyingProbeTest: boolean
  conformalCoating: boolean
  packaging: Packaging
  specialStencil: boolean
  depaneling: boolean
  functionTest: boolean
  photoConfirmation: boolean
  solderPaste: SolderPaste
  nitrogenReflow: boolean
  pcbaRemark: string
}

export interface BOMItem {
  comment: string
  description: string
  designator: string
  footprint: string
  libRef: string
  quantity: number
  populate: boolean
}

export interface CPLItem {
  designator: string
  layer: CPLLayer
  x: number
  y: number
  rotation: number
  description: string
  comment?: string
  footprint?: string
}

export interface PriceBreakdown {
  pcbBase: number
  engineeringFee: number
  board: number
  setupFee: number
  stencil: number
  components: number
  smtAssembly: number
  total: number
  buildTimePCB: string
  buildTimeAssembly: string
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/types/order.test.ts
```
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/types/
git commit -m "feat: add shared TypeScript types for order domain"
```

---

### Task 3: Zustand order store

**Files:**
- Create: `src/store/orderStore.ts`
- Create: `src/store/orderStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/store/orderStore.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useOrderStore } from './orderStore'
import type { BOMItem, CPLItem } from '../types/order'

const { getState, setState } = useOrderStore

beforeEach(() => {
  getState().reset()
})

describe('orderStore', () => {
  it('initializes with step 1', () => {
    expect(getState().currentStep).toBe(1)
  })

  it('setStep advances step', () => {
    getState().setStep(3)
    expect(getState().currentStep).toBe(3)
  })

  it('setGerberMeta updates meta', () => {
    getState().setGerberMeta({ layers: 6, width: 100, height: 80, layerSVGs: { top: '<svg/>', bottom: '<svg/>' } })
    expect(getState().gerberMeta?.layers).toBe(6)
  })

  it('setPCBConfig pre-fills from gerberMeta', () => {
    getState().setGerberMeta({ layers: 2, width: 50, height: 40, layerSVGs: { top: '', bottom: '' } })
    const config = getState().pcbConfig
    expect(config.layers).toBe(2)
    expect(config.width).toBe(50)
  })

  it('setBOMParsed stores items', () => {
    const items: BOMItem[] = [{ comment: 'R', description: '', designator: 'R1', footprint: '', libRef: '', quantity: 1, populate: true }]
    getState().setBOMParsed(items)
    expect(getState().bomParsed).toHaveLength(1)
  })

  it('setSelectedDesignator updates selection', () => {
    getState().setSelectedDesignator('R1')
    expect(getState().selectedDesignator).toBe('R1')
  })

  it('reset clears all state', () => {
    getState().setStep(5)
    getState().setSelectedDesignator('U1')
    getState().reset()
    expect(getState().currentStep).toBe(1)
    expect(getState().selectedDesignator).toBeNull()
  })

  it('toggleAssembly updates assemblyEnabled', () => {
    expect(getState().assemblyEnabled).toBe(true)
    getState().toggleAssembly(false)
    expect(getState().assemblyEnabled).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/store/orderStore.test.ts
```
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement orderStore**

Create `src/store/orderStore.ts`:
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GerberMeta, PCBConfig, AssemblyConfig, BOMItem, CPLItem, PriceBreakdown } from '../types/order'

const DEFAULT_PCB_CONFIG: PCBConfig = {
  material: 'FR4',
  layers: 2,
  width: 100,
  height: 100,
  qty: 5,
  productType: 'Industrial',
  thickness: 1.6,
  surfaceFinish: 'HASL',
  solderMaskColor: 'Green',
  silkscreenColor: 'White',
}

const DEFAULT_ASSEMBLY_CONFIG: AssemblyConfig = {
  type: 'Economic',
  side: 'Top',
  qty: 5,
  toolingHoles: 'ByMovia',
  partsSelection: 'ByCustomer',
  bakeComponents: false,
  boardCleaning: false,
  flyingProbeTest: false,
  conformalCoating: false,
  packaging: 'Antistatic',
  specialStencil: false,
  depaneling: false,
  functionTest: false,
  photoConfirmation: false,
  solderPaste: 'HighTemp',
  nitrogenReflow: true,
  pcbaRemark: '',
}

const DEFAULT_PRICE: PriceBreakdown = {
  pcbBase: 0, engineeringFee: 3.38, board: 0,
  setupFee: 0, stencil: 0, components: 0, smtAssembly: 0,
  total: 0, buildTimePCB: '2 giorni', buildTimeAssembly: '2-3 giorni',
}

interface OrderStore {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6
  gerberFiles: File[]
  gerberMeta: GerberMeta | null
  pcbConfig: PCBConfig
  assemblyEnabled: boolean
  assemblyConfig: AssemblyConfig
  bomFile: File | null
  cplFile: File | null
  bomParsed: BOMItem[]
  cplParsed: CPLItem[]
  selectedDesignator: string | null
  priceBreakdown: PriceBreakdown

  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6) => void
  setGerberFiles: (files: File[]) => void
  setGerberMeta: (meta: GerberMeta) => void
  setPCBConfig: (config: Partial<PCBConfig>) => void
  toggleAssembly: (enabled: boolean) => void
  setAssemblyConfig: (config: Partial<AssemblyConfig>) => void
  setBOMFile: (file: File | null) => void
  setCPLFile: (file: File | null) => void
  setBOMParsed: (items: BOMItem[]) => void
  setCPLParsed: (items: CPLItem[]) => void
  setSelectedDesignator: (d: string | null) => void
  setPriceBreakdown: (p: PriceBreakdown) => void
  reset: () => void
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      gerberFiles: [],
      gerberMeta: null,
      pcbConfig: DEFAULT_PCB_CONFIG,
      assemblyEnabled: true,
      assemblyConfig: DEFAULT_ASSEMBLY_CONFIG,
      bomFile: null,
      cplFile: null,
      bomParsed: [],
      cplParsed: [],
      selectedDesignator: null,
      priceBreakdown: DEFAULT_PRICE,

      setStep: (step) => set({ currentStep: step }),
      setGerberFiles: (files) => set({ gerberFiles: files }),
      setGerberMeta: (meta) =>
        set((s) => ({
          gerberMeta: meta,
          pcbConfig: { ...s.pcbConfig, layers: meta.layers as PCBConfig['layers'], width: meta.width, height: meta.height },
        })),
      setPCBConfig: (config) => set((s) => ({ pcbConfig: { ...s.pcbConfig, ...config } })),
      toggleAssembly: (enabled) => set({ assemblyEnabled: enabled }),
      setAssemblyConfig: (config) => set((s) => ({ assemblyConfig: { ...s.assemblyConfig, ...config } })),
      setBOMFile: (file) => set({ bomFile: file }),
      setCPLFile: (file) => set({ cplFile: file }),
      setBOMParsed: (items) => set({ bomParsed: items }),
      setCPLParsed: (items) => set({ cplParsed: items }),
      setSelectedDesignator: (d) => set({ selectedDesignator: d }),
      setPriceBreakdown: (p) => set({ priceBreakdown: p }),
      reset: () =>
        set({
          currentStep: 1, gerberFiles: [], gerberMeta: null,
          pcbConfig: DEFAULT_PCB_CONFIG, assemblyEnabled: true,
          assemblyConfig: DEFAULT_ASSEMBLY_CONFIG,
          bomFile: null, cplFile: null, bomParsed: [], cplParsed: [],
          selectedDesignator: null, priceBreakdown: DEFAULT_PRICE,
        }),
    }),
    {
      name: 'movia-pcba-order',
      // File objects cannot be serialized — exclude them
      partialize: (s) => ({
        currentStep: s.currentStep,
        gerberMeta: s.gerberMeta,
        pcbConfig: s.pcbConfig,
        assemblyEnabled: s.assemblyEnabled,
        assemblyConfig: s.assemblyConfig,
        bomParsed: s.bomParsed,
        cplParsed: s.cplParsed,
        priceBreakdown: s.priceBreakdown,
      }),
    }
  )
)
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/store/orderStore.test.ts
```
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/store/ src/types/
git commit -m "feat: add Zustand order store with persist middleware"
```

---

## Chunk 2: Parser Library + Price Calculator + API Mock

### Task 4: priceCalculator

**Files:**
- Create: `src/lib/priceCalculator.ts`
- Create: `src/lib/priceCalculator.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/priceCalculator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { calculatePrice } from './priceCalculator'
import type { PCBConfig, AssemblyConfig, BOMItem, CPLItem } from '../types/order'

const basePCB: PCBConfig = {
  material: 'FR4', layers: 2, width: 100, height: 100,
  qty: 5, productType: 'Industrial', thickness: 1.6,
  surfaceFinish: 'HASL', solderMaskColor: 'Green', silkscreenColor: 'White',
}

const baseAssembly: AssemblyConfig = {
  type: 'Economic', side: 'Top', qty: 5,
  toolingHoles: 'ByMovia', partsSelection: 'ByCustomer',
  bakeComponents: false, boardCleaning: false, flyingProbeTest: false,
  conformalCoating: false, packaging: 'Antistatic', specialStencil: false,
  depaneling: false, functionTest: false, photoConfirmation: false,
  solderPaste: 'HighTemp', nitrogenReflow: false, pcbaRemark: '',
}

describe('calculatePrice', () => {
  it('engineering fee is always 3.38', () => {
    const result = calculatePrice(basePCB, false, baseAssembly, [], [])
    expect(result.engineeringFee).toBe(3.38)
  })

  it('pcbBase uses area × layer × material multiplier', () => {
    // area = (100*100)/1000 = 10, layer 2 = 1.2, FR4 = 1.0 → pcbBase = 12
    const result = calculatePrice(basePCB, false, baseAssembly, [], [])
    expect(result.pcbBase).toBeCloseTo(12, 1)
  })

  it('board = pcbBase × qtyFactor (qty<=5 → factor 1.0)', () => {
    const result = calculatePrice(basePCB, false, baseAssembly, [], [])
    expect(result.board).toBeCloseTo(result.pcbBase * 1.0, 5)
  })

  it('qty > 10 applies 0.85 factor', () => {
    const result = calculatePrice({ ...basePCB, qty: 7 }, false, baseAssembly, [], [])
    expect(result.board).toBeCloseTo(result.pcbBase * 0.85, 5)
  })

  it('no assembly: setupFee/stencil/components/smt are 0', () => {
    const result = calculatePrice(basePCB, false, baseAssembly, [], [])
    expect(result.setupFee).toBe(0)
    expect(result.stencil).toBe(0)
    expect(result.components).toBe(0)
    expect(result.smtAssembly).toBe(0)
  })

  it('assembly Economic: setupFee 6.76', () => {
    const result = calculatePrice(basePCB, true, baseAssembly, [], [])
    expect(result.setupFee).toBe(6.76)
  })

  it('assembly Standard: setupFee 15.00', () => {
    const result = calculatePrice(basePCB, true, { ...baseAssembly, type: 'Standard' }, [], [])
    expect(result.setupFee).toBe(15.00)
  })

  it('Both sides: stencil 2.54', () => {
    const result = calculatePrice(basePCB, true, { ...baseAssembly, side: 'Both' }, [], [])
    expect(result.stencil).toBe(2.54)
  })

  it('components counts only populate=true items', () => {
    const bom: BOMItem[] = [
      { comment: '', description: '', designator: 'R1', footprint: '', libRef: '', quantity: 1, populate: true },
      { comment: '', description: '', designator: 'H1', footprint: '', libRef: '', quantity: 1, populate: false },
    ]
    const result = calculatePrice(basePCB, true, baseAssembly, bom, [])
    expect(result.components).toBeCloseTo(1 * 0.08, 5)
  })

  it('Rogers material uses 3.5 multiplier', () => {
    const result = calculatePrice({ ...basePCB, material: 'Rogers' }, false, baseAssembly, [], [])
    expect(result.pcbBase).toBeCloseTo(10 * 1.2 * 3.5, 1)
  })

  it('16 layer uses 18.0 multiplier', () => {
    const result = calculatePrice({ ...basePCB, layers: 16 }, false, baseAssembly, [], [])
    expect(result.pcbBase).toBeCloseTo(10 * 18.0 * 1.0, 1)
  })

  it('total = board + engineeringFee when no assembly', () => {
    const result = calculatePrice(basePCB, false, baseAssembly, [], [])
    expect(result.total).toBeCloseTo(result.board + result.engineeringFee, 5)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/lib/priceCalculator.test.ts
```

- [ ] **Step 3: Implement priceCalculator**

Create `src/lib/priceCalculator.ts`:
```typescript
import type { PCBConfig, AssemblyConfig, BOMItem, CPLItem, PriceBreakdown } from '../types/order'

const LAYER_MULTIPLIER: Record<number, number> = {
  1: 1.0, 2: 1.2, 4: 2.1, 6: 3.5, 8: 5.0,
  10: 7.0, 12: 10.0, 14: 14.0, 16: 18.0,
}

const MATERIAL_MULTIPLIER: Record<string, number> = {
  FR4: 1.0, Flex: 2.5, Aluminum: 1.8,
  CopperCore: 2.2, Rogers: 3.5, PTFE: 4.0,
}

function qtyFactor(qty: number): number {
  if (qty <= 5) return 1.0
  if (qty <= 10) return 0.85
  if (qty <= 50) return 0.7
  return 0.55
}

export function calculatePrice(
  pcb: PCBConfig,
  assemblyEnabled: boolean,
  assembly: AssemblyConfig,
  bom: BOMItem[],
  cpl: CPLItem[],
): PriceBreakdown {
  const area = (pcb.width * pcb.height) / 1000
  const pcbBase = area * (LAYER_MULTIPLIER[pcb.layers] ?? 1) * (MATERIAL_MULTIPLIER[pcb.material] ?? 1)
  const engineeringFee = 3.38
  const board = pcbBase * qtyFactor(pcb.qty)

  const setupFee = assemblyEnabled ? (assembly.type === 'Economic' ? 6.76 : 15.0) : 0
  const stencil = assemblyEnabled ? (assembly.side === 'Both' ? 2.54 : 1.27) : 0
  const components = assemblyEnabled ? bom.filter((i) => i.populate).length * 0.08 : 0
  const smtAssembly = assemblyEnabled ? cpl.length * 0.004 : 0

  const total = board + engineeringFee + setupFee + stencil + components + smtAssembly

  return {
    pcbBase, engineeringFee, board,
    setupFee, stencil, components, smtAssembly,
    total, buildTimePCB: '2 giorni', buildTimeAssembly: '2-3 giorni',
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/lib/priceCalculator.test.ts
```
Expected: PASS, 13 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/priceCalculator.ts src/lib/priceCalculator.test.ts
git commit -m "feat: add mock price calculator with full formula"
```

---

### Task 5: BOM + CPL parser

**Files:**
- Create: `src/lib/bomParser.ts`
- Create: `src/lib/bomParser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/bomParser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseBOMFromCSV, parseCPLFromCSV } from './bomParser'

const BOM_CSV_6COL = `Comment,Description,Designator,Footprint,LibRef,Quantity,Populate
SML-P13PTT86R,LED,LED1,LEDC1006X25N,SML-P13PTT86R,2,
BC-2001,Hardware,H1,BC2001,BC-2001,1,DNP`

const CPL_CSV_6COL = `Altium Designer Pick and Place Locations
Units used: mil

"Designator","Layer","Center-X(mil)","Center-Y(mil)","Rotation","Description"
"R1","TopLayer","-755.000","355.000","0","RES SMD"
"LED1","TopLayer","-660.000","355.000","0","LED"
"SW1","BottomLayer","-1060.000","1030.000","60",""`

const CPL_CSV_8COL = `Altium Designer Pick and Place Locations
Units used: mm

"Designator","Comment","Layer","Footprint","Center-X(mm)","Center-Y(mm)","Rotation","Description"
"C1","10pF","BottomLayer","CAP_0201","1.460","2.820","225","CAP"`

describe('parseBOMFromCSV', () => {
  it('parses populate=true when field is empty', () => {
    const items = parseBOMFromCSV(BOM_CSV_6COL)
    expect(items[0].populate).toBe(true)
    expect(items[0].comment).toBe('SML-P13PTT86R')
  })

  it('parses DNP as populate=false', () => {
    const items = parseBOMFromCSV(BOM_CSV_6COL)
    expect(items[1].populate).toBe(false)
    expect(items[1].designator).toBe('H1')
  })

  it('returns correct quantity', () => {
    const items = parseBOMFromCSV(BOM_CSV_6COL)
    expect(items[0].quantity).toBe(2)
  })
})

describe('parseCPLFromCSV — 6 columns mil', () => {
  it('skips Altium header and detects Designator row', () => {
    const items = parseCPLFromCSV(CPL_CSV_6COL)
    expect(items).toHaveLength(3)
  })

  it('converts mil to mm', () => {
    const items = parseCPLFromCSV(CPL_CSV_6COL)
    // -755 mil * 0.0254 = -19.177
    expect(items[0].x).toBeCloseTo(-755 * 0.0254, 2)
  })

  it('parses layer correctly', () => {
    const items = parseCPLFromCSV(CPL_CSV_6COL)
    expect(items[2].layer).toBe('BottomLayer')
  })

  it('parses rotation', () => {
    const items = parseCPLFromCSV(CPL_CSV_6COL)
    expect(items[2].rotation).toBe(60)
  })
})

describe('parseCPLFromCSV — 8 columns mm', () => {
  it('parses mm without conversion', () => {
    const items = parseCPLFromCSV(CPL_CSV_8COL)
    expect(items[0].x).toBeCloseTo(1.460, 3)
  })

  it('populates optional comment field', () => {
    const items = parseCPLFromCSV(CPL_CSV_8COL)
    expect(items[0].comment).toBe('10pF')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/lib/bomParser.test.ts
```

- [ ] **Step 3: Implement bomParser**

Create `src/lib/bomParser.ts`:
```typescript
import Papa from 'papaparse'
import type { BOMItem, CPLItem } from '../types/order'

export function parseBOMFromCSV(csv: string): BOMItem[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  return result.data.map((row) => ({
    comment: row['Comment'] ?? '',
    description: row['Description'] ?? '',
    designator: row['Designator'] ?? '',
    footprint: row['Footprint'] ?? '',
    libRef: row['LibRef'] ?? '',
    quantity: parseInt(row['Quantity'] ?? '1', 10) || 1,
    populate: (row['Populate'] ?? '').trim().toUpperCase() !== 'DNP',
  }))
}

export function parseCPLFromCSV(csv: string): CPLItem[] {
  const lines = csv.split('\n')

  // Detect units from header
  const unitLine = lines.find((l) => l.toLowerCase().includes('units used'))
  const isMil = unitLine?.toLowerCase().includes('mil') ?? false

  // Find the header row (first line where first quoted token is "Designator")
  const headerIdx = lines.findIndex((l) => {
    const first = l.split(',')[0].replace(/"/g, '').trim()
    return first === 'Designator'
  })
  if (headerIdx === -1) return []

  const csvBody = lines.slice(headerIdx).join('\n')

  const result = Papa.parse<Record<string, string>>(csvBody, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.replace(/"/g, '').trim(),
  })

  const convert = (v: string) => {
    const num = parseFloat(v) || 0
    return isMil ? num * 0.0254 : num
  }

  // Find coordinate column names (handle "Center-X(mil)" or "Center-X(mm)")
  const headers = result.meta.fields ?? []
  const xCol = headers.find((h) => h.toLowerCase().startsWith('center-x')) ?? ''
  const yCol = headers.find((h) => h.toLowerCase().startsWith('center-y')) ?? ''

  return result.data.map((row) => {
    const item: CPLItem = {
      designator: row['Designator']?.replace(/"/g, '').trim() ?? '',
      layer: (row['Layer']?.replace(/"/g, '').trim() as CPLItem['layer']) || 'TopLayer',
      x: convert(row[xCol]?.replace(/"/g, '').trim() ?? '0'),
      y: convert(row[yCol]?.replace(/"/g, '').trim() ?? '0'),
      rotation: parseFloat(row['Rotation']?.replace(/"/g, '').trim() ?? '0') || 0,
      description: row['Description']?.replace(/"/g, '').trim() ?? '',
    }
    if (row['Comment'] !== undefined) item.comment = row['Comment'].replace(/"/g, '').trim()
    if (row['Footprint'] !== undefined) item.footprint = row['Footprint'].replace(/"/g, '').trim()
    return item
  })
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/lib/bomParser.test.ts
```
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/bomParser.ts src/lib/bomParser.test.ts
git commit -m "feat: add BOM and CPL parsers with Altium format support"
```

---

### Task 6: API mock layer

**Files:**
- Create: `src/lib/api.ts`
- Create: `src/lib/api.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/api.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { getProdotti, salvaConfigurazione, richiediOrdine } from './api'

describe('api mock', () => {
  it('getProdotti returns materials list', async () => {
    const result = await getProdotti()
    expect(result.materials).toContain('FR4')
    expect(result.materials).toContain('Rogers')
  })

  it('salvaConfigurazione returns id and pdfUrl', async () => {
    const result = await salvaConfigurazione({ note: 'test' })
    expect(result.id).toBeTruthy()
    expect(result.pdfUrl).toContain('mock')
  })

  it('richiediOrdine returns success true', async () => {
    const result = await richiediOrdine({ configId: 'x', contatto: { nome: 'A', email: 'a@b.it', azienda: '', note: '' } })
    expect(result.success).toBe(true)
    expect(result.ticketId).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/lib/api.test.ts
```

- [ ] **Step 3: Implement api.ts**

Create `src/lib/api.ts`:
```typescript
// API layer — oggi mock locale.
// Per attivare backend reale: impostare VITE_API_BASE_URL e rimuovere mock.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const MOCK_MODE = !BASE_URL

interface Prodotti {
  materials: string[]
  surfaceFinishes: string[]
  solderMaskColors: string[]
}

export async function getProdotti(): Promise<Prodotti> {
  if (MOCK_MODE) {
    return {
      materials: ['FR4', 'Flex', 'Aluminum', 'CopperCore', 'Rogers', 'PTFE'],
      surfaceFinishes: ['HASL', 'ENIG', 'OSP', 'HASL (Lead Free)', 'Hard Gold'],
      solderMaskColors: ['Green', 'Red', 'Blue', 'Black', 'White', 'Yellow'],
    }
  }
  const res = await fetch(`${BASE_URL}/api/configuratore/prodotti`)
  return res.json()
}

export async function salvaConfigurazione(state: object): Promise<{ id: string; pdfUrl: string }> {
  if (MOCK_MODE) {
    const id = `MOCK-${Date.now()}`
    return { id, pdfUrl: `/mock-preventivo-${id}.pdf` }
  }
  const res = await fetch(`${BASE_URL}/api/configuratore/salva-configurazione`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state),
  })
  return res.json()
}

interface Contatto { nome: string; email: string; azienda: string; note: string }
export async function richiediOrdine(payload: { configId: string; contatto: Contatto }): Promise<{ success: boolean; ticketId: string }> {
  if (MOCK_MODE) {
    return { success: true, ticketId: `TKT-${Date.now()}` }
  }
  const res = await fetch(`${BASE_URL}/api/configuratore/richiedi-ordine`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  return res.json()
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/lib/api.test.ts
```
Expected: PASS, 3 tests

- [ ] **Step 5: Run all tests so far**

```bash
npx vitest run
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/api.ts src/lib/api.test.ts
git commit -m "feat: add Movia-ready API mock layer"
```

---

### Task 7: Gerber parser

**Files:**
- Create: `src/lib/gerberParser.ts`
- Create: `src/lib/gerberParser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/gerberParser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { detectLayerCount } from './gerberParser'

describe('detectLayerCount', () => {
  it('2-layer board: only GTL + GBL', () => {
    const files = ['board.GTL', 'board.GBL', 'board.GTS', 'board.GBS', 'board.GM1']
    expect(detectLayerCount(files)).toBe(2)
  })

  it('6-layer board: GTL + GBL + G1 G2 G3 G4', () => {
    const files = ['board.GTL', 'board.GBL', 'board.G1', 'board.G2', 'board.G3', 'board.G4']
    expect(detectLayerCount(files)).toBe(6)
  })

  it('ignores .GM* mechanical layers', () => {
    const files = ['board.GTL', 'board.GBL', 'board.GM', 'board.GM9', 'board.GM20']
    expect(detectLayerCount(files)).toBe(2)
  })

  it('case insensitive', () => {
    const files = ['board.gtl', 'board.gbl', 'board.g1', 'board.g2']
    expect(detectLayerCount(files)).toBe(4)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/lib/gerberParser.test.ts
```

- [ ] **Step 3: Implement gerberParser (pure logic + async parse)**

Create `src/lib/gerberParser.ts`:
```typescript
import JSZip from 'jszip'
import render from '@tracespace/render'
import type { GerberMeta } from '../types/order'

/** Pure function — testable without file I/O */
export function detectLayerCount(filenames: string[]): number {
  const innerLayers = filenames.filter((f) => /\.G[0-9]+$/i.test(f)).length
  return 2 + innerLayers
}

export async function parseGerberZip(zipFile: File): Promise<GerberMeta> {
  const zip = await JSZip.loadAsync(zipFile)
  const fileMap: Record<string, string> = {}

  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir) {
      fileMap[name] = await entry.async('string')
    }
  }

  const filenames = Object.keys(fileMap)

  // Validate: must have at least one .GTL
  const hasTop = filenames.some((f) => /\.GTL$/i.test(f))
  if (!hasTop) {
    throw new Error(`ZIP non valido: nessun file .GTL trovato. File presenti: ${filenames.join(', ')}`)
  }

  // @tracespace/render v4 API: Array<{ filename, gerber }>
  const layers = Object.entries(fileMap).map(([filename, gerber]) => ({ filename, gerber }))
  const result = await render(layers)

  // result.top / result.bottom are SVG strings (verify against @tracespace/render@4.x source if keys differ)
  const layerCount = detectLayerCount(filenames)

  return {
    layers: layerCount,
    width: (result as any).width ?? 100,
    height: (result as any).height ?? 100,
    layerSVGs: {
      top: (result as any).top ?? '',
      bottom: (result as any).bottom ?? '',
    },
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/lib/gerberParser.test.ts
```
Expected: PASS, 4 tests (only pure `detectLayerCount` — `parseGerberZip` tested manually in browser)

- [ ] **Step 5: Commit**

```bash
git add src/lib/gerberParser.ts src/lib/gerberParser.test.ts
git commit -m "feat: add gerber parser with layer detection"
```

---

## Chunk 3: Layout Shell + Navigation Components

### Task 8: Layout, StepSidebar, PricePanel

**Files:**
- Create: `src/components/Layout.tsx`
- Create: `src/components/StepSidebar.tsx`
- Create: `src/components/PricePanel.tsx`
- Create: `src/components/StepSidebar.test.tsx`
- Create: `src/components/PricePanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/StepSidebar.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StepSidebar } from './StepSidebar'

const STEPS = [
  { id: 1, label: 'Gerber Upload' },
  { id: 2, label: 'PCB Config' },
  { id: 3, label: 'Assembly' },
  { id: 4, label: 'BOM / CPL' },
  { id: 5, label: 'Review Parti' },
  { id: 6, label: 'Quote' },
] as const

describe('StepSidebar', () => {
  it('renders all 6 steps', () => {
    render(<StepSidebar currentStep={1} completedSteps={[]} onNavigate={() => {}} />)
    expect(screen.getByText('Gerber Upload')).toBeInTheDocument()
    expect(screen.getByText('Quote')).toBeInTheDocument()
  })

  it('marks current step as active', () => {
    render(<StepSidebar currentStep={2} completedSteps={[1]} onNavigate={() => {}} />)
    const active = screen.getByText('PCB Config').closest('[data-active]')
    expect(active).toBeInTheDocument()
  })

  it('calls onNavigate when clicking completed step', async () => {
    const onNav = vi.fn()
    render(<StepSidebar currentStep={3} completedSteps={[1, 2]} onNavigate={onNav} />)
    await userEvent.click(screen.getByText('Gerber Upload'))
    expect(onNav).toHaveBeenCalledWith(1)
  })

  it('does not navigate to future incomplete step', async () => {
    const onNav = vi.fn()
    render(<StepSidebar currentStep={2} completedSteps={[1]} onNavigate={onNav} />)
    await userEvent.click(screen.getByText('Assembly'))
    expect(onNav).not.toHaveBeenCalled()
  })
})
```

Create `src/components/PricePanel.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PricePanel } from './PricePanel'
import type { PriceBreakdown } from '../types/order'

const breakdown: PriceBreakdown = {
  pcbBase: 12, engineeringFee: 3.38, board: 12,
  setupFee: 6.76, stencil: 1.27, components: 0.8,
  smtAssembly: 0.4, total: 24.61,
  buildTimePCB: '2 giorni', buildTimeAssembly: '2-3 giorni',
}

describe('PricePanel', () => {
  it('shows total price formatted', () => {
    render(<PricePanel breakdown={breakdown} assemblyEnabled={true} />)
    expect(screen.getByText(/24/)).toBeInTheDocument()
  })

  it('shows engineering fee', () => {
    render(<PricePanel breakdown={breakdown} assemblyEnabled={true} />)
    expect(screen.getByText(/3,38/)).toBeInTheDocument()
  })

  it('hides assembly rows when assemblyEnabled=false', () => {
    render(<PricePanel breakdown={breakdown} assemblyEnabled={false} />)
    expect(screen.queryByText(/Setup/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/components/StepSidebar.test.tsx src/components/PricePanel.test.tsx
```

- [ ] **Step 3: Create StepSidebar**

Create `src/components/StepSidebar.tsx`:
```tsx
import { CheckCircle, Circle } from 'lucide-react'

const STEPS = [
  { id: 1 as const, label: 'Gerber Upload' },
  { id: 2 as const, label: 'PCB Config' },
  { id: 3 as const, label: 'Assembly' },
  { id: 4 as const, label: 'BOM / CPL' },
  { id: 5 as const, label: 'Review Parti' },
  { id: 6 as const, label: 'Quote' },
]

interface Props {
  currentStep: number
  completedSteps: number[]
  onNavigate: (step: number) => void
}

export function StepSidebar({ currentStep, completedSteps, onNavigate }: Props) {
  return (
    <nav className="w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4 flex flex-col gap-1">
      <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 font-medium">Configurazione</p>
      {STEPS.map(({ id, label }) => {
        const isActive = currentStep === id
        const isDone = completedSteps.includes(id)
        const isClickable = isDone && !isActive

        return (
          <button
            key={id}
            data-active={isActive || undefined}
            onClick={() => isClickable && onNavigate(id)}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
              isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : '',
              isDone && !isActive ? 'text-slate-600 hover:bg-slate-50 cursor-pointer' : '',
              !isDone && !isActive ? 'text-slate-400 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {isDone && !isActive
              ? <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              : <Circle className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-300'}`} />
            }
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Create PricePanel**

Create `src/components/PricePanel.tsx`:
```tsx
import type { PriceBreakdown } from '../types/order'

interface Props {
  breakdown: PriceBreakdown
  assemblyEnabled: boolean
}

function fmt(n: number) {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PricePanel({ breakdown, assemblyEnabled }: Props) {
  return (
    <aside className="w-56 flex-shrink-0 bg-white border-l border-slate-200 p-4 flex flex-col gap-3">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Preventivo</p>

      <div>
        <p className="text-2xl font-bold text-indigo-600">€ {fmt(breakdown.total)}</p>
        <p className="text-xs text-slate-400 mt-0.5">IVA esclusa</p>
      </div>

      <div className="border-t border-slate-100 pt-3 flex flex-col gap-1.5 text-xs text-slate-600">
        <Row label="Engineering fee" value={breakdown.engineeringFee} />
        <Row label="Board" value={breakdown.board} />
        {assemblyEnabled && (
          <>
            <div className="text-slate-400 font-medium mt-1">Assembly</div>
            <Row label="Setup" value={breakdown.setupFee} />
            <Row label="Stencil" value={breakdown.stencil} />
            <Row label="Componenti" value={breakdown.components} />
            <Row label="SMT" value={breakdown.smtAssembly} />
          </>
        )}
      </div>

      <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
        <p>🕒 PCB: {breakdown.buildTimePCB}</p>
        {assemblyEnabled && <p>🕒 Assembly: {breakdown.buildTimeAssembly}</p>}
      </div>
    </aside>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-medium">€ {value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  )
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/components/StepSidebar.test.tsx src/components/PricePanel.test.tsx
```
Expected: PASS, 7 tests

- [ ] **Step 6: Create Layout shell**

Create `src/components/Layout.tsx`:
```tsx
import type { ReactNode } from 'react'
import { StepSidebar } from './StepSidebar'
import { PricePanel } from './PricePanel'
import { useOrderStore } from '../store/orderStore'

interface Props { children: ReactNode }

export function Layout({ children }: Props) {
  const { currentStep, setStep, priceBreakdown, assemblyEnabled } = useOrderStore()

  const completedSteps = Array.from({ length: currentStep - 1 }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <span className="text-indigo-600 font-bold text-lg tracking-tight">Movia</span>
        <span className="text-slate-400 text-sm">/ Configuratore PCBA</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <StepSidebar
          currentStep={currentStep}
          completedSteps={completedSteps}
          onNavigate={(s) => setStep(s as any)}
        />

        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>

        <PricePanel breakdown={priceBreakdown} assemblyEnabled={assemblyEnabled} />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Wire up App.tsx**

Update `src/App.tsx`:
```tsx
import { Toaster } from 'react-hot-toast'
import { Layout } from './components/Layout'
import { useOrderStore } from './store/orderStore'
import { Step1_GerberUpload } from './steps/Step1_GerberUpload'
import { Step2_PCBConfig } from './steps/Step2_PCBConfig'
import { Step3_Assembly } from './steps/Step3_Assembly'
import { Step4_BOMUpload } from './steps/Step4_BOMUpload'
import { Step5_PartsReview } from './steps/Step5_PartsReview'
import { Step6_Quote } from './steps/Step6_Quote'

const STEP_COMPONENTS = {
  1: Step1_GerberUpload,
  2: Step2_PCBConfig,
  3: Step3_Assembly,
  4: Step4_BOMUpload,
  5: Step5_PartsReview,
  6: Step6_Quote,
}

export default function App() {
  const currentStep = useOrderStore((s) => s.currentStep)
  const StepComponent = STEP_COMPONENTS[currentStep]

  return (
    <>
      <Toaster position="top-right" />
      <Layout>
        <StepComponent />
      </Layout>
    </>
  )
}
```

> Note: Step components don't exist yet — create stubs to unblock compilation.

- [ ] **Step 8: Create stub step files**

Create each with minimal content:
```tsx
// src/steps/Step1_GerberUpload.tsx
export function Step1_GerberUpload() { return <div>Step 1 — Gerber Upload</div> }
// repeat for Step2–Step6 with appropriate labels
```

- [ ] **Step 9: Run dev and verify layout renders**

```bash
npm run dev
```
Open http://localhost:5173 — expect: header + sidebar with 6 steps + empty price panel.

- [ ] **Step 10: Commit**

```bash
git add src/components/ src/steps/ src/App.tsx
git commit -m "feat: add Layout shell with StepSidebar and PricePanel"
```

---

## Chunk 4: Steps 1–3

### Task 9: Step 1 — Gerber Upload

**Files:**
- Modify: `src/steps/Step1_GerberUpload.tsx`
- Create: `src/components/FileDropzone.tsx`
- Create: `src/components/FileDropzone.test.tsx`

- [ ] **Step 1: Write FileDropzone test**

Create `src/components/FileDropzone.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FileDropzone } from './FileDropzone'

describe('FileDropzone', () => {
  it('renders label', () => {
    render(<FileDropzone label="Carica ZIP" accept={{ 'application/zip': ['.zip'] }} onFile={() => {}} />)
    expect(screen.getByText('Carica ZIP')).toBeInTheDocument()
  })

  it('shows accepted extensions', () => {
    render(<FileDropzone label="Test" accept={{ 'application/zip': ['.zip'] }} onFile={() => {}} />)
    expect(screen.getByText(/.zip/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/components/FileDropzone.test.tsx
```

- [ ] **Step 3: Implement FileDropzone**

Create `src/components/FileDropzone.tsx`:
```tsx
import { useDropzone, type Accept } from 'react-dropzone'
import { Upload } from 'lucide-react'

interface Props {
  label: string
  accept: Accept
  onFile: (file: File) => void
  currentFile?: File | null
  hint?: string
}

export function FileDropzone({ label, accept, onFile, currentFile, hint }: Props) {
  const extensions = Object.values(accept).flat().join(', ')

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple: false,
    onDropAccepted: ([file]) => onFile(file),
  })

  return (
    <div
      {...getRootProps()}
      className={[
        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50',
        currentFile ? 'border-green-400 bg-green-50' : '',
      ].join(' ')}
    >
      <input {...getInputProps()} />
      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
      {currentFile
        ? <p className="text-sm font-medium text-green-700">{currentFile.name}</p>
        : <>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="text-xs text-slate-400 mt-1">{hint ?? `Formati accettati: ${extensions}`}</p>
          </>
      }
    </div>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/components/FileDropzone.test.tsx
```

- [ ] **Step 5: Implement Step1_GerberUpload**

Replace `src/steps/Step1_GerberUpload.tsx`:
```tsx
import { useState } from 'react'
import toast from 'react-hot-toast'
import { FileDropzone } from '../components/FileDropzone'
import { useOrderStore } from '../store/orderStore'
import { parseGerberZip } from '../lib/gerberParser'
import { calculatePrice } from '../lib/priceCalculator'

export function Step1_GerberUpload() {
  const { gerberFiles, setGerberFiles, setGerberMeta, setPriceBreakdown,
          pcbConfig, assemblyEnabled, assemblyConfig, bomParsed, cplParsed, setStep } = useOrderStore()
  const [loading, setLoading] = useState(false)

  async function handleZip(file: File) {
    setLoading(true)
    try {
      const meta = await parseGerberZip(file)
      setGerberFiles([file])
      setGerberMeta(meta)
      const updatedConfig = { ...pcbConfig, layers: meta.layers as any, width: meta.width, height: meta.height }
      const price = calculatePrice(updatedConfig, assemblyEnabled, assemblyConfig, bomParsed, cplParsed)
      setPriceBreakdown(price)
      toast.success(`Rilevati ${meta.layers} layer — ${meta.width.toFixed(1)} × ${meta.height.toFixed(1)} mm`)
    } catch (e: any) {
      toast.error(e.message ?? 'Errore parsing Gerber')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Carica file Gerber</h1>
      <p className="text-slate-500 text-sm mb-6">
        Carica il file ZIP con i tuoi file Gerber. Deve contenere almeno un file .GTL.
      </p>

      <FileDropzone
        label="Trascina il file ZIP qui, o clicca per selezionarlo"
        accept={{ 'application/zip': ['.zip'], 'application/x-zip-compressed': ['.zip'] }}
        onFile={handleZip}
        currentFile={gerberFiles[0] ?? null}
        hint="Solo .zip — max 100 MB"
      />

      {loading && <p className="text-sm text-indigo-500 mt-4 animate-pulse">Analisi Gerber in corso...</p>}

      {gerberFiles.length > 0 && !loading && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setStep(2)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Avanti →
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Manual verify in browser**

```bash
npm run dev
```
Drop one of the sample ZIP files (`/Users/nikolajfecchio/Downloads/pcba_extracted/pcba_2layer/` — re-zip it). Verify: toast shows layer count, "Avanti" button appears.

- [ ] **Step 7: Commit**

```bash
git add src/steps/Step1_GerberUpload.tsx src/components/FileDropzone.tsx src/components/FileDropzone.test.tsx
git commit -m "feat: Step 1 Gerber upload with ZIP parsing and auto-detect"
```

---

### Task 10: Step 2 — PCB Config

**Files:**
- Modify: `src/steps/Step2_PCBConfig.tsx`

- [ ] **Step 1: Implement Step2_PCBConfig**

Replace `src/steps/Step2_PCBConfig.tsx`:
```tsx
import { useForm } from 'react-hook-form'
import { useOrderStore } from '../store/orderStore'
import { calculatePrice } from '../lib/priceCalculator'
import type { PCBConfig } from '../types/order'

const MATERIALS = ['FR4', 'Flex', 'Aluminum', 'CopperCore', 'Rogers', 'PTFE'] as const
const LAYERS = [1, 2, 4, 6, 8, 10, 12, 14, 16] as const
const PRODUCT_TYPES = ['Industrial', 'Aerospace', 'Medical'] as const
const SURFACE_FINISHES = ['HASL', 'ENIG', 'OSP', 'HASL (Lead Free)', 'Hard Gold']
const SOLDER_COLORS = ['Green', 'Red', 'Blue', 'Black', 'White', 'Yellow']
const SILK_COLORS = ['White', 'Black']

const SOLDER_HEX: Record<string, string> = {
  Green: '#1a5c1a', Red: '#8b0000', Blue: '#00008b',
  Black: '#111111', White: '#f5f5f5', Yellow: '#ccaa00',
}

export function Step2_PCBConfig() {
  const { pcbConfig, setPCBConfig, setStep, assemblyEnabled, assemblyConfig, bomParsed, cplParsed, setPriceBreakdown } = useOrderStore()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<PCBConfig>({
    defaultValues: pcbConfig,
  })

  const solderColor = watch('solderMaskColor', pcbConfig.solderMaskColor)

  function onSubmit(data: PCBConfig) {
    setPCBConfig(data)
    const price = calculatePrice(data, assemblyEnabled, assemblyConfig, bomParsed, cplParsed)
    setPriceBreakdown(price)
    setStep(3)
  }

  // Update price on any change
  function onChange(data: Partial<PCBConfig>) {
    const merged = { ...pcbConfig, ...data }
    const price = calculatePrice(merged, assemblyEnabled, assemblyConfig, bomParsed, cplParsed)
    setPriceBreakdown(price)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Configurazione PCB</h1>
      <p className="text-slate-500 text-sm mb-6">Specifica le caratteristiche della scheda.</p>

      {/* PCB color preview */}
      <div
        className="w-24 h-16 rounded-lg mb-6 border border-slate-200 shadow-inner transition-colors"
        style={{ backgroundColor: SOLDER_HEX[solderColor] ?? '#1a5c1a' }}
        title={`Solder mask: ${solderColor}`}
      />

      <form onSubmit={handleSubmit(onSubmit)} onChange={(e) => {
        const fd = new FormData(e.currentTarget)
        const partial: Record<string, any> = {}
        fd.forEach((v, k) => partial[k] = v)
        onChange(partial as Partial<PCBConfig>)
      }} className="grid grid-cols-2 gap-4">

        <Field label="Materiale base">
          <select {...register('material', { required: true })} className={INPUT}>
            {MATERIALS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>

        <Field label="Layer">
          <select {...register('layers', { required: true, valueAsNumber: true })} className={INPUT}>
            {LAYERS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>

        <Field label="Larghezza (mm)">
          <input type="number" step="0.1" {...register('width', { required: true, valueAsNumber: true })} className={INPUT} />
        </Field>

        <Field label="Altezza (mm)">
          <input type="number" step="0.1" {...register('height', { required: true, valueAsNumber: true })} className={INPUT} />
        </Field>

        <Field label="Quantità PCB">
          <input type="number" min="1" {...register('qty', { required: true, valueAsNumber: true, min: 1 })} className={INPUT} />
        </Field>

        <Field label="Tipo prodotto">
          <select {...register('productType')} className={INPUT}>
            {PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <div className="col-span-2 border-t border-slate-100 pt-3 mt-1">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Specifiche avanzate</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Spessore (mm)">
              <input type="number" step="0.1" {...register('thickness', { valueAsNumber: true })} className={INPUT} />
            </Field>
            <Field label="Finitura superficiale">
              <select {...register('surfaceFinish')} className={INPUT}>
                {SURFACE_FINISHES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Colore solder mask">
              <select {...register('solderMaskColor')} className={INPUT}>
                {SOLDER_COLORS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Colore silkscreen">
              <select {...register('silkscreenColor')} className={INPUT}>
                {SILK_COLORS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="col-span-2 flex justify-between mt-2">
          <button type="button" onClick={() => setStep(1)} className={BTN_SEC}>← Indietro</button>
          <button type="submit" className={BTN_PRI}>Avanti →</button>
        </div>
      </form>
    </div>
  )
}

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300'
const BTN_PRI = 'bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors'
const BTN_SEC = 'text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1 font-medium">{label}</label>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Manual verify**

```bash
npm run dev
```
Complete Step 1, then Step 2. Verify: color swatch updates on solder mask change, price updates.

- [ ] **Step 3: Commit**

```bash
git add src/steps/Step2_PCBConfig.tsx
git commit -m "feat: Step 2 PCB configuration form with live price update"
```

---

### Task 11: Step 3 — Assembly

**Files:**
- Modify: `src/steps/Step3_Assembly.tsx`

- [ ] **Step 1: Implement Step3_Assembly**

Replace `src/steps/Step3_Assembly.tsx`:
```tsx
import { useState } from 'react'
import { useOrderStore } from '../store/orderStore'
import { calculatePrice } from '../lib/priceCalculator'
import type { AssemblyConfig } from '../types/order'

export function Step3_Assembly() {
  const { assemblyEnabled, toggleAssembly, assemblyConfig, setAssemblyConfig,
          pcbConfig, bomParsed, cplParsed, setPriceBreakdown, setStep } = useOrderStore()
  const [showAdvanced, setShowAdvanced] = useState(false)

  function update(partial: Partial<AssemblyConfig>) {
    setAssemblyConfig(partial)
    const merged = { ...assemblyConfig, ...partial }
    const price = calculatePrice(pcbConfig, assemblyEnabled, merged, bomParsed, cplParsed)
    setPriceBreakdown(price)
  }

  function handleToggle(enabled: boolean) {
    toggleAssembly(enabled)
    const price = calculatePrice(pcbConfig, enabled, assemblyConfig, bomParsed, cplParsed)
    setPriceBreakdown(price)
    if (!enabled) setStep(6)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Assembly (PCBA)</h1>
      <p className="text-slate-500 text-sm mb-6">Configura il montaggio componenti. Puoi saltare se vuoi solo il PCB nudo.</p>

      {/* Toggle */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => handleToggle(!assemblyEnabled)}
          className={`w-12 h-6 rounded-full transition-colors ${assemblyEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
        >
          <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${assemblyEnabled ? 'translate-x-6' : ''}`} />
        </button>
        <span className="text-sm font-medium text-slate-700">
          {assemblyEnabled ? 'Assembly attivo' : 'Solo PCB nudo — salta assembly'}
        </span>
      </div>

      {assemblyEnabled && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo PCBA">
            <Seg options={['Economic', 'Standard']} value={assemblyConfig.type} onChange={(v) => update({ type: v as any })} />
          </Field>

          <Field label="Lato montaggio">
            <Seg options={['Top', 'Bottom', 'Both']} value={assemblyConfig.side} onChange={(v) => update({ side: v as any })} />
          </Field>

          <Field label="Quantità PCBA">
            <input
              type="number" min="1" max={pcbConfig.qty}
              value={assemblyConfig.qty}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                if (v > pcbConfig.qty) return
                update({ qty: v })
              }}
              className={INPUT}
            />
            {assemblyConfig.qty > pcbConfig.qty && (
              <p className="text-xs text-red-500 mt-1">Qty PCBA non può superare qty PCB ({pcbConfig.qty})</p>
            )}
          </Field>

          <Field label="Fori tooling">
            <Seg options={['ByMovia', 'ByCustomer']} value={assemblyConfig.toolingHoles} onChange={(v) => update({ toolingHoles: v as any })} />
          </Field>

          <Field label="Selezione componenti">
            <Seg options={['ByCustomer', 'ByMovia']} value={assemblyConfig.partsSelection} onChange={(v) => update({ partsSelection: v as any })} />
          </Field>

          <div className="col-span-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-xs text-indigo-500 hover:underline"
            >
              {showAdvanced ? '▲ Nascondi opzioni avanzate' : '▼ Mostra opzioni avanzate'}
            </button>
          </div>

          {showAdvanced && (
            <div className="col-span-2 grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              {[
                ['bakeComponents', 'Bake componenti'],
                ['boardCleaning', 'Pulizia scheda'],
                ['flyingProbeTest', 'Flying Probe Test'],
                ['conformalCoating', 'Conformal Coating'],
                ['specialStencil', 'Stencil speciale'],
                ['depaneling', 'Depaneling'],
                ['functionTest', 'Function Test'],
                ['photoConfirmation', 'Photo Confirmation'],
                ['nitrogenReflow', 'Nitrogen Reflow'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assemblyConfig[key as keyof AssemblyConfig] as boolean}
                    onChange={(e) => update({ [key]: e.target.checked } as any)}
                    className="rounded text-indigo-500"
                  />
                  {label}
                </label>
              ))}
              <Field label="Solder Paste">
                <Seg options={['HighTemp', 'LeadFree', 'Standard']} value={assemblyConfig.solderPaste} onChange={(v) => update({ solderPaste: v as any })} />
              </Field>
              <Field label="Packaging">
                <Seg options={['Antistatic', 'Standard', 'None']} value={assemblyConfig.packaging} onChange={(v) => update({ packaging: v as any })} />
              </Field>
              <div className="col-span-2">
                <Field label="Note PCBA">
                  <input type="text" value={assemblyConfig.pcbaRemark} onChange={(e) => update({ pcbaRemark: e.target.value })} className={INPUT} placeholder="Facoltativo" />
                </Field>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(2)} className={BTN_SEC}>← Indietro</button>
        <button onClick={() => setStep(assemblyEnabled ? 4 : 6)} className={BTN_PRI}>Avanti →</button>
      </div>
    </div>
  )
}

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300'
const BTN_PRI = 'bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors'
const BTN_SEC = 'text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1 font-medium">{label}</label>
      {children}
    </div>
  )
}

function Seg({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-200">
      {options.map((o) => (
        <button
          key={o} type="button"
          onClick={() => onChange(o)}
          className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${value === o ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Manual verify**

```bash
npm run dev
```
Step 3: toggle disattiva assembly e salta a Step 6. Advanced options collapsible. Qty validation.

- [ ] **Step 3: Commit**

```bash
git add src/steps/Step3_Assembly.tsx
git commit -m "feat: Step 3 assembly configuration with advanced options"
```

---

## Chunk 5: Steps 4–6 + BOMTable

### Task 12: Step 4 — BOM + CPL Upload

**Files:**
- Modify: `src/steps/Step4_BOMUpload.tsx`

- [ ] **Step 1: Implement Step4_BOMUpload**

Replace `src/steps/Step4_BOMUpload.tsx`:
```tsx
import { useState } from 'react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { FileDropzone } from '../components/FileDropzone'
import { useOrderStore } from '../store/orderStore'
import { parseBOMFromCSV, parseCPLFromCSV } from '../lib/bomParser'
import { calculatePrice } from '../lib/priceCalculator'

export function Step4_BOMUpload() {
  const { bomFile, cplFile, setBOMFile, setCPLFile, setBOMParsed, setCPLParsed,
          pcbConfig, assemblyEnabled, assemblyConfig, setPriceBreakdown, setStep } = useOrderStore()
  const [parsing, setParsing] = useState(false)

  async function handleBOM(file: File) {
    setBOMFile(file)
    try {
      let csv: string
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf)
        csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])
      } else {
        csv = await file.text()
      }
      const items = parseBOMFromCSV(csv)
      setBOMParsed(items)
      toast.success(`BOM: ${items.length} righe, ${items.filter((i) => i.populate).length} da montare`)
    } catch (e: any) {
      toast.error(`Errore BOM: ${e.message}`)
    }
  }

  async function handleCPL(file: File) {
    setCPLFile(file)
    try {
      const text = await file.text()
      const items = parseCPLFromCSV(text)
      setCPLParsed(items)
      const price = calculatePrice(pcbConfig, assemblyEnabled, assemblyConfig, useOrderStore.getState().bomParsed, items)
      setPriceBreakdown(price)
      toast.success(`CPL: ${items.length} componenti`)
    } catch (e: any) {
      toast.error(`Errore CPL: ${e.message}`)
    }
  }

  const canProceed = bomFile && cplFile

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">BOM + CPL</h1>
      <p className="text-slate-500 text-sm mb-6">
        Carica la Bill of Materials e il file di piazzamento (Pick&amp;Place).
      </p>

      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Bill of Materials (BOM)</p>
          <FileDropzone
            label="Carica BOM — .xlsx o .csv"
            accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] }}
            onFile={handleBOM}
            currentFile={bomFile}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Pick &amp; Place / CPL</p>
          <FileDropzone
            label="Carica CPL — .csv (formato Altium)"
            accept={{ 'text/csv': ['.csv'] }}
            onFile={handleCPL}
            currentFile={cplFile}
          />
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(3)} className={BTN_SEC}>← Indietro</button>
        <button onClick={() => setStep(5)} disabled={!canProceed} className={canProceed ? BTN_PRI : BTN_DIS}>
          Avanti →
        </button>
      </div>
    </div>
  )
}

const BTN_PRI = 'bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors'
const BTN_SEC = 'text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors'
const BTN_DIS = 'bg-slate-200 text-slate-400 px-6 py-2 rounded-lg text-sm font-medium cursor-not-allowed'
```

- [ ] **Step 2: Manual verify with sample files**

Use `/Users/nikolajfecchio/Downloads/pcba_extracted/pcba_2layer/DemoPortaleBOM.xlsx` and `Pick Place for DemoPortale.csv`. Verify toasts show correct counts.

- [ ] **Step 3: Commit**

```bash
git add src/steps/Step4_BOMUpload.tsx
git commit -m "feat: Step 4 BOM and CPL upload with xlsx/csv parsing"
```

---

### Task 13: BOMTable + Step 5

**Files:**
- Create: `src/components/BOMTable.tsx`
- Create: `src/components/BOMTable.test.tsx`
- Modify: `src/steps/Step5_PartsReview.tsx`

- [ ] **Step 1: Write BOMTable tests**

Create `src/components/BOMTable.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BOMTable } from './BOMTable'
import type { BOMItem, CPLItem } from '../types/order'

const bom: BOMItem[] = [
  { comment: 'LED', description: '', designator: 'LED1', footprint: 'LEDC', libRef: '', quantity: 2, populate: true },
  { comment: 'HW', description: '', designator: 'H1', footprint: 'BC2001', libRef: '', quantity: 1, populate: false },
]
const cpl: CPLItem[] = [
  { designator: 'LED1', layer: 'TopLayer', x: 10, y: 20, rotation: 0, description: 'LED' },
]

describe('BOMTable', () => {
  it('renders designator column', () => {
    render(<BOMTable bom={bom} cpl={cpl} onSelect={() => {}} selectedDesignator={null} />)
    expect(screen.getByText('LED1')).toBeInTheDocument()
  })

  it('shows DNP badge for populate=false', () => {
    render(<BOMTable bom={bom} cpl={cpl} onSelect={() => {}} selectedDesignator={null} />)
    expect(screen.getByText('DNP')).toBeInTheDocument()
  })

  it('calls onSelect when row clicked', async () => {
    const onSelect = vi.fn()
    render(<BOMTable bom={bom} cpl={cpl} onSelect={onSelect} selectedDesignator={null} />)
    await userEvent.click(screen.getByText('LED1'))
    expect(onSelect).toHaveBeenCalledWith('LED1')
  })

  it('highlights selected row', () => {
    render(<BOMTable bom={bom} cpl={cpl} onSelect={() => {}} selectedDesignator="LED1" />)
    const row = screen.getByText('LED1').closest('tr')
    expect(row?.className).toContain('indigo')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/components/BOMTable.test.tsx
```

- [ ] **Step 3: Implement BOMTable**

Create `src/components/BOMTable.tsx`:
```tsx
import { useState } from 'react'
import type { BOMItem, CPLItem } from '../types/order'

type Filter = 'all' | 'top' | 'bottom' | 'dnp'

interface Props {
  bom: BOMItem[]
  cpl: CPLItem[]
  onSelect: (designator: string) => void
  selectedDesignator: string | null
}

export function BOMTable({ bom, cpl, onSelect, selectedDesignator }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const cplMap = new Map(cpl.map((c) => [c.designator, c]))

  const filtered = bom.filter((item) => {
    if (filter === 'dnp') return !item.populate
    if (filter === 'top') return cplMap.get(item.designator)?.layer === 'TopLayer'
    if (filter === 'bottom') return cplMap.get(item.designator)?.layer === 'BottomLayer'
    return true
  })

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {(['all', 'top', 'bottom', 'dnp'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs font-medium ${filter === f ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {f === 'all' ? 'Tutti' : f === 'top' ? 'Top' : f === 'bottom' ? 'Bottom' : 'DNP'}
            <span className="ml-1 text-slate-400">
              ({f === 'all' ? bom.length : f === 'dnp' ? bom.filter((i) => !i.populate).length
                : bom.filter((i) => cplMap.get(i.designator)?.layer === (f === 'top' ? 'TopLayer' : 'BottomLayer')).length})
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Designator</th>
              <th className="px-3 py-2 text-left">Comment</th>
              <th className="px-3 py-2 text-left">Footprint</th>
              <th className="px-3 py-2 text-left">Layer</th>
              <th className="px-3 py-2 text-left">Qty</th>
              <th className="px-3 py-2 text-left">Stato</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const cplItem = cplMap.get(item.designator)
              const isSelected = selectedDesignator === item.designator
              return (
                <tr
                  key={item.designator}
                  onClick={() => onSelect(item.designator)}
                  className={`border-t border-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-3 py-2 font-mono font-medium">{item.designator}</td>
                  <td className="px-3 py-2 text-slate-600">{item.comment}</td>
                  <td className="px-3 py-2 text-slate-500">{item.footprint}</td>
                  <td className="px-3 py-2 text-slate-500">{cplItem?.layer?.replace('Layer', '') ?? '—'}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">
                    {!item.populate
                      ? <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-xs font-medium">DNP</span>
                      : <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">✓ Confermato</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-2">
        {bom.filter((i) => i.populate).length} da montare · {bom.filter((i) => !i.populate).length} DNP · {cpl.length} posizioni CPL
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/components/BOMTable.test.tsx
```
Expected: PASS, 4 tests

- [ ] **Step 5: Implement Step5_PartsReview**

Replace `src/steps/Step5_PartsReview.tsx`:
```tsx
import { useOrderStore } from '../store/orderStore'
import { BOMTable } from '../components/BOMTable'

export function Step5_PartsReview() {
  const { bomParsed, cplParsed, selectedDesignator, setSelectedDesignator, setStep } = useOrderStore()

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Review Parti</h1>
      <p className="text-slate-500 text-sm mb-6">
        Verifica i componenti rilevati. Clicca una riga per evidenziare il componente nel viewer 3D.
      </p>

      <BOMTable
        bom={bomParsed}
        cpl={cplParsed}
        onSelect={(d) => setSelectedDesignator(selectedDesignator === d ? null : d)}
        selectedDesignator={selectedDesignator}
      />

      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(4)} className={BTN_SEC}>← Indietro</button>
        <button onClick={() => setStep(6)} className={BTN_PRI}>Avanti →</button>
      </div>
    </div>
  )
}

const BTN_PRI = 'bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors'
const BTN_SEC = 'text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors'
```

- [ ] **Step 6: Commit**

```bash
git add src/steps/Step5_PartsReview.tsx src/components/BOMTable.tsx src/components/BOMTable.test.tsx
git commit -m "feat: BOMTable component and Step 5 parts review"
```

---

### Task 14: Step 6 — Quote

**Files:**
- Modify: `src/steps/Step6_Quote.tsx`

- [ ] **Step 1: Implement Step6_Quote**

Replace `src/steps/Step6_Quote.tsx`:
```tsx
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useOrderStore } from '../store/orderStore'
import { salvaConfigurazione, richiediOrdine } from '../lib/api'

export function Step6_Quote() {
  const { priceBreakdown, assemblyEnabled, pcbConfig, assemblyConfig, reset, setStep } = useOrderStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', azienda: '', note: '' })
  const [sending, setSending] = useState(false)

  const p = priceBreakdown

  function fmt(n: number) {
    return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  async function handleSave() {
    try {
      const result = await salvaConfigurazione({ pcbConfig, assemblyEnabled, assemblyConfig, priceBreakdown })
      // Download as JSON
      const blob = new Blob([JSON.stringify({ ...useOrderStore.getState(), gerberFiles: undefined }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `preventivo-${result.id}.json`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Preventivo salvato')
    } catch {
      toast.error('Errore salvataggio')
    }
  }

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      const save = await salvaConfigurazione({ pcbConfig, assemblyEnabled, assemblyConfig, priceBreakdown })
      const result = await richiediOrdine({ configId: save.id, contatto: form })
      toast.success(`Ordine inviato — Ticket: ${result.ticketId}`)
      setShowForm(false)
    } catch {
      toast.error('Errore invio ordine')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Preventivo</h1>
      <p className="text-slate-500 text-sm mb-6">Riepilogo costi e tempi di produzione.</p>

      {/* Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wider">PCB</h2>
        <Row label="Engineering fee" value={fmt(p.engineeringFee)} />
        <Row label="Board" value={fmt(p.board)} />

        {assemblyEnabled && (
          <>
            <h2 className="text-sm font-semibold text-slate-600 mt-4 mb-3 uppercase tracking-wider">Assembly (PCBA)</h2>
            <Row label="Setup" value={fmt(p.setupFee)} />
            <Row label="Stencil" value={fmt(p.stencil)} />
            <Row label="Componenti" value={fmt(p.components)} />
            <Row label="SMT Assembly" value={fmt(p.smtAssembly)} />
          </>
        )}

        <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-center">
          <span className="font-semibold text-slate-700">Totale (IVA esclusa)</span>
          <span className="text-2xl font-bold text-indigo-600">€ {fmt(p.total)}</span>
        </div>
      </div>

      {/* Build time */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-6 text-sm text-slate-600">
        <p>🕒 Produzione PCB: <strong>{p.buildTimePCB}</strong></p>
        {assemblyEnabled && <p className="mt-1">🕒 Assembly: <strong>{p.buildTimeAssembly}</strong></p>}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-4">
        <button onClick={handleSave} className="flex-1 border border-indigo-300 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">
          Salva preventivo
        </button>
        <button onClick={() => setShowForm((s) => !s)} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          Richiedi ordine
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleOrder} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-700">Dati di contatto</h2>
          {[['nome', 'Nome *'], ['email', 'Email *'], ['azienda', 'Azienda'], ['note', 'Note']].map(([k, label]) => (
            <div key={k}>
              <label className="block text-xs text-slate-500 mb-1">{label}</label>
              <input
                required={k === 'nome' || k === 'email'}
                type={k === 'email' ? 'email' : 'text'}
                value={form[k as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end mt-1">
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 px-4 py-2 text-sm">Annulla</button>
            <button type="submit" disabled={sending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {sending ? 'Invio...' : 'Invia ordine'}
            </button>
          </div>
        </form>
      )}

      <div className="flex justify-between mt-4">
        <button
          onClick={() => setStep(assemblyEnabled ? 5 : 3)}
          className="text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100"
        >
          ← Indietro
        </button>
        <button onClick={() => { reset(); setStep(1) }} className="text-slate-400 px-4 py-2 text-sm hover:underline">
          Nuova configurazione
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">€ {value}</span>
    </div>
  )
}
```

- [ ] **Step 2: Manual verify full flow**

Go through all 6 steps end to end. Verify: save downloads JSON, "Richiedi ordine" shows success toast.

- [ ] **Step 3: Commit**

```bash
git add src/steps/Step6_Quote.tsx
git commit -m "feat: Step 6 quote with breakdown, save, and order form"
```

---

## Chunk 6: PCBViewer3D (Three.js / R3F)

### Task 15: PCBViewer3D component

**Files:**
- Create: `src/components/PCBViewer3D.tsx`
- Modify: `src/components/Layout.tsx` — add viewer panel

- [ ] **Step 1: Implement PCBViewer3D**

Create `src/components/PCBViewer3D.tsx`:
```tsx
import { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { GerberMeta, CPLItem } from '../types/order'

// Component type detection from designator prefix
function componentColor(designator: string): string {
  const prefix = designator.replace(/[0-9]/g, '').toUpperCase()
  if (['IC', 'U'].some((p) => prefix.startsWith(p))) return '#1a1a1a'
  if (prefix.startsWith('R')) return '#c8a96e'
  if (prefix.startsWith('C')) return '#d4a800'
  if (prefix.startsWith('LED')) return '#cc2200'
  if (prefix.startsWith('L')) return '#2244aa'
  return '#666666'
}

const SOLDER_MASK_COLORS: Record<string, string> = {
  Green: '#1a5c1a', Red: '#8b0000', Blue: '#00008b',
  Black: '#111111', White: '#f5f5f5', Yellow: '#ccaa00',
}

const SCALE = 0.01 // mm → three units (1mm = 0.01 units)
const BOARD_THICKNESS = 1.6 * SCALE

// Convert SVG string to THREE.Texture (async)
async function svgToTexture(svgString: string): Promise<THREE.CanvasTexture> {
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = rej
    img.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || 512
  canvas.height = img.naturalHeight || 512
  canvas.getContext('2d')!.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)
  return new THREE.CanvasTexture(canvas)
}

interface BoardProps {
  meta: GerberMeta
  solderMaskColor: string
  showBottom: boolean
}

function Board({ meta, solderMaskColor, showBottom }: BoardProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [topTexture, setTopTexture] = useState<THREE.CanvasTexture | null>(null)
  const [bottomTexture, setBottomTexture] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    if (meta.layerSVGs.top) svgToTexture(meta.layerSVGs.top).then(setTopTexture).catch(() => {})
    if (meta.layerSVGs.bottom) svgToTexture(meta.layerSVGs.bottom).then(setBottomTexture).catch(() => {})
  }, [meta])

  const color = SOLDER_MASK_COLORS[solderMaskColor] ?? '#1a5c1a'
  const texture = showBottom ? bottomTexture : topTexture

  return (
    <mesh ref={meshRef} rotation={showBottom ? [Math.PI, 0, 0] : [0, 0, 0]}>
      <boxGeometry args={[meta.width * SCALE, BOARD_THICKNESS, meta.height * SCALE]} />
      <meshStandardMaterial color={color} map={texture ?? null} />
    </mesh>
  )
}

interface ComponentsProps {
  cpl: CPLItem[]
  selectedDesignator: string | null
  showBottom: boolean
}

function Components({ cpl, selectedDesignator, showBottom }: ComponentsProps) {
  const COMP_H = 0.2 * SCALE
  const yOffset = BOARD_THICKNESS / 2 + COMP_H / 2

  return (
    <>
      {cpl.map((item) => {
        const isBottom = item.layer === 'BottomLayer'
        if (isBottom !== showBottom) return null
        const y = isBottom ? -yOffset : yOffset
        const color = item.designator === selectedDesignator ? '#ffff00' : componentColor(item.designator)
        return (
          <mesh
            key={item.designator}
            position={[item.x * SCALE, y, item.y * SCALE]}
            rotation={[0, THREE.MathUtils.degToRad(item.rotation), 0]}
          >
            <boxGeometry args={[0.5 * SCALE, COMP_H, 0.5 * SCALE]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )
      })}
    </>
  )
}

interface Props {
  meta: GerberMeta | null
  cpl: CPLItem[]
  selectedDesignator: string | null
  solderMaskColor: string
}

export function PCBViewer3D({ meta, cpl, selectedDesignator, solderMaskColor }: Props) {
  const [showBottom, setShowBottom] = useState(false)

  if (!meta) {
    return (
      <div className="flex-1 bg-slate-100 flex items-center justify-center text-sm text-slate-400 rounded-xl">
        Carica un file Gerber per la preview 3D
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex gap-2">
        <button
          onClick={() => setShowBottom(false)}
          className={`px-3 py-1 rounded text-xs font-medium ${!showBottom ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}
        >
          Top
        </button>
        <button
          onClick={() => setShowBottom(true)}
          className={`px-3 py-1 rounded text-xs font-medium ${showBottom ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}
        >
          Bottom
        </button>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden bg-slate-900 min-h-48">
        <Canvas camera={{ position: [0, 3, 3], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Board meta={meta} solderMaskColor={solderMaskColor} showBottom={showBottom} />
          <Components cpl={cpl} selectedDesignator={selectedDesignator} showBottom={showBottom} />
          <OrbitControls makeDefault />
        </Canvas>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire viewer into Layout**

Update `src/components/Layout.tsx` — add the viewer below the main content area or as an integrated panel. Replace the layout to include a bottom panel for the 3D viewer:

```tsx
// In Layout.tsx, add import:
import { PCBViewer3D } from './PCBViewer3D'
import { useOrderStore } from '../store/orderStore'

// Replace the <main> section with split layout:
// Left: existing step content (flex-1)
// Right sidebar: 3D viewer (w-80, below price panel or separate)
```

Specifically, update Layout to render the viewer in the right column below PricePanel:

```tsx
<div className="flex flex-1 overflow-hidden">
  <StepSidebar ... />

  <main className="flex-1 overflow-y-auto p-8">
    {children}
  </main>

  <div className="flex flex-col w-72 border-l border-slate-200">
    <PricePanel breakdown={priceBreakdown} assemblyEnabled={assemblyEnabled} />
    <div className="flex-1 p-3 min-h-0">
      <PCBViewer3D
        meta={gerberMeta}
        cpl={cplParsed}
        selectedDesignator={selectedDesignator}
        solderMaskColor={pcbConfig.solderMaskColor}
      />
    </div>
  </div>
</div>
```

Add `const { gerberMeta, cplParsed, selectedDesignator, pcbConfig } = useOrderStore()` to Layout.

- [ ] **Step 3: Manual verify 3D viewer**

```bash
npm run dev
```
Complete Steps 1-4 with sample files. Verify:
- Board appears in 3D after Step 1
- Color changes in Step 2 when solder mask color changes
- Components appear after Step 4
- Click row in Step 5 → component turns yellow in viewer
- Top/Bottom flip buttons work

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PCBViewer3D.tsx src/components/Layout.tsx
git commit -m "feat: PCBViewer3D with Three.js, SVG texture, component highlight"
```

---

### Task 16: Final integration + draft restore

**Files:**
- Modify: `src/App.tsx` — add draft restore banner

- [ ] **Step 1: Add draft restore banner to App.tsx**

```tsx
// In App.tsx, add before Layout:
import { useEffect, useState } from 'react'

// Inside App():
const [showDraftBanner, setShowDraftBanner] = useState(false)
useEffect(() => {
  const saved = localStorage.getItem('movia-pcba-order')
  if (saved) {
    const parsed = JSON.parse(saved)
    if (parsed?.state?.currentStep > 1) setShowDraftBanner(true)
  }
}, [])

// In JSX, add before <Layout>:
{showDraftBanner && (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg flex items-center gap-3 z-50">
    <span>📋 Bozza ripristinata</span>
    <button
      onClick={() => { reset(); setShowDraftBanner(false) }}
      className="underline text-indigo-200 text-xs"
    >
      Nuova configurazione
    </button>
    <button onClick={() => setShowDraftBanner(false)} className="text-indigo-200">✕</button>
  </div>
)}
```

- [ ] **Step 2: Full end-to-end test**

1. Complete full flow with `pcba_2layer` files (re-zipped gerbers)
2. Refresh page — verify draft banner appears
3. Click "Nuova configurazione" — verify step resets to 1
4. Complete flow with `gadget_singola` files — verify 6-column CPL works
5. Verify price updates at each step

- [ ] **Step 3: Run all tests**

```bash
npx vitest run --coverage
```
Expected: all PASS

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete PCBA configurator MVP with draft restore"
```

---

## Test sample files reference

```
/Users/nikolajfecchio/Downloads/pcba_extracted/
  gadget_singola/   → PCB1.GTL etc + BOM_A_Spilletta.xlsx + "Pick Place for PCB1.csv" (6-col, mil)
  pcba_2layer/      → DemoPortale.GTL etc + DemoPortaleBOM.xlsx + "Pick Place for DemoPortale.csv" (8-col, mil)
  pcba_6layer/      → same + G1 G2 G3 G4 inner layers → expect 6 layers detected
  gadget_pannello/  → Spill_panel.GTL etc + panel variant
```

Re-zip gerber files before upload: `zip gerbers.zip pcba_2layer/*.G* pcba_2layer/*.DRR`
