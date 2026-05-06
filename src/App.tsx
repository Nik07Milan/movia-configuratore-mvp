import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { Layout } from './components/Layout'
import { useOrderStore } from './store/orderStore'
import { Step1_GerberUpload } from './steps/Step1_GerberUpload'
import { Step2_PCBConfig } from './steps/Step2_PCBConfig'
import { Step3_Assembly } from './steps/Step3_Assembly'
import { Step4_BOMUpload } from './steps/Step4_BOMUpload'
import { Step5_PartsReview } from './steps/Step5_PartsReview'
import { Step6_Quote } from './steps/Step6_Quote'

const STEP_COMPONENTS = {
  1: Step1_GerberUpload,
  2: Step2_PCBConfig,
  3: Step3_Assembly,
  4: Step4_BOMUpload,
  5: Step5_PartsReview,
  6: Step6_Quote,
} as const

export default function App() {
  const currentStep = useOrderStore((s) => s.currentStep)
  const reset = useOrderStore((s) => s.reset)
  const StepComponent = STEP_COMPONENTS[currentStep]

  const [showDraftBanner, setShowDraftBanner] = useState(false)
  useEffect(() => {
    const saved = localStorage.getItem('movia-pcba-order')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed?.state?.currentStep > 1) setShowDraftBanner(true)
      } catch {}
    }
  }, [])

  return (
    <>
      <Toaster position="top-right" />
      {showDraftBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg flex items-center gap-3 z-50">
          <span>Bozza ripristinata</span>
          <button
            onClick={() => { reset(); setShowDraftBanner(false) }}
            className="underline text-indigo-200 text-xs"
          >
            Nuova configurazione
          </button>
          <button onClick={() => setShowDraftBanner(false)} className="text-indigo-200">x</button>
        </div>
      )}
      <Layout>
        <StepComponent />
      </Layout>
    </>
  )
}
