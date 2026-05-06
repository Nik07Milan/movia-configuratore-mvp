import type { ReactNode } from 'react'
import { StepSidebar } from './StepSidebar'
import { PricePanel } from './PricePanel'
import { PCBViewer3D } from './PCBViewer3D'
import { useOrderStore } from '../store/orderStore'

interface Props { children: ReactNode }

export function Layout({ children }: Props) {
  const { currentStep, setStep, priceBreakdown, assemblyEnabled, gerberMeta, cplParsed, selectedDesignator, pcbConfig } = useOrderStore()

  const completedSteps = Array.from({ length: currentStep - 1 }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <span className="text-indigo-600 font-bold text-lg tracking-tight">Movia</span>
        <span className="text-slate-400 text-sm">/ Configuratore PCBA</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <StepSidebar
          currentStep={currentStep}
          completedSteps={completedSteps}
          onNavigate={(s) => setStep(s as any)}
        />

        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>

        <div className="flex flex-col w-72 border-l border-slate-200 bg-white">
          <PricePanel breakdown={priceBreakdown} assemblyEnabled={assemblyEnabled} />
          <div className="flex-1 min-h-0">
            <PCBViewer3D
              meta={gerberMeta}
              cpl={cplParsed}
              selectedDesignator={selectedDesignator}
              solderMaskColor={pcbConfig.solderMaskColor}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
