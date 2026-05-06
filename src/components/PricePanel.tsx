import type { PriceBreakdown } from '../types/order'

interface Props {
  breakdown: PriceBreakdown
  assemblyEnabled: boolean
}

function fmt(n: number) {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PricePanel({ breakdown, assemblyEnabled }: Props) {
  return (
    <aside className="flex-shrink-0 bg-white border-b border-slate-200 p-4 flex flex-col gap-3">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Preventivo</p>

      <div>
        <p className="text-2xl font-bold text-indigo-600">€ {fmt(breakdown.total)}</p>
        <p className="text-xs text-slate-400 mt-0.5">IVA esclusa</p>
      </div>

      <div className="border-t border-slate-100 pt-3 flex flex-col gap-1.5 text-xs text-slate-600">
        <Row label="Engineering fee" value={breakdown.engineeringFee} />
        <Row label="Board" value={breakdown.board} />
        {assemblyEnabled && (
          <>
            <div className="text-slate-400 font-medium mt-1">Assembly</div>
            <Row label="Setup" value={breakdown.setupFee} />
            <Row label="Stencil" value={breakdown.stencil} />
            <Row label="Componenti" value={breakdown.components} />
            <Row label="SMT" value={breakdown.smtAssembly} />
          </>
        )}
      </div>

      <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
        <p>PCB: {breakdown.buildTimePCB}</p>
        {assemblyEnabled && <p>Assembly: {breakdown.buildTimeAssembly}</p>}
      </div>
    </aside>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-medium">€ {value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  )
}
