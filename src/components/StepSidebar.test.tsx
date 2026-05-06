import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StepSidebar } from './StepSidebar'

describe('StepSidebar', () => {
  it('renders all 6 steps', () => {
    render(<StepSidebar currentStep={1} completedSteps={[]} onNavigate={() => {}} />)
    expect(screen.getByText('Gerber Upload')).toBeInTheDocument()
    expect(screen.getByText('Quote')).toBeInTheDocument()
  })

  it('marks current step as active', () => {
    render(<StepSidebar currentStep={2} completedSteps={[1]} onNavigate={() => {}} />)
    const active = screen.getByText('PCB Config').closest('[data-active]')
    expect(active).toBeInTheDocument()
  })

  it('calls onNavigate when clicking completed step', async () => {
    const onNav = vi.fn()
    render(<StepSidebar currentStep={3} completedSteps={[1, 2]} onNavigate={onNav} />)
    await userEvent.click(screen.getByText('Gerber Upload'))
    expect(onNav).toHaveBeenCalledWith(1)
  })

  it('does not navigate to future incomplete step', async () => {
    const onNav = vi.fn()
    render(<StepSidebar currentStep={2} completedSteps={[1]} onNavigate={onNav} />)
    await userEvent.click(screen.getByText('Assembly'))
    expect(onNav).not.toHaveBeenCalled()
  })
})
