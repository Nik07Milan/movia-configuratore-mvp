import JSZip from 'jszip'
import pcbStackupModule from 'pcb-stackup'
import type { GerberMeta } from '../types/order'

// CJS interop: Vite may wrap the default export
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pcbStackup: typeof pcbStackupModule = (pcbStackupModule as any).default ?? pcbStackupModule

/**
 * Parse a gerber outline layer (GM/GKO) into a closed polygon.
 * Returns null if arcs (G02/G03) are present — caller falls back to bounding box.
 * Handles modal coordinates (X-only or Y-only lines).
 */
export function parseOutlineGerber(content: string): [number, number][] | null {
  if (/^G0[23]/m.test(content)) return null  // arcs not supported

  const fmtMatch = content.match(/%FSLAX\d(\d)Y\d\d\*%/)
  const decimals = fmtMatch ? parseInt(fmtMatch[1]) : 4
  const divisor = Math.pow(10, decimals)
  const toMm = /MOMM/.test(content) ? 1 : 25.4

  const points: [number, number][] = []
  let curX = 0
  let curY = 0

  for (const line of content.split('\n')) {
    const dm = line.match(/D0([12])\*/)
    if (!dm) continue
    const xm = line.match(/X(-?\d+)/)
    const ym = line.match(/Y(-?\d+)/)
    if (xm) curX = (parseInt(xm[1]) / divisor) * toMm
    if (ym) curY = (parseInt(ym[1]) / divisor) * toMm
    if (dm[1] === '1') points.push([curX, curY])
  }

  return points.length >= 3 ? points : null
}

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

  // Parse board outline from GM/GKO layer (optional — falls back to bounding box)
  const outlineFilename = filenames.find((f) => /\.(GM|GKO|GML|GM1|GM2)$/i.test(f))
  const outlinePoints = outlineFilename ? parseOutlineGerber(fileMap[outlineFilename]) ?? undefined : undefined

  // pcb-stackup v4 API: Array<{ filename, gerber: string }>
  const layers = Object.entries(fileMap).map(([filename, gerber]) => ({ filename, gerber }))
  const stackup = await pcbStackup(layers, {
    color: {
      cu:  '#b87333',              // visible copper brown for traces
      cf:  '#d4a520',              // golden for HASL/ENIG finished pads
      sm:  'rgba(0,80,0,0.55)',    // solder mask — reduced opacity exposes traces
      fr4: '#4a3c28',              // realistic FR4 substrate
      ss:  '#ffffff',              // silkscreen
    },
  })

  const layerCount = detectLayerCount(filenames)

  // Normalize width/height to mm — pcb-stackup units may be "in" or "mm"
  const top = stackup.top as any
  const units: string = top.units ?? 'in'
  const toMm = units === 'mm' ? 1 : 25.4
  const width = (top.width ?? 100) * toMm
  const height = (top.height ?? 100) * toMm

  // viewBox = [originX, originY, w, h] in internal units (numeric values × 1000)
  const vb: number[] = top.viewBox ?? [0, 0, 0, 0]
  const originX = (vb[0] / 1000) * toMm
  const originY = (vb[1] / 1000) * toMm

  return {
    layers: layerCount,
    width,
    height,
    originX,
    originY,
    outlinePoints,
    layerSVGs: {
      top: stackup.top.svg,
      bottom: stackup.bottom.svg,
    },
  }
}
