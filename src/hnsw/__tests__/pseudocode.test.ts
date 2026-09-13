import { describe, expect, it } from 'vitest'
import { listingById } from '../pseudocode'

const line = (listing: string, key: string) =>
  listingById(listing).lines.find((candidate) => candidate.key === key)!

describe('learner-facing pseudocode', () => {
  it('removes each discarded candidate before refilling the result set', () => {
    expect(line('select-neighbors', 'h11').text).toContain('remove nearest from Wd')
  })

  it('describes heuristic pruning as a distance-based choice without promising a graph route', () => {
    const note = line('select-neighbors', 'h9').note ?? ''
    expect(note).toContain('does not guarantee an existing route')
    expect(note).not.toContain('Reachable in one extra hop')
  })

  it('uses the bottom-layer degree cap in insert and hard-delete repair', () => {
    const insert = listingById('insert').lines.map((item) => item.text).join('\n')
    const deletion = listingById('delete').lines.map((item) => item.text).join('\n')
    expect(insert).toContain('cap(lc) ← Mmax0 if lc = 0; otherwise Mmax')
    expect(insert).toContain('> cap(lc)')
    expect(deletion).toContain('cap(lc)')
  })

  it('labels delete and update listings as demo strategies without universal guarantees', () => {
    const deletion = listingById('delete')
    const update = listingById('update')
    const text = [...deletion.lines, ...update.lines].map((item) => item.text).join('\n')
    expect(deletion.subtitle).toContain('this visualizer')
    expect(update.subtitle).toContain('demo strategies')
    expect(text).not.toMatch(/default everywhere|correct, expensive|cheap, degrades/)
  })
})
