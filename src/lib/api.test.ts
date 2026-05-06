import { describe, it, expect } from 'vitest'
import { getProdotti, salvaConfigurazione, richiediOrdine } from './api'

describe('api mock', () => {
  it('getProdotti returns materials list', async () => {
    const result = await getProdotti()
    expect(result.materials).toContain('FR4')
    expect(result.materials).toContain('Rogers')
  })

  it('salvaConfigurazione returns id and pdfUrl', async () => {
    const result = await salvaConfigurazione({ note: 'test' })
    expect(result.id).toBeTruthy()
    expect(result.pdfUrl).toContain('mock')
  })

  it('richiediOrdine returns success true', async () => {
    const result = await richiediOrdine({ configId: 'x', contatto: { nome: 'A', email: 'a@b.it', azienda: '', note: '' } })
    expect(result.success).toBe(true)
    expect(result.ticketId).toBeTruthy()
  })
})
