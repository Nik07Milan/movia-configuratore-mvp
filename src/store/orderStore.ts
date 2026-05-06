import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GerberMeta, PCBConfig, AssemblyConfig, BOMItem, CPLItem, PriceBreakdown } from '../types/order'

const DEFAULT_PCB_CONFIG: PCBConfig = {
  material: 'FR4',
  layers: 2,
  width: 100,
  height: 100,
  qty: 5,
  productType: 'Industrial',
  thickness: 1.6,
  surfaceFinish: 'HASL',
  solderMaskColor: 'Green',
  silkscreenColor: 'White',
}

const DEFAULT_ASSEMBLY_CONFIG: AssemblyConfig = {
  type: 'Economic',
  side: 'Top',
  qty: 5,
  toolingHoles: 'ByMovia',
  partsSelection: 'ByCustomer',
  bakeComponents: false,
  boardCleaning: false,
  flyingProbeTest: false,
  conformalCoating: false,
  packaging: 'Antistatic',
  specialStencil: false,
  depaneling: false,
  functionTest: false,
  photoConfirmation: false,
  solderPaste: 'HighTemp',
  nitrogenReflow: true,
  pcbaRemark: '',
}

const DEFAULT_PRICE: PriceBreakdown = {
  pcbBase: 0, engineeringFee: 3.38, board: 0,
  setupFee: 0, stencil: 0, components: 0, smtAssembly: 0,
  total: 0, buildTimePCB: '2 giorni', buildTimeAssembly: '2-3 giorni',
}

interface OrderStore {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6
  gerberFiles: File[]
  gerberMeta: GerberMeta | null
  pcbConfig: PCBConfig
  assemblyEnabled: boolean
  assemblyConfig: AssemblyConfig
  bomFile: File | null
  cplFile: File | null
  bomParsed: BOMItem[]
  cplParsed: CPLItem[]
  selectedDesignator: string | null
  priceBreakdown: PriceBreakdown

  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6) => void
  setGerberFiles: (files: File[]) => void
  setGerberMeta: (meta: GerberMeta) => void
  setPCBConfig: (config: Partial<PCBConfig>) => void
  toggleAssembly: (enabled: boolean) => void
  setAssemblyConfig: (config: Partial<AssemblyConfig>) => void
  setBOMFile: (file: File | null) => void
  setCPLFile: (file: File | null) => void
  setBOMParsed: (items: BOMItem[]) => void
  setCPLParsed: (items: CPLItem[]) => void
  setSelectedDesignator: (d: string | null) => void
  setPriceBreakdown: (p: PriceBreakdown) => void
  reset: () => void
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      currentStep: 1,
      gerberFiles: [],
      gerberMeta: null,
      pcbConfig: DEFAULT_PCB_CONFIG,
      assemblyEnabled: true,
      assemblyConfig: DEFAULT_ASSEMBLY_CONFIG,
      bomFile: null,
      cplFile: null,
      bomParsed: [],
      cplParsed: [],
      selectedDesignator: null,
      priceBreakdown: DEFAULT_PRICE,

      setStep: (step) => set({ currentStep: step }),
      setGerberFiles: (files) => set({ gerberFiles: files }),
      setGerberMeta: (meta) =>
        set((s) => ({
          gerberMeta: meta,
          pcbConfig: { ...s.pcbConfig, layers: meta.layers as PCBConfig['layers'], width: meta.width, height: meta.height },
        })),
      setPCBConfig: (config) => set((s) => ({ pcbConfig: { ...s.pcbConfig, ...config } })),
      toggleAssembly: (enabled) => set({ assemblyEnabled: enabled }),
      setAssemblyConfig: (config) => set((s) => ({ assemblyConfig: { ...s.assemblyConfig, ...config } })),
      setBOMFile: (file) => set({ bomFile: file }),
      setCPLFile: (file) => set({ cplFile: file }),
      setBOMParsed: (items) => set({ bomParsed: items }),
      setCPLParsed: (items) => set({ cplParsed: items }),
      setSelectedDesignator: (d) => set({ selectedDesignator: d }),
      setPriceBreakdown: (p) => set({ priceBreakdown: p }),
      reset: () =>
        set({
          currentStep: 1, gerberFiles: [], gerberMeta: null,
          pcbConfig: DEFAULT_PCB_CONFIG, assemblyEnabled: true,
          assemblyConfig: DEFAULT_ASSEMBLY_CONFIG,
          bomFile: null, cplFile: null, bomParsed: [], cplParsed: [],
          selectedDesignator: null, priceBreakdown: DEFAULT_PRICE,
        }),
    }),
    {
      name: 'movia-pcba-order',
      // File objects cannot be serialized — exclude them
      partialize: (s) => ({
        currentStep: s.currentStep,
        gerberMeta: s.gerberMeta,
        pcbConfig: s.pcbConfig,
        assemblyEnabled: s.assemblyEnabled,
        assemblyConfig: s.assemblyConfig,
        bomParsed: s.bomParsed,
        cplParsed: s.cplParsed,
        priceBreakdown: s.priceBreakdown,
      }),
    }
  )
)
