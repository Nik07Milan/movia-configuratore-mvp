import JSZip from 'jszip'
import pcbStackupModule from 'pcb-stackup'
import type { GerberMeta } from '../types/order'

// CJS interop: Vite may wrap the default export
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pcbStackup: typeof pcbStackupModule = (pcbStackupModule as any).default ?? pcbStackupModule

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

  // pcb-stackup v4 API: Array<{ filename, gerber: string }>
  const layers = Object.entries(fileMap).map(([filename, gerber]) => ({ filename, gerber }))
  const stackup = await pcbStackup(layers)

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
    layerSVGs: {
      top: stackup.top.svg,
      bottom: stackup.bottom.svg,
    },
  }
}
