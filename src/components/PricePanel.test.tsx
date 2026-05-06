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
