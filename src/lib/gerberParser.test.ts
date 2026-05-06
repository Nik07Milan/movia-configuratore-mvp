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
