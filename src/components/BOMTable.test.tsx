import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BOMTable } from './BOMTable'
import type { BOMItem, CPLItem } from '../types/order'

const bom: BOMItem[] = [
  { comment: 'LED', description: '', designator: 'LED1', footprint: 'LEDC', libRef: '', quantity: 2, populate: true },
  { comment: 'HW', description: '', designator: 'H1', footprint: 'BC2001', libRef: '', quantity: 1, populate: false },
]
const cpl: CPLItem[] = [
  { designator: 'LED1', layer: 'TopLayer', x: 10, y: 20, rotation: 0, description: 'LED' },
]

describe('BOMTable', () => {
  it('renders designator column', () => {
    render(<BOMTable bom={bom} cpl={cpl} onSelect={() => {}} selectedDesignator={null} />)
    expect(screen.getByText('LED1')).toBeInTheDocument()
  })

  it('shows DNP badge for populate=false', () => {
    render(<BOMTable bom={bom} cpl={cpl} onSelect={() => {}} selectedDesignator={null} />)
    const dnpElements = screen.getAllByText('DNP')
    expect(dnpElements.length).toBeGreaterThan(0)
  })

  it('calls onSelect when row clicked', async () => {
    const onSelect = vi.fn()
    render(<BOMTable bom={bom} cpl={cpl} onSelect={onSelect} selectedDesignator={null} />)
    await userEvent.click(screen.getByText('LED1'))
    expect(onSelect).toHaveBeenCalledWith('LED1')
  })

  it('highlights selected row', () => {
    render(<BOMTable bom={bom} cpl={cpl} onSelect={() => {}} selectedDesignator="LED1" />)
    const row = screen.getByText('LED1').closest('tr')
    expect(row?.className).toContain('indigo')
  })
})
