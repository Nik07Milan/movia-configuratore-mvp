import { useState } from 'react'
import toast from 'react-hot-toast'
import { useOrderStore } from '../store/orderStore'
import { salvaConfigurazione, richiediOrdine } from '../lib/api'

const BTN_SEC = 'text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors'

export function Step6_Quote() {
  const { priceBreakdown, assemblyEnabled, pcbConfig, assemblyConfig, reset, setStep } = useOrderStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', azienda: '', note: '' })
  const [sending, setSending] = useState(false)

  const p = priceBreakdown

  function fmt(n: number) {
    return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  async function handleSave() {
    try {
      const result = await salvaConfigurazione({ pcbConfig, assemblyEnabled, assemblyConfig, priceBreakdown })
      const blob = new Blob([JSON.stringify({ ...useOrderStore.getState(), gerberFiles: undefined }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `preventivo-${result.id}.json`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Preventivo salvato')
    } catch {
      toast.error('Errore salvataggio')
    }
  }

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      const save = await salvaConfigurazione({ pcbConfig, assemblyEnabled, assemblyConfig, priceBreakdown })
      const result = await richiediOrdine({ configId: save.id, contatto: form })
      toast.success(`Ordine inviato — Ticket: ${result.ticketId}`)
      setShowForm(false)
    } catch {
      toast.error('Errore invio ordine')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Preventivo</h1>
      <p className="text-slate-500 text-sm mb-6">Riepilogo costi e tempi di produzione.</p>

      {/* Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wider">PCB</h2>
        <Row label="Engineering fee" value={fmt(p.engineeringFee)} />
        <Row label="Board" value={fmt(p.board)} />

        {assemblyEnabled && (
          <>
            <h2 className="text-sm font-semibold text-slate-600 mt-4 mb-3 uppercase tracking-wider">Assembly (PCBA)</h2>
            <Row label="Setup" value={fmt(p.setupFee)} />
            <Row label="Stencil" value={fmt(p.stencil)} />
            <Row label="Componenti" value={fmt(p.components)} />
            <Row label="SMT Assembly" value={fmt(p.smtAssembly)} />
          </>
        )}

        <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-center">
          <span className="font-semibold text-slate-700">Totale (IVA esclusa)</span>
          <span className="text-2xl font-bold text-indigo-600">€ {fmt(p.total)}</span>
        </div>
      </div>

      {/* Build time */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-6 text-sm text-slate-600">
        <p>Produzione PCB: <strong>{p.buildTimePCB}</strong></p>
        {assemblyEnabled && <p className="mt-1">Assembly: <strong>{p.buildTimeAssembly}</strong></p>}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-4">
        <button onClick={handleSave} className="flex-1 border border-indigo-300 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">
          Salva preventivo
        </button>
        <button onClick={() => setShowForm((s) => !s)} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          Richiedi ordine
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleOrder} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-700">Dati di contatto</h2>
          {[['nome', 'Nome *'], ['email', 'Email *'], ['azienda', 'Azienda'], ['note', 'Note']].map(([k, label]) => (
            <div key={k}>
              <label className="block text-xs text-slate-500 mb-1">{label}</label>
              <input
                required={k === 'nome' || k === 'email'}
                type={k === 'email' ? 'email' : 'text'}
                value={form[k as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end mt-1">
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 px-4 py-2 text-sm">Annulla</button>
            <button type="submit" disabled={sending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {sending ? 'Invio...' : 'Invia ordine'}
            </button>
          </div>
        </form>
      )}

      <div className="flex justify-between mt-4">
        <button onClick={() => setStep(assemblyEnabled ? 5 : 3)} className={BTN_SEC}>← Indietro</button>
        <button onClick={() => { reset(); setStep(1) }} className="text-slate-400 px-4 py-2 text-sm hover:underline">
          Nuova configurazione
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">€ {value}</span>
    </div>
  )
}
