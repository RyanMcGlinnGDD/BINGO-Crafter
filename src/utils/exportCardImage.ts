import { DEFAULT_COLORS, type BingoCard } from '@/types/bingo'
import { squareWrap, CHAR_W, LINE_H } from '@/utils/squareWrap'

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export function exportCardAsJpeg(card: BingoCard): void {
  const CANVAS_H = 1080
  const PADDING = 28
  const TITLE_H = 80   // height reserved above the grid for the card name
  const CELL_PAD = 16  // 8px each side — matches BingoGrid's PAD constant
  const FONT_FAMILY = "Inter, 'system-ui', sans-serif"

  const { primary, freeSpace: freeSpaceColor, background } = { ...DEFAULT_COLORS, ...card.colors }
  const FREE_BG = freeSpaceColor
  const FREE_FG = '#ffffff'
  const CELL_BG = background
  const CELL_FG = primary
  const BORDER = primary
  const CANVAS_BG = background

  // Grid is a square occupying the remaining height; canvas width matches it.
  const gridArea = CANVAS_H - 2 * PADDING - TITLE_H
  const CANVAS_W = gridArea + 2 * PADDING

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!

  const { size: gridSize, cells, name, freeSpaceLabel = 'FREE' } = card

  // ---------------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------------
  ctx.fillStyle = CANVAS_BG
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // ---------------------------------------------------------------------------
  // Title
  // ---------------------------------------------------------------------------
  const titleMaxWidth = CANVAS_W - 2 * PADDING
  let lo = 16, hi = 52, titleFontSize = 16
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    ctx.font = `700 ${mid}px ${FONT_FAMILY}`
    if (ctx.measureText(name.toUpperCase()).width <= titleMaxWidth) {
      titleFontSize = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  ctx.font = `700 ${titleFontSize}px ${FONT_FAMILY}`
  ctx.fillStyle = CELL_FG
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name.toUpperCase(), CANVAS_W / 2, PADDING + TITLE_H / 2)

  // ---------------------------------------------------------------------------
  // Grid — mirror the CSS table-style approach:
  //   fill the entire grid area with the border colour, then draw each cell
  //   fill inset by 2px (outer border) with 2px gaps between cells.
  //   This is identical to the CSS wrapper background + gap:2 trick.
  // ---------------------------------------------------------------------------
  const gridX = PADDING
  const gridY = PADDING + TITLE_H

  // Fill grid area with border colour (provides outer border + inner separators)
  ctx.fillStyle = BORDER
  ctx.fillRect(gridX, gridY, gridArea, gridArea)

  const BORDER_W = 2  // outer border thickness (matches CSS border: 2px)
  const GAP_W = 2    // inner gap between cells (matches CSS gap: 2)

  /**
   * Pixel-snapped start of slot `i` within the grid area.
   * slotStart(0) = BORDER_W,  slotStart(gridSize) = gridArea  (one past the last cell).
   */
  function slotStart(i: number): number {
    return BORDER_W + i * GAP_W + Math.round((i * (gridArea - 2 * BORDER_W - (gridSize - 1) * GAP_W)) / gridSize)
  }

  /** Pixel-snapped bounds of a single cell at (col, row). */
  function cellBounds(col: number, row: number) {
    const x = gridX + slotStart(col)
    const y = gridY + slotStart(row)
    const w = slotStart(col + 1) - GAP_W - slotStart(col)
    const h = slotStart(row + 1) - GAP_W - slotStart(row)
    return { x, y, w, h }
  }

  // Pre-compute wrapped text for every cell so we can find the global font size
  // in a single pass (matching BingoGrid's behaviour of using one size for all cells).
  const cellData = cells.map((cell, idx) => {
    const col = idx % gridSize
    const row = Math.floor(idx / gridSize)
    const bounds = cellBounds(col, row)
    const avail = Math.max(0, Math.min(bounds.w, bounds.h) - CELL_PAD)
    const displayText = cell.isFree ? squareWrap(freeSpaceLabel) : squareWrap(cell.content ?? '')
    const lines = displayText ? displayText.split('\n') : []
    const fontWeight = cell.isFree ? 700 : 500
    return { cell, bounds, avail, displayText, lines, fontWeight }
  })

  // Pass 1 — determine the global (minimum) font size across all non-empty cells.
  // Uses the same CHAR_W / LINE_H formula as BingoGrid so sizes match exactly.
  let globalFontSize = Infinity
  for (const { displayText, lines, avail } of cellData) {
    if (!displayText || avail === 0) continue
    const maxChars = Math.max(...lines.map((l) => l.length))
    if (maxChars === 0) continue
    const byWidth = avail / (maxChars * CHAR_W)
    const byHeight = avail / (lines.length * LINE_H)
    globalFontSize = Math.min(globalFontSize, byWidth, byHeight, avail * 0.35)
  }
  globalFontSize = isFinite(globalFontSize) ? Math.floor(globalFontSize) : 14

  // Pass 2 — fill cell backgrounds
  for (const { cell, bounds } of cellData) {
    ctx.fillStyle = cell.isFree ? FREE_BG : CELL_BG
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
  }

  // Pass 3 — draw text using the shared font size
  for (const { cell, bounds, avail, displayText, lines, fontWeight } of cellData) {
    const { x, y, w, h } = bounds

    if (!displayText) {
      // Empty placeholder — faded dash, sized independently (it's decorative)
      const dashSize = Math.floor(avail / (1 * CHAR_W))
      ctx.globalAlpha = 0.25
      ctx.fillStyle = CELL_FG
      ctx.font = `400 ${dashSize}px ${FONT_FAMILY}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('—', x + w / 2, y + h / 2)
      ctx.globalAlpha = 1
      continue
    }

    ctx.font = `${fontWeight} ${globalFontSize}px ${FONT_FAMILY}`
    ctx.fillStyle = cell.isFree ? FREE_FG : CELL_FG
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const lineH = globalFontSize * LINE_H
    const totalH = lines.length * lineH
    const blockTop = y + (h - totalH) / 2
    lines.forEach((line, i) => {
      ctx.fillText(line, x + w / 2, blockTop + i * lineH + lineH / 2)
    })
  }

  // ---------------------------------------------------------------------------
  // Trigger download
  // ---------------------------------------------------------------------------
  canvas.toBlob(
    (blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name.replace(/[^a-z0-9]/gi, '_') || 'bingo_card'}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    'image/jpeg',
    0.93,
  )
}
