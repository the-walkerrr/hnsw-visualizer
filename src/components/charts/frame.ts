export interface Frame {
  w: number
  h: number
  pad: { t: number; r: number; b: number; l: number }
}

export const FRAME: Frame = { w: 340, h: 166, pad: { t: 14, r: 12, b: 40, l: 54 } }
