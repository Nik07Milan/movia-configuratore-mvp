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
