import { useForm } from 'react-hook-form'
import { useOrderStore } from '../store/orderStore'
import { calculatePrice } from '../lib/priceCalculator'
import type { PCBConfig } from '../types/order'

const MATERIALS = ['FR4', 'Flex', 'Aluminum', 'CopperCore', 'Rogers', 'PTFE'] as const
const LAYERS = [1, 2, 4, 6, 8, 10, 12, 14, 16] as const
const PRODUCT_TYPES = ['Industrial', 'Aerospace', 'Medical'] as const
const SURFACE_FINISHES = ['HASL', 'ENIG', 'OSP', 'HASL (Lead Free)', 'Hard Gold']
const SOLDER_COLORS = ['Green', 'Red', 'Blue', 'Black', 'White', 'Yellow']
const SILK_COLORS = ['White', 'Black']

const SOLDER_HEX: Record<string, string> = {
  Green: '#1a5c1a', Red: '#8b0000', Blue: '#00008b',
  Black: '#111111', White: '#f5f5f5', Yellow: '#ccaa00',
}

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

export function Step2_PCBConfig() {
  const { pcbConfig, setPCBConfig, setStep, assemblyEnabled, assemblyConfig, bomParsed, cplParsed, setPriceBreakdown } = useOrderStore()

  const { register, handleSubmit, watch } = useForm<PCBConfig>({
    defaultValues: pcbConfig,
  })

  const solderColor = watch('solderMaskColor', pcbConfig.solderMaskColor)

  function onSubmit(data: PCBConfig) {
    setPCBConfig(data)
    const price = calculatePrice(data, assemblyEnabled, assemblyConfig, bomParsed, cplParsed)
    setPriceBreakdown(price)
    setStep(3)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Configurazione PCB</h1>
      <p className="text-slate-500 text-sm mb-6">Specifica le caratteristiche della scheda.</p>

      {/* PCB color preview */}
      <div
        className="w-24 h-16 rounded-lg mb-6 border border-slate-200 shadow-inner transition-colors"
        style={{ backgroundColor: SOLDER_HEX[solderColor] ?? '#1a5c1a' }}
        title={`Solder mask: ${solderColor}`}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">

        <Field label="Materiale base">
          <select {...register('material', { required: true })} className={INPUT}>
            {MATERIALS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>

        <Field label="Layer">
          <select {...register('layers', { required: true, valueAsNumber: true })} className={INPUT}>
            {LAYERS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>

        <Field label="Larghezza (mm)">
          <input type="number" step="any" {...register('width', { required: true, valueAsNumber: true })} className={INPUT} />
        </Field>

        <Field label="Altezza (mm)">
          <input type="number" step="any" {...register('height', { required: true, valueAsNumber: true })} className={INPUT} />
        </Field>

        <Field label="Quantità PCB">
          <input type="number" min="1" {...register('qty', { required: true, valueAsNumber: true, min: 1 })} className={INPUT} />
        </Field>

        <Field label="Tipo prodotto">
          <select {...register('productType')} className={INPUT}>
            {PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <div className="col-span-2 border-t border-slate-100 pt-3 mt-1">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Specifiche avanzate</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Spessore (mm)">
              <input type="number" step="any" {...register('thickness', { valueAsNumber: true })} className={INPUT} />
            </Field>
            <Field label="Finitura superficiale">
              <select {...register('surfaceFinish')} className={INPUT}>
                {SURFACE_FINISHES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Colore solder mask">
              <select {...register('solderMaskColor')} className={INPUT}>
                {SOLDER_COLORS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Colore silkscreen">
              <select {...register('silkscreenColor')} className={INPUT}>
                {SILK_COLORS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="col-span-2 flex justify-between mt-2">
          <button type="button" onClick={() => setStep(1)} className={BTN_SEC}>← Indietro</button>
          <button type="submit" className={BTN_PRI}>Avanti →</button>
        </div>
      </form>
    </div>
  )
}
