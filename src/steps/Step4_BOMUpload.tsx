import { useOrderStore } from '../store/orderStore'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { FileDropzone } from '../components/FileDropzone'
import { parseBOMFromCSV, parseCPLFromCSV } from '../lib/bomParser'
import { calculatePrice } from '../lib/priceCalculator'

const BTN_PRI = 'bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors'
const BTN_SEC = 'text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors'
const BTN_DIS = 'bg-slate-200 text-slate-400 px-6 py-2 rounded-lg text-sm font-medium cursor-not-allowed'

export function Step4_BOMUpload() {
  const { bomFile, cplFile, setBOMFile, setCPLFile, setBOMParsed, setCPLParsed,
          pcbConfig, assemblyEnabled, assemblyConfig, setPriceBreakdown, setStep } = useOrderStore()

  async function handleBOM(file: File) {
    setBOMFile(file)
    try {
      let csv: string
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf)
        csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])
      } else {
        csv = await file.text()
      }
      const items = parseBOMFromCSV(csv)
      setBOMParsed(items)
      toast.success(`BOM: ${items.length} righe, ${items.filter((i) => i.populate).length} da montare`)
    } catch (e: any) {
      toast.error(`Errore BOM: ${e.message}`)
    }
  }

  async function handleCPL(file: File) {
    setCPLFile(file)
    try {
      const text = await file.text()
      const items = parseCPLFromCSV(text)
      setCPLParsed(items)
      const price = calculatePrice(pcbConfig, assemblyEnabled, assemblyConfig, useOrderStore.getState().bomParsed, items)
      setPriceBreakdown(price)
      toast.success(`CPL: ${items.length} componenti`)
    } catch (e: any) {
      toast.error(`Errore CPL: ${e.message}`)
    }
  }

  const canProceed = bomFile && cplFile

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">BOM + CPL</h1>
      <p className="text-slate-500 text-sm mb-6">
        Carica la Bill of Materials e il file di piazzamento (Pick&amp;Place).
      </p>

      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Bill of Materials (BOM)</p>
          <FileDropzone
            label="Carica BOM — .xlsx o .csv"
            accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] }}
            onFile={handleBOM}
            currentFile={bomFile}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Pick &amp; Place / CPL</p>
          <FileDropzone
            label="Carica CPL — .csv (formato Altium)"
            accept={{ 'text/csv': ['.csv'] }}
            onFile={handleCPL}
            currentFile={cplFile}
          />
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(3)} className={BTN_SEC}>← Indietro</button>
        <button onClick={() => setStep(5)} disabled={!canProceed} className={canProceed ? BTN_PRI : BTN_DIS}>
          Avanti →
        </button>
      </div>
    </div>
  )
}
