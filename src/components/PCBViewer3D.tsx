import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { GerberMeta, CPLItem } from '../types/order'

// Component type detection from designator prefix
function componentColor(designator: string): string {
  const prefix = designator.replace(/[0-9]/g, '').toUpperCase()
  if (['IC', 'U'].some((p) => prefix.startsWith(p))) return '#1a1a1a'
  if (prefix.startsWith('R')) return '#c8a96e'
  if (prefix.startsWith('C')) return '#d4a800'
  if (prefix.startsWith('LED')) return '#cc2200'
  if (prefix.startsWith('L')) return '#2244aa'
  return '#666666'
}

const SOLDER_MASK_COLORS: Record<string, string> = {
  Green: '#1a5c1a', Red: '#8b0000', Blue: '#00008b',
  Black: '#111111', White: '#f5f5f5', Yellow: '#ccaa00',
}

const SCALE = 0.01 // mm → three units (1mm = 0.01 units)
const BOARD_THICKNESS = 1.6 * SCALE
const COMP_H = 0.2 * SCALE

// Convert SVG string to THREE.CanvasTexture (async)
async function svgToTexture(svgString: string): Promise<THREE.CanvasTexture | null> {
  if (!svgString) return null
  try {
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = rej
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || 512
    canvas.height = img.naturalHeight || 512
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    return new THREE.CanvasTexture(canvas)
  } catch {
    return null
  }
}

interface BoardProps {
  meta: GerberMeta
  solderMaskColor: string
  showBottom: boolean
}

function Board({ meta, solderMaskColor, showBottom }: BoardProps) {
  const [topTexture, setTopTexture] = useState<THREE.CanvasTexture | null>(null)
  const [bottomTexture, setBottomTexture] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    svgToTexture(meta.layerSVGs.top).then(setTopTexture)
    svgToTexture(meta.layerSVGs.bottom).then(setBottomTexture)
    return () => {
      topTexture?.dispose()
      bottomTexture?.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta])

  const color = SOLDER_MASK_COLORS[solderMaskColor] ?? '#1a5c1a'
  const texture = showBottom ? bottomTexture : topTexture

  return (
    <mesh rotation-x={showBottom ? Math.PI : 0}>
      <boxGeometry args={[meta.width * SCALE, BOARD_THICKNESS, meta.height * SCALE]} />
      <meshStandardMaterial color={color} map={texture ?? null} />
    </mesh>
  )
}

interface ComponentsProps {
  cpl: CPLItem[]
  selectedDesignator: string | null
  showBottom: boolean
  meta: GerberMeta
}

function Components({ cpl, selectedDesignator, showBottom, meta }: ComponentsProps) {
  const yOffset = BOARD_THICKNESS / 2 + COMP_H / 2
  // Board center in design space (mm)
  const cx = meta.originX + meta.width / 2
  const cy = meta.originY + meta.height / 2

  return (
    <>
      {cpl.map((item) => {
        const isBottom = item.layer === 'BottomLayer'
        if (isBottom !== showBottom) return null
        const y = isBottom ? -yOffset : yOffset
        const color = item.designator === selectedDesignator ? '#ffff00' : componentColor(item.designator)
        // Offset by board center; flip Z (gerber Y-up → Three.js -Z)
        const px = (item.x - cx) * SCALE
        const pz = -(item.y - cy) * SCALE
        return (
          <mesh
            key={item.designator}
            position={[px, y, pz]}
            rotation-y={THREE.MathUtils.degToRad(item.rotation)}
          >
            <boxGeometry args={[0.5 * SCALE, COMP_H, 0.5 * SCALE]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )
      })}
    </>
  )
}

interface Props {
  meta: GerberMeta | null
  cpl: CPLItem[]
  selectedDesignator: string | null
  solderMaskColor: string
}

export function PCBViewer3D({ meta, cpl, selectedDesignator, solderMaskColor }: Props) {
  const [showBottom, setShowBottom] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (!meta) {
    return (
      <div className="flex-1 bg-slate-100 flex items-center justify-center text-xs text-slate-400 p-4 text-center">
        Carica un file Gerber per la preview 3D
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`flex flex-col gap-2 ${isFullscreen ? 'h-screen w-screen bg-slate-900' : 'h-full min-h-0'}`}>
      <div className="flex gap-2 px-3 pt-2 items-center">
        <button
          onClick={() => setShowBottom(false)}
          className={`px-3 py-1 rounded text-xs font-medium ${!showBottom ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}
        >
          Top
        </button>
        <button
          onClick={() => setShowBottom(true)}
          className={`px-3 py-1 rounded text-xs font-medium ${showBottom ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}
        >
          Bottom
        </button>
        <button
          onClick={toggleFullscreen}
          className="ml-auto px-2 py-1 rounded text-xs font-medium bg-slate-200 text-slate-600 hover:bg-slate-300"
          title={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
        >
          {isFullscreen ? '✕ Esci' : '⛶'}
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-slate-200">
        <Canvas camera={{ position: [0, 3, 3], fov: 45 }} gl={{ alpha: false }} onCreated={({ gl }) => gl.setClearColor('#e2e8f0')}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Board meta={meta} solderMaskColor={solderMaskColor} showBottom={showBottom} />
          <Components cpl={cpl} selectedDesignator={selectedDesignator} showBottom={showBottom} meta={meta} />
          <OrbitControls makeDefault />
        </Canvas>
      </div>
    </div>
  )
}
