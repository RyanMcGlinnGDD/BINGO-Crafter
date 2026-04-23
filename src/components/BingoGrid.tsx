import { useRef, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  type SortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BingoCell, CardColors } from '@/types/bingo'
import { DEFAULT_COLORS } from '@/types/bingo'
import { squareWrap, CHAR_W, LINE_H } from '@/utils/squareWrap'
import classes from './BingoGrid.module.css'

// ---------------------------------------------------------------------------
// Swap sorting strategy + helper
// ---------------------------------------------------------------------------

const swapSortingStrategy: SortingStrategy = ({ rects, activeIndex, overIndex, index }) => {
  if (index === overIndex && activeIndex !== overIndex) {
    const activeRect = rects[activeIndex]
    const overRect = rects[overIndex]
    if (!activeRect || !overRect) return null
    return {
      x: activeRect.left - overRect.left,
      y: activeRect.top - overRect.top,
      scaleX: 1,
      scaleY: 1,
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Cell rendering
// ---------------------------------------------------------------------------

interface CellInner {
  displayText: string
  isFree: boolean
  fontSize: number
}

function CellInner({ displayText, isFree, fontSize }: CellInner) {
  return (
    <span
      style={{
        fontSize,
        fontWeight: isFree ? 700 : 500,
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        lineHeight: LINE_H,
        userSelect: 'none',
        display: 'block',
      }}
    >
      {displayText || <span className={classes.empty}>—</span>}
    </span>
  )
}

function StaticCell({
  cell,
  displayText,
  fontSize,
  tableStyle,
}: {
  cell: BingoCell
  displayText: string
  fontSize: number
  tableStyle?: boolean
}) {
  return (
    <div
      className={`${classes.cell} ${cell.isFree ? classes.freeCell : ''} ${tableStyle ? classes.tableCell : ''}`}
    >
      <CellInner displayText={displayText} isFree={cell.isFree} fontSize={fontSize} />
    </div>
  )
}

function SortableCell({
  cell,
  displayText,
  fontSize,
}: {
  cell: BingoCell
  displayText: string
  fontSize: number
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: cell.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 10 : undefined,
        position: 'relative',
      }}
      className={`${classes.cell} ${classes.sortableCell} ${cell.isFree ? classes.freeCell : ''}`}
      {...attributes}
      {...listeners}
    >
      <CellInner displayText={displayText} isFree={cell.isFree} fontSize={fontSize} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Font-size + display-text computation
// ---------------------------------------------------------------------------

interface DisplayCell extends BingoCell {
  displayText: string
}

function computeDisplay(
  cells: BingoCell[],
  size: number,
  containerWidth: number,
  small: boolean,
  freeSpaceLabel: string,
  gap: number,
): { fontSize: number; displayCells: DisplayCell[] } {
  const cellPx = containerWidth > 0 ? (containerWidth - gap * (size - 1)) / size : 0
  const PAD = 16 // 8px padding each side
  const available = Math.max(0, cellPx - PAD)

  const displayCells: DisplayCell[] = cells.map((cell) => ({
    ...cell,
    displayText: cell.isFree ? squareWrap(freeSpaceLabel) : squareWrap(cell.content ?? ''),
  }))

  let minSize = Infinity

  for (const cell of displayCells) {
    if (!cell.displayText || available === 0) continue
    const lines = cell.displayText.split('\n')
    const maxChars = Math.max(...lines.map((l) => l.length))
    if (maxChars === 0) continue
    const byWidth = available / (maxChars * CHAR_W)
    const byHeight = available / (lines.length * LINE_H)
    minSize = Math.min(minSize, byWidth, byHeight)
  }

  const fallback = small ? 7 : 13
  const fontSize =
    minSize === Infinity
      ? fallback
      : Math.max(small ? 4 : 7, Math.min(minSize, small ? 14 : available * 0.35))

  return { fontSize, displayCells }
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface BingoGridProps {
  cells: BingoCell[]
  size: number
  onSwap?: (oldPos: number, newPos: number) => void
  small?: boolean
  freeSpaceLabel?: string
  tableStyle?: boolean
  colors?: CardColors
}

export function BingoGrid({ cells, size, onSwap, small = false, freeSpaceLabel, tableStyle = false, colors }: BingoGridProps) {
  const effectiveColors = {
    primary: colors?.primary ?? DEFAULT_COLORS.primary,
    freeSpace: colors?.freeSpace ?? DEFAULT_COLORS.freeSpace,
    background: colors?.background ?? DEFAULT_COLORS.background,
  }
  const interactive = !!onSwap
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const gap = tableStyle ? 2 : small ? 2 : 4
  const { fontSize, displayCells } = useMemo(
    () => computeDisplay(cells, size, containerWidth, small, freeSpaceLabel || 'FREE', gap),
    [cells, size, containerWidth, small, freeSpaceLabel, gap],
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !onSwap) return
    const oldIndex = cells.findIndex((c) => c.id === active.id)
    const newIndex = cells.findIndex((c) => c.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      onSwap(oldIndex, newIndex)
    }
  }

  const gridStyle = {
    '--bingo-primary': effectiveColors.primary,
    '--bingo-freespace': effectiveColors.freeSpace,
    '--bingo-background': effectiveColors.background,
    display: 'grid',
    gridTemplateColumns: `repeat(${size}, 1fr)`,
    gap,
    width: '100%',
    ...(tableStyle && {
      background: effectiveColors.primary,
      border: `2px solid ${effectiveColors.primary}`,
      borderRadius: 4,
      overflow: 'hidden',
    }),
  } as React.CSSProperties

  if (!interactive) {
    return (
      <div ref={containerRef} style={gridStyle}>
        {displayCells.map((cell, i) => (
          <StaticCell
            key={cell.id ?? i}
            cell={cell}
            displayText={cell.displayText}
            fontSize={fontSize}
            tableStyle={tableStyle}
          />
        ))}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={cells.map((c) => c.id)} strategy={swapSortingStrategy}>
        <div ref={containerRef} style={gridStyle}>
          {displayCells.map((cell, i) => (
            <SortableCell
              key={cell.id ?? i}
              cell={cell}
              displayText={cell.displayText}
              fontSize={fontSize}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
