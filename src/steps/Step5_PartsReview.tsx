import { useOrderStore } from '../store/orderStore'
import { BOMTable } from '../components/BOMTable'

const BTN_PRI = 'bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors'
const BTN_SEC = 'text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors'

export function Step5_PartsReview() {
  const { bomParsed, cplParsed, selectedDesignator, setSelectedDesignator, setStep } = useOrderStore()

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Review Parti</h1>
      <p className="text-slate-500 text-sm mb-6">
        Verifica i componenti rilevati. Clicca una riga per evidenziare il componente nel viewer 3D.
      </p>

      <BOMTable
        bom={bomParsed}
        cpl={cplParsed}
        onSelect={(d) => setSelectedDesignator(selectedDesignator === d ? null : d)}
        selectedDesignator={selectedDesignator}
      />

      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(4)} className={BTN_SEC}>← Indietro</button>
        <button onClick={() => setStep(6)} className={BTN_PRI}>Avanti →</button>
      </div>
    </div>
  )
}
