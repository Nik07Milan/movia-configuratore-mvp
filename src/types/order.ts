export type PCBMaterial = 'FR4' | 'Flex' | 'Aluminum' | 'CopperCore' | 'Rogers' | 'PTFE'
export type PCBLayers = 1 | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16
export type ProductType = 'Industrial' | 'Aerospace' | 'Medical'
export type AssemblyType = 'Economic' | 'Standard'
export type AssemblySide = 'Top' | 'Bottom' | 'Both'
export type SolderPaste = 'HighTemp' | 'LeadFree' | 'Standard'
export type Packaging = 'Antistatic' | 'Standard' | 'None'
export type CPLLayer = 'TopLayer' | 'BottomLayer'

export interface GerberMeta {
  layers: number
  width: number   // mm
  height: number  // mm
  originX: number // mm — left edge of board in design space
  originY: number // mm — bottom edge of board in design space
  outlinePoints?: [number, number][]  // mm — closed polygon from outline layer (GM/GKO)
  layerSVGs: {
    top: string
    bottom: string
  }
}

export interface PCBConfig {
  material: PCBMaterial
  layers: PCBLayers
  width: number
  height: number
  qty: number
  productType: ProductType
  thickness: number
  surfaceFinish: string
  solderMaskColor: string
  silkscreenColor: string
}

export interface AssemblyConfig {
  type: AssemblyType
  side: AssemblySide
  qty: number
  toolingHoles: 'ByMovia' | 'ByCustomer'
  partsSelection: 'ByCustomer' | 'ByMovia'
  bakeComponents: boolean
  boardCleaning: boolean
  flyingProbeTest: boolean
  conformalCoating: boolean
  packaging: Packaging
  specialStencil: boolean
  depaneling: boolean
  functionTest: boolean
  photoConfirmation: boolean
  solderPaste: SolderPaste
  nitrogenReflow: boolean
  pcbaRemark: string
}

export interface BOMItem {
  comment: string
  description: string
  designator: string
  footprint: string
  libRef: string
  quantity: number
  populate: boolean
}

export interface CPLItem {
  designator: string
  layer: CPLLayer
  x: number
  y: number
  rotation: number
  description: string
  comment?: string
  footprint?: string
}

export interface PriceBreakdown {
  pcbBase: number
  engineeringFee: number
  board: number
  setupFee: number
  stencil: number
  components: number
  smtAssembly: number
  total: number
  buildTimePCB: string
  buildTimeAssembly: string
}
