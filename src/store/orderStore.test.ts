import { describe, it, expect, beforeEach } from 'vitest'
import { useOrderStore } from './orderStore'
import type { BOMItem } from '../types/order'

const { getState } = useOrderStore

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
    getState().setGerberMeta({ layers: 6, width: 100, height: 80, originX: 0, originY: 0, layerSVGs: { top: '<svg/>', bottom: '<svg/>' } })
    expect(getState().gerberMeta?.layers).toBe(6)
  })

  it('setPCBConfig pre-fills from gerberMeta', () => {
    getState().setGerberMeta({ layers: 2, width: 50, height: 40, originX: 0, originY: 0, layerSVGs: { top: '', bottom: '' } })
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
