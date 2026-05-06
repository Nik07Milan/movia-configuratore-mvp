import { useState } from 'react'
import { useOrderStore } from '../store/orderStore'
import { calculatePrice } from '../lib/priceCalculator'
import type { AssemblyConfig } from '../types/order'

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300'
const BTN_PRI = 'bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors'
const BTN_SEC = 'text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1 font-medium">{label}</label>
      {children}
    </div>
  )
}

function Seg({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-200">
      {options.map((o) => (
        <button
          key={o} type="button"
          onClick={() => onChange(o)}
          className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${value === o ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function Step3_Assembly() {
  const { assemblyEnabled, toggleAssembly, assemblyConfig, setAssemblyConfig,
          pcbConfig, bomParsed, cplParsed, setPriceBreakdown, setStep } = useOrderStore()
  const [showAdvanced, setShowAdvanced] = useState(false)

  function update(partial: Partial<AssemblyConfig>) {
    setAssemblyConfig(partial)
    const merged = { ...assemblyConfig, ...partial }
    const price = calculatePrice(pcbConfig, assemblyEnabled, merged, bomParsed, cplParsed)
    setPriceBreakdown(price)
  }

  function handleToggle(enabled: boolean) {
    toggleAssembly(enabled)
    const price = calculatePrice(pcbConfig, enabled, assemblyConfig, bomParsed, cplParsed)
    setPriceBreakdown(price)
    if (!enabled) setStep(6)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Assembly (PCBA)</h1>
      <p className="text-slate-500 text-sm mb-6">Configura il montaggio componenti. Puoi saltare se vuoi solo il PCB nudo.</p>

      {/* Toggle */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => handleToggle(!assemblyEnabled)}
          className={`w-12 h-6 rounded-full transition-colors ${assemblyEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
        >
          <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${assemblyEnabled ? 'translate-x-6' : ''}`} />
        </button>
        <span className="text-sm font-medium text-slate-700">
          {assemblyEnabled ? 'Assembly attivo' : 'Solo PCB nudo — salta assembly'}
        </span>
      </div>

      {assemblyEnabled && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo PCBA">
            <Seg options={['Economic', 'Standard']} value={assemblyConfig.type} onChange={(v) => update({ type: v as any })} />
          </Field>

          <Field label="Lato montaggio">
            <Seg options={['Top', 'Bottom', 'Both']} value={assemblyConfig.side} onChange={(v) => update({ side: v as any })} />
          </Field>

          <Field label="Quantità PCBA">
            <input
              type="number" min="1" max={pcbConfig.qty}
              value={assemblyConfig.qty}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                if (v > pcbConfig.qty) return
                update({ qty: v })
              }}
              className={INPUT}
            />
            {assemblyConfig.qty > pcbConfig.qty && (
              <p className="text-xs text-red-500 mt-1">Qty PCBA non può superare qty PCB ({pcbConfig.qty})</p>
            )}
          </Field>

          <Field label="Fori tooling">
            <Seg options={['ByMovia', 'ByCustomer']} value={assemblyConfig.toolingHoles} onChange={(v) => update({ toolingHoles: v as any })} />
          </Field>

          <Field label="Selezione componenti">
            <Seg options={['ByCustomer', 'ByMovia']} value={assemblyConfig.partsSelection} onChange={(v) => update({ partsSelection: v as any })} />
          </Field>

          <div className="col-span-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-xs text-indigo-500 hover:underline"
            >
              {showAdvanced ? '▲ Nascondi opzioni avanzate' : '▼ Mostra opzioni avanzate'}
            </button>
          </div>

          {showAdvanced && (
            <div className="col-span-2 grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              {[
                ['bakeComponents', 'Bake componenti'],
                ['boardCleaning', 'Pulizia scheda'],
                ['flyingProbeTest', 'Flying Probe Test'],
                ['conformalCoating', 'Conformal Coating'],
                ['specialStencil', 'Stencil speciale'],
                ['depaneling', 'Depaneling'],
                ['functionTest', 'Function Test'],
                ['photoConfirmation', 'Photo Confirmation'],
                ['nitrogenReflow', 'Nitrogen Reflow'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assemblyConfig[key as keyof AssemblyConfig] as boolean}
                    onChange={(e) => update({ [key]: e.target.checked } as any)}
                    className="rounded text-indigo-500"
                  />
                  {label}
                </label>
              ))}
              <Field label="Solder Paste">
                <Seg options={['HighTemp', 'LeadFree', 'Standard']} value={assemblyConfig.solderPaste} onChange={(v) => update({ solderPaste: v as any })} />
              </Field>
              <Field label="Packaging">
                <Seg options={['Antistatic', 'Standard', 'None']} value={assemblyConfig.packaging} onChange={(v) => update({ packaging: v as any })} />
              </Field>
              <div className="col-span-2">
                <Field label="Note PCBA">
                  <input type="text" value={assemblyConfig.pcbaRemark} onChange={(e) => update({ pcbaRemark: e.target.value })} className={INPUT} placeholder="Facoltativo" />
                </Field>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(2)} className={BTN_SEC}>← Indietro</button>
        <button onClick={() => setStep(assemblyEnabled ? 4 : 6)} className={BTN_PRI}>Avanti →</button>
      </div>
    </div>
  )
}
