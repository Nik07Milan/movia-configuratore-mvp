import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { GerberMeta, CPLItem } from '../types/order'

// ─── SVG → CanvasTexture ─────────────────────────────────────────────────────

async function svgToTexture(
  svgString: string,
  boardWidthMm: number,
  boardHeightMm: number,
  maxPx = 2048,
  flipX = false,
): Promise<THREE.CanvasTexture | null> {
  if (!svgString) return null
  try {
    const aspect = boardWidthMm / (boardHeightMm || boardWidthMm || 1)
    const w = aspect >= 1 ? maxPx : Math.round(maxPx * aspect)
    const h = aspect >= 1 ? Math.round(maxPx / aspect) : maxPx

    // Patch explicit px dimensions onto the <svg> root element.
    // SVGs with mm/in units produce naturalWidth=0 in Chrome off-screen <img>
    // elements, causing drawImage to silently produce a blank canvas.
    let svg = svgString
    if (/(<svg\b[^>]*)\bwidth="[^"]*"/.test(svg))
      svg = svg.replace(/(<svg\b[^>]*)\bwidth="[^"]*"/, `$1width="${w}px"`)
    else
      svg = svg.replace(/(<svg\b)/, `$1 width="${w}px"`)
    if (/(<svg\b[^>]*)\bheight="[^"]*"/.test(svg))
      svg = svg.replace(/(<svg\b[^>]*)\bheight="[^"]*"/, `$1height="${h}px"`)
    else
      svg = svg.replace(/(<svg\b)/, `$1 height="${h}px"`)

    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    // Use <img>+blobURL — supports the full DOM SVG renderer (xlink:href, <use>, <defs>)
    // which pcb-stackup requires. createImageBitmap uses a restricted decoder that rejects
    // complex SVGs with InvalidStateError.
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = rej
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!

    // White background before drawImage so semi-transparent SVG layers (solder mask
    // at ~75% opacity) composite correctly. Without this, the canvas stores
    // premultiplied-alpha values that Three.js reads as too-dark / gray.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    if (flipX) {
      // pcb-stackup bottom SVG is X-mirrored (rendered from below).
      // Flip canvas horizontally so the pixel data matches the same
      // UV coordinate space as the top texture (u=0 = Gerber minX).
      ctx.save()
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0, w, h)
      ctx.restore()
    } else {
      ctx.drawImage(img, 0, 0, w, h)
    }
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
    shape.moveTo((pts[0][0] - cx) * SCALE, -(pts[0][1] - cy) * SCALE)
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo((pts[i][0] - cx) * SCALE, -(pts[i][1] - cy) * SCALE)
    }
  } else {
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

// ─── Board mesh ───────────────────────────────────────────────────────────────

interface BoardProps {
  meta: GerberMeta
  solderMaskColor: string
  showBottom: boolean
}

function Board({ meta, solderMaskColor, showBottom }: BoardProps) {
  const [topTexture, setTopTexture] = useState<THREE.CanvasTexture | null>(null)
  const [bottomTexture, setBottomTexture] = useState<THREE.CanvasTexture | null>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  const geometry = useMemo(() => {
    const shape = buildBoardShape(meta)

    // UV bounds must match the texture coordinate space exactly.
    // The texture is rendered from the pcb-stackup viewBox (meta.width × meta.height).
    // Using outline bounding box would diverge if copper/silkscreen extends past the
    // outline, creating a systematic position mismatch. Always use viewBox dimensions.
    const hw = (meta.width  / 2) * SCALE  // half-width in Three.js units
    const hh = (meta.height / 2) * SCALE  // half-height

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: BOARD_THICKNESS,
      bevelEnabled: false,
      UVGenerator: {
        generateTopUV: (_geo, vertices, idxA, idxB, idxC) => {
          // shape_x ∈ [-hw, +hw] → u ∈ [0, 1]  (u=0 = Gerber minX)
          // shape_y ∈ [-hh, +hh] → v ∈ [0, 1]
          // THREE.CanvasTexture has flipY=true: UV v=0 → canvas bottom → Gerber minY.
          // shape_y = -(gerberY-cy)*SCALE, so v = (hh-shape_y)/(2*hh) = (gerberY-originY)/height
          // gives v=0 at Gerber minY and v=1 at Gerber maxY — matching flipY convention.
          const uv = (vi: number) => new THREE.Vector2(
            (vertices[vi * 3]     + hw) / (2 * hw),
            (hh - vertices[vi * 3 + 1]) / (2 * hh),
          )
          return [uv(idxA), uv(idxB), uv(idxC)]
        },
        generateSideWallUV: () => [
          new THREE.Vector2(0, 0), new THREE.Vector2(0, 1),
          new THREE.Vector2(1, 1), new THREE.Vector2(1, 0),
        ],
      },
    })
    geo.rotateX(Math.PI / 2)
    geo.center()
    return geo
  }, [meta])

  useEffect(() => {
    let cancelled = false
    svgToTexture(meta.layerSVGs.top, meta.width, meta.height)
      .then((t) => { if (!cancelled) setTopTexture(t) })
    svgToTexture(meta.layerSVGs.bottom, meta.width, meta.height, 2048, true)
      .then((t) => { if (!cancelled) setBottomTexture(t) })
    return () => {
      cancelled = true
      topTexture?.dispose()
      bottomTexture?.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta])

  const boardColor = SOLDER_MASK_COLORS[solderMaskColor] ?? '#1a5c1a'
  const texture = showBottom ? bottomTexture : topTexture

  // r3f doesn't always call material.needsUpdate when map changes null→texture
  // (shader recompile required). Trigger it explicitly via ref.
  useEffect(() => {
    if (matRef.current) matRef.current.needsUpdate = true
  }, [texture])

  return (
    <mesh geometry={geometry} rotation-x={showBottom ? Math.PI : 0}>
      <meshStandardMaterial
        ref={matRef}
        color={texture ? '#ffffff' : boardColor}
        map={texture ?? undefined}
        roughness={0.85}
        metalness={0.0}
        side={THREE.DoubleSide}
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
        const y = yOffset  // always above the visible face (board flips, components don't)

        const px = (item.x - cx) * SCALE
        const pz = (showBottom ? 1 : -1) * (item.y - cy) * SCALE

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
