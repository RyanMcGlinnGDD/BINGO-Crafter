import { squareWrap } from './squareWrap'

describe('squareWrap', () => {
  // ---------------------------------------------------------------------------
  // Empty / whitespace inputs
  // ---------------------------------------------------------------------------

  it('returns empty string for empty input', () => {
    expect(squareWrap('')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(squareWrap('   ')).toBe('')
    expect(squareWrap('\t\n')).toBe('')
  })

  // ---------------------------------------------------------------------------
  // Single-word inputs — must never wrap
  // ---------------------------------------------------------------------------

  it('returns a single word unchanged', () => {
    expect(squareWrap('hello')).toBe('hello')
    expect(squareWrap('Supercalifragilistic')).toBe('Supercalifragilistic')
  })

  it('trims leading and trailing whitespace before processing', () => {
    expect(squareWrap('  hello  ')).toBe('hello')
  })

  it('collapses internal whitespace between words', () => {
    const result = squareWrap('hello   world')
    // Both words are present; excess spaces are gone
    expect(result).not.toContain('  ')
    expect(result.replace('\n', ' ')).toBe('hello world')
  })

  // ---------------------------------------------------------------------------
  // Wrapping prefers wider-than-tall arrangements (maximises font size)
  // ---------------------------------------------------------------------------

  it('prefers a squarer arrangement over a single long line', () => {
    // "hello world" on one line: widthEM = 11*0.62 = 6.82, heightEM = 1*1.4 = 1.4 → score 6.82
    // "hello\nworld" two lines:   widthEM = 5*0.62  = 3.1,  heightEM = 2*1.4 = 2.8  → score 3.1
    // Two-line arrangement has lower score → wins
    expect(squareWrap('hello world')).toBe('hello\nworld')
  })

  it('splits four short equal-length words into two lines', () => {
    // Words: ["aa", "bb", "cc", "dd"] — best is 2×2 arrangement
    // "aa bb\ncc dd": maxChars=5, widthEM=3.1, heightEM=2.8 → score 3.1
    expect(squareWrap('aa bb cc dd')).toBe('aa bb\ncc dd')
  })

  it('keeps all words in the output', () => {
    const input = 'The Quick Brown Fox'
    const output = squareWrap(input)
    const wordsIn = input.trim().split(/\s+/)
    const wordsOut = output.split(/[\s\n]+/)
    expect(wordsOut.sort()).toEqual(wordsIn.map((w) => w).sort())
  })

  it('preserves original word casing', () => {
    const result = squareWrap('GBA Games Playable')
    expect(result).toContain('GBA')
    expect(result).toContain('Games')
    expect(result).toContain('Playable')
  })

  // ---------------------------------------------------------------------------
  // Regression: "Pokemon Sleep Does Something" must stay on 3 lines not 4
  //
  // Before the SCORE_LINE_H fix, adding "g" to "Somethin" flipped the
  // arrangement from 3 lines to 4. The fix uses SCORE_LINE_H=1.4 (> LINE_H=1.3)
  // inside the scoring so near-square 4-line blocks are treated as taller-than-
  // wide and penalised, keeping the 3-line arrangement stable.
  // ---------------------------------------------------------------------------

  it('wraps "Pokemon Sleep Does Somethin" onto 3 lines', () => {
    expect(squareWrap('Pokemon Sleep Does Somethin')).toBe(
      'Pokemon\nSleep Does\nSomethin',
    )
  })

  it('wraps "Pokemon Sleep Does Something" onto 3 lines (regression)', () => {
    // Adding the final "g" must NOT push the text to a 4th line
    expect(squareWrap('Pokemon Sleep Does Something')).toBe(
      'Pokemon\nSleep Does\nSomething',
    )
  })

  // ---------------------------------------------------------------------------
  // Tall-penalty: taller-than-wide blocks only win when unavoidable
  // ---------------------------------------------------------------------------

  it('avoids taller-than-wide blocks when a wider alternative exists', () => {
    // Any arrangement with more lines than necessary is penalised; the result
    // must have at most as many lines as necessary for a wider-than-tall shape.
    const result = squareWrap('A B C D E F')
    const lines = result.split('\n')
    const widthEM = Math.max(...lines.map((l) => l.length)) * 0.62
    const heightEM = lines.length * 1.4
    // For this short text a wider-than-tall arrangement must exist
    expect(widthEM).toBeGreaterThanOrEqual(heightEM)
  })

  it('accepts a tall arrangement only when all words are too long to form a wide block', () => {
    // A single very long word — no wrapping possible at all, returns as-is
    const longWord = 'Pneumonoultramicroscopicsilicovolcanoconiosis'
    expect(squareWrap(longWord)).toBe(longWord)
  })
})
