import { centerIndex, DEFAULT_COLORS } from './bingo'

describe('centerIndex', () => {
  // centerIndex(n) = floor(n*n / 2) — the visual centre of an n×n grid
  it.each([
    [2, 2],
    [3, 4],
    [4, 8],
    [5, 12],
    [6, 18],
    [7, 24],
  ])('centerIndex(%i) === %i', (size, expected) => {
    expect(centerIndex(size)).toBe(expected)
  })

  it('is always the middle cell in a flat array of size*size', () => {
    for (let n = 2; n <= 7; n++) {
      const total = n * n
      const idx = centerIndex(n)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(total)
      // Equal numbers of cells before and after (odd total) or one more after (even total)
      expect(idx).toBe(Math.floor(total / 2))
    }
  })
})

describe('DEFAULT_COLORS', () => {
  it('primary defaults to black', () => {
    expect(DEFAULT_COLORS.primary).toBe('#000000')
  })

  it('freeSpace defaults to the expected violet', () => {
    expect(DEFAULT_COLORS.freeSpace).toBe('#845ef7')
  })

  it('background defaults to white', () => {
    expect(DEFAULT_COLORS.background).toBe('#ffffff')
  })

  it('all values are valid 6-digit hex strings', () => {
    const hexRe = /^#[0-9a-f]{6}$/i
    expect(DEFAULT_COLORS.primary).toMatch(hexRe)
    expect(DEFAULT_COLORS.freeSpace).toMatch(hexRe)
    expect(DEFAULT_COLORS.background).toMatch(hexRe)
  })
})
