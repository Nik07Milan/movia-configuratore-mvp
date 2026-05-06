// API layer — oggi mock locale.
// Per attivare backend reale: impostare VITE_API_BASE_URL e rimuovere mock.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const MOCK_MODE = !BASE_URL

interface Prodotti {
  materials: string[]
  surfaceFinishes: string[]
  solderMaskColors: string[]
}

export async function getProdotti(): Promise<Prodotti> {
  if (MOCK_MODE) {
    return {
      materials: ['FR4', 'Flex', 'Aluminum', 'CopperCore', 'Rogers', 'PTFE'],
      surfaceFinishes: ['HASL', 'ENIG', 'OSP', 'HASL (Lead Free)', 'Hard Gold'],
      solderMaskColors: ['Green', 'Red', 'Blue', 'Black', 'White', 'Yellow'],
    }
  }
  const res = await fetch(`${BASE_URL}/api/configuratore/prodotti`)
  return res.json()
}

export async function salvaConfigurazione(state: object): Promise<{ id: string; pdfUrl: string }> {
  if (MOCK_MODE) {
    const id = `MOCK-${Date.now()}`
    return { id, pdfUrl: `/mock-preventivo-${id}.pdf` }
  }
  const res = await fetch(`${BASE_URL}/api/configuratore/salva-configurazione`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state),
  })
  return res.json()
}

interface Contatto { nome: string; email: string; azienda: string; note: string }
export async function richiediOrdine(payload: { configId: string; contatto: Contatto }): Promise<{ success: boolean; ticketId: string }> {
  if (MOCK_MODE) {
    return { success: true, ticketId: `TKT-${Date.now()}` }
  }
  const res = await fetch(`${BASE_URL}/api/configuratore/richiedi-ordine`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  return res.json()
}
