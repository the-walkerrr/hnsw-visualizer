import type { Metric, Vec } from './types'
import { WORLD } from './constants'

/** Cosine on 2-D screen points is measured from the middle of the canvas,
 *  which makes it purely an angle around that centre — surprising, and worth
 *  seeing. */
const CENTER: Vec = [WORLD.width / 2, WORLD.height / 2]

export function distance(a: Vec, b: Vec, metric: Metric): number {
  switch (metric) {
    case 'euclidean': {
      let s = 0
      for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i]
        s += d * d
      }
      return Math.sqrt(s)
    }
    case 'manhattan': {
      let s = 0
      for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
      return s
    }
    case 'cosine': {
      let dot = 0
      let na = 0
      let nb = 0
      for (let i = 0; i < a.length; i++) {
        const ai = a[i] - CENTER[i]
        const bi = b[i] - CENTER[i]
        dot += ai * bi
        na += ai * ai
        nb += bi * bi
      }
      if (na === 0 || nb === 0) return 1
      return 1 - dot / Math.sqrt(na * nb)
    }
  }
}

export const METRIC_LABEL: Record<Metric, string> = {
  euclidean: 'Euclidean (L2)',
  manhattan: 'Manhattan (L1)',
  cosine: 'Cosine (angle from centre)',
}

export const METRIC_NOTE: Record<Metric, string> = {
  euclidean:
    'Straight-line distance — exactly what your eye measures on the canvas.',
  manhattan:
    'Sum of the x and y gaps. Neighbourhoods become diamonds instead of circles.',
  cosine:
    'Only the direction from the centre of the canvas matters, so every point along a ray is distance 0 from its neighbours. Text embeddings normally use this.',
}
