# PCBA Configuratore Frontend — Design Spec
**Data:** 2026-05-04
**Stato:** Approvato
**Progetto:** Movia PCBA Configuratore — MVP Frontend

---

## 1. Panoramica

Configuratore frontend per ordini PCBA (Printed Circuit Board Assembly). L'utente carica i file tecnici del proprio progetto (Gerber, BOM, CPL), configura le opzioni di produzione, visualizza una preview 3D della scheda assemblata e ottiene un preventivo stimato.

Il frontend è autonomo (nessun backend reale per MVP) con un layer API già strutturato per integrazione futura con le API Movia.

---

## 2. Decisioni di design

| Parametro | Scelta | Motivazione |
|---|---|---|
| Layout wizard | Sidebar verticale step list | Stile tool professionale per utenti tecnici |
| Autenticazione | Anonima | Nessun account richiesto, preventivo opzionale a fine flusso |
| Design visivo | Light / Clean (indigo accents) | Moderno e professionale, stile Stripe/Linear |
| Gerber parsing | Pieno lato client (@tracespace v4) | Auto-detect layer/dimensioni, wow-factor per demo |
| Device target | Desktop-only | MVP, responsive posticipato |
| Lingua UI | Italiano | Mercato target |
| Prezzo | Formula mock client-side | Backend non disponibile per MVP |
| Architettura | Vite + React + TypeScript (approccio A) | Semplicità massima, nessun friction con Three.js |

---

## 3. Stack tecnologico

### Core
- **Vite 5** — build tool
- **React 18** — UI framework
- **TypeScript 5** — type safety
- **Tailwind CSS 3** — styling utility-first

### Stato e form
- **Zustand 4** — stato globale ordine
- **React Hook Form** — form management step 2/3

### 3D
- **Three.js r165** — renderer 3D
- **@react-three/fiber 8** — React binding
- **@react-three/drei 9** — OrbitControls, helpers

### Parsing file
- **@tracespace/render@4.x** — Gerber → SVG (texture PCB). Pinned a v4 (stabile). Non usare v5 alpha.
- **jszip** — estrazione ZIP gerber
- **xlsx (SheetJS)** — parsing BOM .xlsx
- **papaparse** — parsing CSV (CPL/BOM)

### UX
- **react-dropzone** — drag&drop file
- **react-hot-toast** — notifiche errori/successo

---

## 4. Struttura progetto

```
src/
  steps/
    Step1_GerberUpload.tsx
    Step2_PCBConfig.tsx
    Step3_Assembly.tsx
    Step4_BOMUpload.tsx
    Step5_PartsReview.tsx
    Step6_Quote.tsx
  components/
    Layout.tsx              # shell: sidebar + main + price panel
    StepSidebar.tsx         # navigazione step verticale
    PricePanel.tsx          # breakdown prezzo real-time
    FileDropzone.tsx        # drag&drop riusabile
    PCBViewer3D.tsx         # Three.js viewer (R3F)
    BOMTable.tsx            # tabella review parti
  store/
    orderStore.ts           # Zustand — stato globale
  lib/
    gerberParser.ts         # @tracespace/render v4 wrapper
    bomParser.ts            # CSV/XLSX → struttura interna
    priceCalculator.ts      # formula mock prezzo
    api.ts                  # layer API (mock → Movia ready)
  types/
    order.ts                # tipi TypeScript condivisi
```

---

## 5. Stato globale (Zustand)

```typescript
interface OrderState {
  // Step 1
  gerberFiles: File[]
  gerberMeta: {
    layers: number
    width: number      // mm
    height: number     // mm
    layerSVGs: {
      top: string      // SVG string da @tracespace (GTL layer)
      bottom: string   // SVG string da @tracespace (GBL layer)
      // inner layers (G1-G4) non renderizzati in MVP viewer
    }
  } | null

  // Step 2
  pcbConfig: {
    material: 'FR4' | 'Flex' | 'Aluminum' | 'CopperCore' | 'Rogers' | 'PTFE'
    layers: 1 | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16
    width: number
    height: number
    qty: number
    productType: 'Industrial' | 'Aerospace' | 'Medical'
    thickness: number          // mm, default 1.6
    surfaceFinish: string      // HASL, ENIG, OSP...
    solderMaskColor: string    // Green, Red, Blue, Black, White, Yellow
    silkscreenColor: string    // White, Black
  }

  // Step 3
  assemblyEnabled: boolean
  assemblyConfig: {
    type: 'Economic' | 'Standard'
    side: 'Top' | 'Bottom' | 'Both'
    qty: number                    // deve essere ≤ pcbConfig.qty; default = pcbConfig.qty
    toolingHoles: 'ByMovia' | 'ByCustomer'
    partsSelection: 'ByCustomer' | 'ByMovia'
    // Opzioni base
    bakeComponents: boolean
    boardCleaning: boolean
    flyingProbeTest: boolean
    conformalCoating: boolean
    packaging: 'Antistatic' | 'Standard' | 'None'
    // Opzioni avanzate
    specialStencil: boolean
    depaneling: boolean
    functionTest: boolean
    photoConfirmation: boolean
    solderPaste: 'HighTemp' | 'LeadFree' | 'Standard'
    nitrogenReflow: boolean
    pcbaRemark: string
  }

  // Step 4
  bomFile: File | null
  cplFile: File | null
  bomParsed: BOMItem[]
  cplParsed: CPLItem[]

  // UI state
  selectedDesignator: string | null  // componente evidenziato nel viewer 3D

  // Calcolato
  priceBreakdown: PriceBreakdown
  currentStep: 1 | 2 | 3 | 4 | 5 | 6
}

interface BOMItem {
  comment: string
  description: string
  designator: string        // può essere lista "R1, R2" — splittare per conteggio
  footprint: string
  libRef: string
  quantity: number
  populate: boolean         // false = DNP (Do Not Populate)
}

interface CPLItem {
  designator: string
  layer: 'TopLayer' | 'BottomLayer'
  x: number                 // mm (convertito da mil se unità = 'mil': × 0.0254)
  y: number                 // mm
  rotation: number          // gradi
  description: string
  comment?: string          // presente solo nel formato 8-colonne Altium
  footprint?: string        // presente solo nel formato 8-colonne Altium
}

interface PriceBreakdown {
  pcbBase: number           // area × layerMult × materialMult × qtyFactor
  engineeringFee: number    // fisso 3.38 (non scalato per qty)
  board: number             // = pcbBase (alias per display nel breakdown UI)
  setupFee: number          // assembly setup
  stencil: number
  components: number        // costo componenti stimato
  smtAssembly: number
  total: number
  buildTimePCB: string      // es. "2 giorni"
  buildTimeAssembly: string // es. "2-3 giorni"
}
```

---

## 6. Step del wizard

### Step 1 — Gerber Upload
- **Input:** ZIP drag&drop (react-dropzone)
- **Parser:** jszip estrae file → `gerberParser.ts` con `@tracespace/render@4.x`
- **Layer count detection:** regola esplicita per filename:
  - `.GTL` = top copper (sempre presente)
  - `.GBL` = bottom copper (sempre presente)
  - `.G1`, `.G2`, `.G3`, `.G4`, ... `.Gn` = inner copper layers (pattern `/\.G[0-9]+$/i`)
  - `.GM*` = mechanical layers → **ignorati** per conteggio copper
  - Totale copper layers = 2 + count(file che matchano `/\.G[0-9]+$/i`)
- **Dimensioni:** estratte da board outline (`.GM` o `.GKO`); se fallisce → campi manuali
- **Validazione:** ZIP deve contenere ≥1 file `.GTL`
- **Output store:** `gerberFiles`, `gerberMeta`
- **3D:** PCBViewer3D appare con board verde (default), texture top layer applicata dopo load asincrono

### Step 2 — PCB Config
- **Campi obbligatori:** Materiale, Layer count (pre-fill da gerber), Dimensioni (pre-fill), Qty, Tipo prodotto
- **Spec avanzate (collapsible):** Spessore, Finitura superficiale, Colore solder mask, Colore silkscreen
- **3D:** colore board aggiornato live al cambio solder mask color
- **Prezzo:** formula mock ricalcolata ad ogni cambio campo
- **Validazione:** tutti i campi obbligatori prima di avanzare

### Step 3 — Assembly (PCBA)
- **Toggle PCBA:** se disattivato, skip a Step 6
- **Campi base:** Tipo (Economic/Standard), Lato montaggio, Qty PCBA (default = pcbConfig.qty; validazione: ≤ pcbConfig.qty), Fori tooling, Parts Selection
- **Avanzate (collapsible):** Bake, Pulizia scheda, Stencil speciale, Depaneling, Flying Probe, Function test, Photo Confirmation, Conformal Coating, Packaging, Solder Paste, Nitrogen reflow, PCBA remark
- **Tutti i campi avanzati salvati in `assemblyConfig`** (vedi tipo sopra)
- **Prezzo:** costo assembly aggiunto al breakdown

### Step 4 — BOM + CPL Upload
- **Input BOM:** XLSX o CSV — rilevamento colonne **per nome** (non per posizione): Comment, Description, Designator, Footprint, LibRef, Quantity, Populate
- **Input CPL:** CSV formato Altium:
  - Skip righe di header fino alla riga che contiene `"Designator"` come primo campo
  - Rilevamento colonne **per nome** (non per posizione) — gestire sia formato 6-colonne che 8-colonne
  - Formato 6-colonne: `Designator, Layer, Center-X, Center-Y, Rotation, Description`
  - Formato 8-colonne: `Designator, Comment, Layer, Footprint, Center-X, Center-Y, Rotation, Description`
  - Rilevamento unità: leggere riga `Units used: mil` o `Units used: mm` dall'header testuale; se `mil` → moltiplicare X,Y per 0.0254
- **DNP:** componenti con campo `Populate` = `"DNP"` → `populate: false`, badge giallo, esclusi da prezzo
- **3D:** componenti appaiono come box colorati per tipo su board

### Step 5 — Review Parti
- **Tabella:** Designator, Comment, Footprint, Qty, Populate, Stato
- **Filtri:** Tutti / Top / Bottom / DNP
- **Riepilogo:** totale componenti, conteggio per tipo, costo stimato componenti
- **3D interattivo:** click riga → scrive `selectedDesignator` nello store → PCBViewer3D evidenzia componente
- **Mock:** stato sempre "Confermato" (matching reale richiede backend)

### Step 6 — Quote & Ordine
- **Breakdown:** PCB Price (engineering fee fisso + board cost scalato per qty), Economic PCBA Price (setup + stencil + componenti + SMT)
- **Build time:** PCB 2gg + Assembly 2-3gg
- **CTA:** "Salva preventivo" (download JSON mock) + "Richiedi ordine" (form: nome, email, azienda, note)
- **3D:** preview compatta in sidebar
- **LocalStorage:** draft salvato automaticamente ad ogni step

---

## 7. PCBViewer3D — Three.js / R3F

### gerberParser.ts — API @tracespace/render v4

```typescript
import render from '@tracespace/render'  // pinned: @tracespace/render@4.x

export async function parseGerber(zipFile: File): Promise<GerberMeta> {
  const zip = await JSZip.loadAsync(zipFile)
  const files: Record<string, string> = {}

  // Estrai tutti i file gerber come stringhe
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir) {
      files[name] = await entry.async('string')
    }
  }

  // @tracespace/render v4 API:
  // Input: Array<{ filename: string; gerber: string }>
  // NON passare un Record — convertire prima
  const layers = Object.entries(files).map(([filename, gerber]) => ({ filename, gerber }))
  const result = await render(layers)
  // result è un oggetto con SVG per layer type.
  // Chiavi v4: result.top (copper top), result.bottom (copper bottom),
  // result.topSilkscreen, result.bottomSilkscreen, result.outline, etc.
  // Verificare le chiavi esatte contro il source @tracespace/render@4.x se cambiate.
  // Le dimensioni sono in result.width e result.height (mm).

  // Layer count: 2 (top+bottom) + inner copper layers
  const innerLayers = Object.keys(files).filter(f => /\.G[0-9]+$/i.test(f)).length
  const layerCount = 2 + innerLayers

  return {
    layers: layerCount,
    width: result.width,    // mm — da board outline
    height: result.height,  // mm — da board outline
    layerSVGs: {
      top: result.top,       // SVG copper top
      bottom: result.bottom, // SVG copper bottom
    }
  }
}
```

### SVG → CanvasTexture (asincrono)

```typescript
// In PCBViewer3D.tsx — convertire SVG string in THREE.CanvasTexture
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
  const texture = new THREE.CanvasTexture(canvas)
  return texture
}
// Il board mesh mostra colore solder mask come placeholder finché texture non è pronta
```

### Geometrie e colori

```
Board geometry:
  BoxGeometry(width_mm * scale, 1.6 * scale, height_mm * scale)
  Colore placeholder (prima di texture): dal campo solderMaskColor
    Green=#1a5c1a, Red=#8b0000, Blue=#00008b, Black=#111, White=#f5f5f5
  Texture top: CanvasTexture da SVG (GTL + silkscreen), applicata async
  Texture bottom: SVG da GBL, visibile con flip Bottom button

Componenti SMD (da CPLItem[]):
  BoxGeometry per ogni componente
  Posizione: (x * scale, ±(board_thickness/2 + comp_height/2), y * scale)
  Rotazione: THREE.MathUtils.degToRad(rotation)
  Layer: TopLayer → Y positivo, BottomLayer → Y negativo
  Colori per tipo (rilevato dal prefisso Designator):
    IC, U → #1a1a1a (nero)
    R     → #c8a96e (beige)
    C     → #d4a800 (giallo)
    LED   → #cc2200 (rosso)
    L     → #2244aa (blu scuro)
    altri → #666666 (grigio)

Performance:
  ≤200 componenti: un Mesh per componente
  >200 componenti dello stesso tipo: InstancedMesh
    - Mantenere mappa designator → instanceIndex al momento del parsing
    - Highlight su InstancedMesh: usare mesh.setColorAt(instanceIndex, yellowColor)
      poi mesh.instanceColor.needsUpdate = true
    - NON usare material.emissive su InstancedMesh

Highlight da Step5:
  Store: selectedDesignator: string | null
  PCBViewer3D legge selectedDesignator, trova instanceIndex dalla mappa, chiama setColorAt
  Componenti Mesh singoli: setare material.emissive = new THREE.Color(0xffff00)

Interazione:
  OrbitControls (rotate, zoom, pan)
  Pulsanti Top / Bottom per flip board (rotateX 180°)
```

---

## 8. Formula mock prezzo

```typescript
// PCB
const area = (width_mm * height_mm) / 1000

const layerMultiplier: Record<number, number> = {
  1: 1.0, 2: 1.2, 4: 2.1, 6: 3.5, 8: 5.0,
  10: 7.0, 12: 10.0, 14: 14.0, 16: 18.0
}

const materialMultiplier: Record<string, number> = {
  FR4: 1.0, Flex: 2.5, Aluminum: 1.8,
  CopperCore: 2.2, Rogers: 3.5, PTFE: 4.0
}

const qtyFactor = qty <= 5 ? 1.0 : qty <= 10 ? 0.85 : qty <= 50 ? 0.7 : 0.55

const pcbBase = area * layerMultiplier[layers] * materialMultiplier[material]
const engineeringFee = 3.38   // fisso, NON scalato per qty
const board = pcbBase * qtyFactor

// PCBA (se assembly attivo)
const setupFee = type === 'Economic' ? 6.76 : 15.00
const stencilFee = side === 'Both' ? 2.54 : 1.27
const componentFee = bomItems.filter(i => i.populate).length * 0.08
const smtFee = cplItems.length * 0.004

const total = board + engineeringFee
            + (assemblyEnabled ? setupFee + stencilFee + componentFee + smtFee : 0)

// PriceBreakdown risultante
return { pcbBase, engineeringFee, board, setupFee, stencil: stencilFee,
         components: componentFee, smtAssembly: smtFee, total,
         buildTimePCB: '2 giorni', buildTimeAssembly: '2-3 giorni' }
```

---

## 9. API Layer (Movia-ready)

File `src/lib/api.ts` espone funzioni che oggi restituiscono mock locali. Per attivare il backend reale: impostare `VITE_API_BASE_URL` e rimuovere i mock.

```
GET  /api/configuratore/prodotti              → opzioni disponibili (materiali, finiture)
POST /api/configuratore/calcola-prezzo        → { pcbConfig, assemblyConfig, bomItems } → PriceBreakdown
POST /api/configuratore/salva-configurazione  → OrderState (senza File binari) → { id, pdfUrl }
POST /api/configuratore/richiedi-ordine       → { configId, contatto } → { success, ticketId }
```

---

## 10. Error handling

| Scenario | Comportamento |
|---|---|
| ZIP gerber non valido | Toast errore, lista file rilevati, richiede ≥1 .GTL |
| BOM formato errato | Preview prime 3 righe + messaggio colonna mancante |
| CPL formato errato | Suggerimento formato atteso Altium (6 o 8 colonne) |
| Componenti DNP | Badge giallo, esclusi da prezzo, tooltip spiegazione |
| Draft auto-save | localStorage ad ogni step, banner "Bozza ripristinata" al reload |
| Reset | Pulsante "Nuova configurazione" → clear store + localStorage |
| assemblyConfig.qty > pcbConfig.qty | Errore inline "Qty PCBA non può superare qty PCB" |

---

## 11. File campione per test

Estratti da ZIP forniti dal cliente in `/Users/nikolajfecchio/Downloads/pcba_extracted/`:

| File set | Contenuto | Uso |
|---|---|---|
| `gadget_singola/` | PCB1.* gerber + BOM_A_Spilletta.xlsx + CPL 6-colonne | Test scheda semplice, CPL formato minimo |
| `gadget_pannello/` | Spill_panel.* + BOM + CPL | Test pannello multi-board |
| `pcba_2layer/` | DemoPortale gerber 2L + BOM + CPL 8-colonne (161 comp) | Test PCBA reale, CPL formato esteso |
| `pcba_6layer/` | DemoPortale gerber 6L (G1-G4 inner) + BOM + CPL | Test multi-layer detection |

---

## 12. Fuori scope MVP

- Autenticazione / account utente
- Responsive / mobile
- Matching reale componenti con catalogo Movia
- Gerber viewer 2D separato (solo 3D)
- Upload multipli ordini / storico
- Pagamento integrato
- i18n (solo italiano)
- Inner layer SVG rendering nel viewer 3D
