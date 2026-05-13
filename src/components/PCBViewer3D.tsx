import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { GerberMeta, CPLItem } from '../types/order'

// ─── Constants ───────────────────────────────────────────────────────────────

const SCALE = 0.01            // mm → Three.js units
const BOARD_THICKNESS = 1.6 * SCALE

const SOLDER_MASK_COLORS: Record<string, string> = {
  Green: '#1a5c1a', Red: '#8b0000', Blue: '#00008b',
  Black: '#111111', White: '#f5f5f5', Yellow: '#ccaa00',
}

// ─── EIA package sizes: [length, width, height] in mm ────────────────────────

const EIA_SIZES: Record<string, [number, number, number]> = {
  '0201': [0.60, 0.30, 0.30],
  '0402': [1.00, 0.50, 0.40],
  '0603': [1.60, 0.80, 0.45],
  '0805': [2.00, 1.25, 0.50],
  '1206': [3.20, 1.60, 0.55],
  '1210': [3.20, 2.50, 0.55],
  '1812': [4.50, 3.20, 1.50],
  '2010': [5.00, 2.50, 0.60],
  '2512': [6.30, 3.20, 0.60],
}

function getComponentSize(footprint?: string, designator?: string): [number, number, number] {
  if (footprint) {
    const eia = footprint.match(/\b(0201|0402|0603|0805|1206|1210|1812|2010|2512)\b/)
    if (eia && EIA_SIZES[eia[1]]) return EIA_SIZES[eia[1]]
    if (/SOT.?223/i.test(footprint))  return [6.7, 3.6, 1.8]
    if (/SOT.?23/i.test(footprint))   return [2.9, 1.6, 1.2]
    if (/LQFP.?48/i.test(footprint))  return [9.0, 9.0, 1.4]
    if (/TSSOP.?20/i.test(footprint)) return [6.5, 4.4, 1.1]
    if (/SOIC.?8/i.test(footprint))   return [5.0, 3.9, 1.5]
    if (/QFN/i.test(footprint))       return [5.0, 5.0, 0.9]
    if (/HDMI/i.test(footprint))      return [15.0, 11.0, 3.5]
    if (/USB/i.test(footprint))       return [8.0, 5.6, 3.0]
    if (/HDR|HEADER/i.test(footprint)) return [6.5, 2.5, 8.0]
  }
  const prefix = (designator ?? '').replace(/\d/g, '').toUpperCase()
  if (['IC', 'U'].some((p) => prefix.startsWith(p))) return [5.0, 5.0, 1.2]
  if (prefix.startsWith('C')) return [1.6, 0.8, 1.0]
  if (prefix.startsWith('R')) return [1.6, 0.8, 0.5]
  if (prefix.startsWith('LED')) return [1.6, 0.8, 0.8]
  if (prefix.startsWith('L')) return [3.0, 3.0, 2.0]
  if (['J', 'P', 'CN'].some((p) => prefix.startsWith(p))) return [8.0, 4.0, 2.5]
  if (prefix.startsWith('D')) return [3.0, 1.8, 1.2]
  return [1.6, 1.6, 0.8]
}

// ─── PBR material params per component type ──────────────────────────────────

function getComponentMaterial(designator: string): { color: string; roughness: number; metalness: number } {
  const prefix = designator.replace(/\d/g, '').toUpperCase()
  if (['IC', 'U'].some((p) => prefix.startsWith(p))) return { color: '#1a1a1a', roughness: 0.4, metalness: 0.0 }
  if (prefix.startsWith('R'))   return { color: '#c8a96e', roughness: 0.9, metalness: 0.0 }
  if (prefix.startsWith('C'))   return { color: '#d4a800', roughness: 0.85, metalness: 0.0 }
  if (prefix.startsWith('LED')) return { color: '#cc2200', roughness: 0.3, metalness: 0.0 }
  if (prefix.startsWith('L'))   return { color: '#2244aa', roughness: 0.5, metalness: 0.2 }
  if (['J', 'P', 'CN'].some((p) => prefix.startsWith(p))) return { color: '#888888', roughness: 0.4, metalness: 0.6 }
  if (prefix.startsWith('D'))   return { color: '#333344', roughness: 0.6, metalness: 0.1 }
  return { color: '#888888', roughness: 0.7, metalness: 0.0 }
}

// ─── SVG → CanvasTexture (2048px max) ────────────────────────────────────────

async function svgToTexture(svgString: string, maxPx = 2048): Promise<THREE.CanvasTexture | null> {
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
    const nw = img.naturalWidth || 512
    const nh = img.naturalHeight || 512
    const aspect = nw / nh
    const w = aspect >= 1 ? maxPx : Math.round(maxPx * aspect)
    const h = aspect >= 1 ? Math.round(maxPx / aspect) : maxPx
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    URL.revokeObjectURL(url)
    return new THREE.CanvasTexture(canvas)
  } catch {
    return null
  }
}

// ─── Board outline → THREE.Shape ─────────────────────────────────────────────

function buildBoardShape(meta: GerberMeta): THREE.Shape {
  const shape = new THREE.Shape()
  const cx = meta.originX + meta.width / 2
  const cy = meta.originY + meta.height / 2

  if (meta.outlinePoints && meta.outlinePoints.length >= 3) {
    const pts = meta.outlinePoints
    // Shape XY: shapeX = (gerberX - cx)*SCALE, shapeY = (gerberY - cy)*SCALE
    // After geo.rotateX(-π/2): shapeY → Three.js -Z → matches component pz
    shape.moveTo((pts[0][0] - cx) * SCALE, (pts[0][1] - cy) * SCALE)
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo((pts[i][0] - cx) * SCALE, (pts[i][1] - cy) * SCALE)
    }
  } else {
    // Fallback rectangle
    const hw = (meta.width / 2) * SCALE
    const hh = (meta.height / 2) * SCALE
    shape.moveTo(-hw, -hh)
    shape.lineTo(hw, -hh)
    shape.lineTo(hw, hh)
    shape.lineTo(-hw, hh)
  }
  shape.closePath()
  return shape
}

// ─── Board mesh ───────────────────────────────────────────────────────────────

interface BoardProps {
  meta: GerberMeta
  solderMaskColor: string
  showBottom: boolean
}

function Board({ meta, solderMaskColor, showBottom }: BoardProps) {
  const [topTexture, setTopTexture] = useState<THREE.CanvasTexture | null>(null)
  const [bottomTexture, setBottomTexture] = useState<THREE.CanvasTexture | null>(null)

  const geometry = useMemo(() => {
    const shape = buildBoardShape(meta)
    const geo = new THREE.ExtrudeGeometry(shape, { depth: BOARD_THICKNESS, bevelEnabled: false })
    // Lay flat: shape XY → XZ plane; extrusion +Z → +Y (board thickness)
    geo.rotateX(-Math.PI / 2)
    geo.center()
    return geo
  }, [meta])

  useEffect(() => {
    let cancelled = false
    svgToTexture(meta.layerSVGs.top).then((t) => { if (!cancelled) setTopTexture(t) })
    svgToTexture(meta.layerSVGs.bottom).then((t) => { if (!cancelled) setBottomTexture(t) })
    return () => {
      cancelled = true
      topTexture?.dispose()
      bottomTexture?.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta])

  const boardColor = SOLDER_MASK_COLORS[solderMaskColor] ?? '#1a5c1a'
  const texture = showBottom ? bottomTexture : topTexture

  return (
    <mesh geometry={geometry} rotation-x={showBottom ? Math.PI : 0}>
      <meshStandardMaterial
        color={boardColor}
        map={texture ?? null}
        roughness={0.85}
        metalness={0.0}
      />
    </mesh>
  )
}

// ─── Components mesh ──────────────────────────────────────────────────────────

interface ComponentsProps {
  cpl: CPLItem[]
  selectedDesignator: string | null
  showBottom: boolean
  meta: GerberMeta
}

function Components({ cpl, selectedDesignator, showBottom, meta }: ComponentsProps) {
  const cx = meta.originX + meta.width / 2
  const cy = meta.originY + meta.height / 2

  return (
    <>
      {cpl.map((item) => {
        const isBottom = item.layer === 'BottomLayer'
        if (isBottom !== showBottom) return null

        const [l, w, h] = getComponentSize(item.footprint, item.designator)
        const compH = h * SCALE
        const yOffset = BOARD_THICKNESS / 2 + compH / 2
        const y = isBottom ? -yOffset : yOffset

        const px = (item.x - cx) * SCALE
        const pz = -(item.y - cy) * SCALE

        const isSelected = item.designator === selectedDesignator
        const mat = getComponentMaterial(item.designator)

        return (
          <mesh
            key={item.designator}
            position={[px, y, pz]}
            rotation-y={THREE.MathUtils.degToRad(item.rotation)}
          >
            <boxGeometry args={[l * SCALE, compH, w * SCALE]} />
            <meshStandardMaterial
              color={isSelected ? '#ffee00' : mat.color}
              roughness={isSelected ? 0.3 : mat.roughness}
              metalness={isSelected ? 0.1 : mat.metalness}
              emissive={isSelected ? '#665500' : '#000000'}
            />
          </mesh>
        )
      })}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

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
    <div
      ref={containerRef}
      className={`flex flex-col gap-2 ${isFullscreen ? 'h-screen w-screen bg-slate-200' : 'h-full min-h-0'}`}
    >
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
        <Canvas
          camera={{ position: [0, 3, 3], fov: 45 }}
          gl={{ alpha: false }}
          onCreated={({ gl }) => gl.setClearColor('#e2e8f0')}
        >
          {/* Improved lighting: hemisphere (sky/ground) + directional */}
          <hemisphereLight args={['#ddeeff', '#334422', 0.6]} />
          <directionalLight position={[5, 8, 4]} intensity={1.2} castShadow />
          <directionalLight position={[-3, 4, -2]} intensity={0.4} />

          <Board meta={meta} solderMaskColor={solderMaskColor} showBottom={showBottom} />
          <Components
            cpl={cpl}
            selectedDesignator={selectedDesignator}
            showBottom={showBottom}
            meta={meta}
          />
          <OrbitControls makeDefault />
        </Canvas>
      </div>
    </div>
  )
}
