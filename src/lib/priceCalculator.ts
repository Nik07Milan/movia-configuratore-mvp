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
