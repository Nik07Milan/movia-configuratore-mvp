import { useState } from 'react'
import toast from 'react-hot-toast'
import { FileDropzone } from '../components/FileDropzone'
import { useOrderStore } from '../store/orderStore'
import { parseGerberZip } from '../lib/gerberParser'
import { calculatePrice } from '../lib/priceCalculator'

export function Step1_GerberUpload() {
  const { gerberFiles, setGerberFiles, setGerberMeta, setPriceBreakdown,
          pcbConfig, assemblyEnabled, assemblyConfig, bomParsed, cplParsed, setStep } = useOrderStore()
  const [loading, setLoading] = useState(false)

  async function handleZip(file: File) {
    setLoading(true)
    try {
      const meta = await parseGerberZip(file)
      setGerberFiles([file])
      setGerberMeta(meta)
      const updatedConfig = { ...pcbConfig, layers: meta.layers as any, width: meta.width, height: meta.height }
      const price = calculatePrice(updatedConfig, assemblyEnabled, assemblyConfig, bomParsed, cplParsed)
      setPriceBreakdown(price)
      toast.success(`Rilevati ${meta.layers} layer — ${meta.width.toFixed(1)} × ${meta.height.toFixed(1)} mm`)
    } catch (e: any) {
      toast.error(e.message ?? 'Errore parsing Gerber')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Carica file Gerber</h1>
      <p className="text-slate-500 text-sm mb-6">
        Carica il file ZIP con i tuoi file Gerber. Deve contenere almeno un file .GTL.
      </p>

      <FileDropzone
        label="Trascina il file ZIP qui, o clicca per selezionarlo"
        accept={{ 'application/zip': ['.zip'], 'application/x-zip-compressed': ['.zip'] }}
        onFile={handleZip}
        currentFile={gerberFiles[0] ?? null}
        hint="Solo .zip — max 100 MB"
      />

      {loading && <p className="text-sm text-indigo-500 mt-4 animate-pulse">Analisi Gerber in corso...</p>}

      {gerberFiles.length > 0 && !loading && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setStep(2)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Avanti →
          </button>
        </div>
      )}
    </div>
  )
}
