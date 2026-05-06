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
