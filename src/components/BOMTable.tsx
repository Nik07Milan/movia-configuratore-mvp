import { useState } from 'react'
import type { BOMItem, CPLItem } from '../types/order'

type Filter = 'all' | 'top' | 'bottom' | 'dnp'

interface Props {
  bom: BOMItem[]
  cpl: CPLItem[]
  onSelect: (designator: string) => void
  selectedDesignator: string | null
}

export function BOMTable({ bom, cpl, onSelect, selectedDesignator }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const cplMap = new Map(cpl.map((c) => [c.designator, c]))

  const filtered = bom.filter((item) => {
    if (filter === 'dnp') return !item.populate
    if (filter === 'top') return cplMap.get(item.designator)?.layer === 'TopLayer'
    if (filter === 'bottom') return cplMap.get(item.designator)?.layer === 'BottomLayer'
    return true
  })

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {(['all', 'top', 'bottom', 'dnp'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs font-medium ${filter === f ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {f === 'all' ? 'Tutti' : f === 'top' ? 'Top' : f === 'bottom' ? 'Bottom' : 'DNP'}
            <span className="ml-1 text-slate-400">
              ({f === 'all' ? bom.length : f === 'dnp' ? bom.filter((i) => !i.populate).length
                : bom.filter((i) => cplMap.get(i.designator)?.layer === (f === 'top' ? 'TopLayer' : 'BottomLayer')).length})
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Designator</th>
              <th className="px-3 py-2 text-left">Comment</th>
              <th className="px-3 py-2 text-left">Footprint</th>
              <th className="px-3 py-2 text-left">Layer</th>
              <th className="px-3 py-2 text-left">Qty</th>
              <th className="px-3 py-2 text-left">Stato</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const cplItem = cplMap.get(item.designator)
              const isSelected = selectedDesignator === item.designator
              return (
                <tr
                  key={item.designator}
                  onClick={() => onSelect(item.designator)}
                  className={`border-t border-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-3 py-2 font-mono font-medium">{item.designator}</td>
                  <td className="px-3 py-2 text-slate-600">{item.comment}</td>
                  <td className="px-3 py-2 text-slate-500">{item.footprint}</td>
                  <td className="px-3 py-2 text-slate-500">{cplItem?.layer?.replace('Layer', '') ?? '—'}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">
                    {!item.populate
                      ? <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-xs font-medium">DNP</span>
                      : <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">Confermato</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-2">
        {bom.filter((i) => i.populate).length} da montare · {bom.filter((i) => !i.populate).length} DNP · {cpl.length} posizioni CPL
      </p>
    </div>
  )
}
