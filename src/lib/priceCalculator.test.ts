import { describe, it, expect } from 'vitest'
import { calculatePrice } from './priceCalculator'
import type { PCBConfig, AssemblyConfig, BOMItem } from '../types/order'

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
