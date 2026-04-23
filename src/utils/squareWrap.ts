// Approximate character width and line height ratios used for layout scoring.
// These must stay in sync between BingoGrid (live display) and exportCardImage
// (canvas export) so wrap decisions are visually consistent between the two.
export const CHAR_W = 0.62
export const LINE_H = 1.3

// Any score for a taller-than-wide block; realistic scores for wider-than-tall
// blocks are well below this (max line ~50 chars × CHAR_W ≈ 31 em).
const TALL_PENALTY = 100

// Line height used only for the wider-vs-taller comparison inside squareWrap.
// Slightly larger than the rendered LINE_H so arrangements where widthEM only
// barely exceeds heightEM (e.g. four short equal-length lines) are treated as
// taller-than-wide and penalised, preventing a single added character from
// flipping text to an extra line. Does not affect font-size calculations.
const SCORE_LINE_H = 1.4

/**
 * Reflows `text` into multiple lines targeting a block that is wider than it
 * is tall (so more words fit per line). Among arrangements that satisfy that
 * constraint, the one that minimises the dominant dimension is chosen, which
 * directly maximises the font size that will fit in the cell.
 *
 * Taller-than-wide arrangements are only used as a last resort (all words are
 * too long to produce a wider block at any wrap point).
 *
 * Single-word inputs are returned as-is; empty input returns ''.
 */
export function squareWrap(text: string): string {
  if (!text) return ''
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0]

  let bestLines: string[] = [words.join(' ')]
  let bestScore = Infinity

  for (let targetWidth = 1; targetWidth <= text.length; targetWidth++) {
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      if (!current) {
        current = word
      } else if (current.length + 1 + word.length <= targetWidth) {
        current += ' ' + word
      } else {
        lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)

    const widthEM = Math.max(...lines.map((l) => l.length)) * CHAR_W
    const heightEM = lines.length * SCORE_LINE_H

    // Prefer wider-than-tall. Among valid arrangements minimise the dominant
    // dimension (= maximise font size). Taller-than-wide blocks are penalised
    // so they only win when no wider arrangement exists.
    const score =
      widthEM < heightEM
        ? TALL_PENALTY + (heightEM - widthEM) // taller than wide — last resort
        : Math.max(widthEM, heightEM) // wider than tall — minimise dominant dim

    if (score < bestScore) {
      bestScore = score
      bestLines = lines
    }
  }

  return bestLines.join('\n')
}
