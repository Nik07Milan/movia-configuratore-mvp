import { describe, it, expect } from 'vitest'
import { parseBOMFromCSV, parseCPLFromCSV } from './bomParser'

const BOM_CSV_6COL = `Comment,Description,Designator,Footprint,LibRef,Quantity,Populate
SML-P13PTT86R,LED,LED1,LEDC1006X25N,SML-P13PTT86R,2,
BC-2001,Hardware,H1,BC2001,BC-2001,1,DNP`

const CPL_CSV_6COL = `Altium Designer Pick and Place Locations
Units used: mil

"Designator","Layer","Center-X(mil)","Center-Y(mil)","Rotation","Description"
"R1","TopLayer","-755.000","355.000","0","RES SMD"
"LED1","TopLayer","-660.000","355.000","0","LED"
"SW1","BottomLayer","-1060.000","1030.000","60",""`

const CPL_CSV_8COL = `Altium Designer Pick and Place Locations
Units used: mm

"Designator","Comment","Layer","Footprint","Center-X(mm)","Center-Y(mm)","Rotation","Description"
"C1","10pF","BottomLayer","CAP_0201","1.460","2.820","225","CAP"`

describe('parseBOMFromCSV', () => {
  it('parses populate=true when field is empty', () => {
    const items = parseBOMFromCSV(BOM_CSV_6COL)
    expect(items[0].populate).toBe(true)
    expect(items[0].comment).toBe('SML-P13PTT86R')
  })

  it('parses DNP as populate=false', () => {
    const items = parseBOMFromCSV(BOM_CSV_6COL)
    expect(items[1].populate).toBe(false)
    expect(items[1].designator).toBe('H1')
  })

  it('returns correct quantity', () => {
    const items = parseBOMFromCSV(BOM_CSV_6COL)
    expect(items[0].quantity).toBe(2)
  })
})

describe('parseCPLFromCSV — 6 columns mil', () => {
  it('skips Altium header and detects Designator row', () => {
    const items = parseCPLFromCSV(CPL_CSV_6COL)
    expect(items).toHaveLength(3)
  })

  it('converts mil to mm', () => {
    const items = parseCPLFromCSV(CPL_CSV_6COL)
    // -755 mil * 0.0254 = -19.177
    expect(items[0].x).toBeCloseTo(-755 * 0.0254, 2)
  })

  it('parses layer correctly', () => {
    const items = parseCPLFromCSV(CPL_CSV_6COL)
    expect(items[2].layer).toBe('BottomLayer')
  })

  it('parses rotation', () => {
    const items = parseCPLFromCSV(CPL_CSV_6COL)
    expect(items[2].rotation).toBe(60)
  })
})

describe('parseCPLFromCSV — 8 columns mm', () => {
  it('parses mm without conversion', () => {
    const items = parseCPLFromCSV(CPL_CSV_8COL)
    expect(items[0].x).toBeCloseTo(1.460, 3)
  })

  it('populates optional comment field', () => {
    const items = parseCPLFromCSV(CPL_CSV_8COL)
    expect(items[0].comment).toBe('10pF')
  })
})
