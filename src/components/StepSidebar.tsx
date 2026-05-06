import { CheckCircle, Circle } from 'lucide-react'

const STEPS = [
  { id: 1 as const, label: 'Gerber Upload' },
  { id: 2 as const, label: 'PCB Config' },
  { id: 3 as const, label: 'Assembly' },
  { id: 4 as const, label: 'BOM / CPL' },
  { id: 5 as const, label: 'Review Parti' },
  { id: 6 as const, label: 'Quote' },
]

interface Props {
  currentStep: number
  completedSteps: number[]
  onNavigate: (step: number) => void
}

export function StepSidebar({ currentStep, completedSteps, onNavigate }: Props) {
  return (
    <nav className="w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4 flex flex-col gap-1">
      <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 font-medium">Configurazione</p>
      {STEPS.map(({ id, label }) => {
        const isActive = currentStep === id
        const isDone = completedSteps.includes(id)
        const isClickable = isDone && !isActive

        return (
          <button
            key={id}
            data-active={isActive || undefined}
            onClick={() => isClickable && onNavigate(id)}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
              isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : '',
              isDone && !isActive ? 'text-slate-600 hover:bg-slate-50 cursor-pointer' : '',
              !isDone && !isActive ? 'text-slate-400 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {isDone && !isActive
              ? <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              : <Circle className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-300'}`} />
            }
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
