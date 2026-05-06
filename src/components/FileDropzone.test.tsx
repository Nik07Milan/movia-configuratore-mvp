import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FileDropzone } from './FileDropzone'

describe('FileDropzone', () => {
  it('renders label', () => {
    render(<FileDropzone label="Carica ZIP" accept={{ 'application/zip': ['.zip'] }} onFile={() => {}} />)
    expect(screen.getByText('Carica ZIP')).toBeInTheDocument()
  })

  it('shows accepted extensions', () => {
    render(<FileDropzone label="Test" accept={{ 'application/zip': ['.zip'] }} onFile={() => {}} />)
    expect(screen.getByText(/.zip/)).toBeInTheDocument()
  })
})
