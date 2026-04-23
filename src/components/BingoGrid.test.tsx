import { render, screen } from '@testing-library/react'
import { BingoGrid } from './BingoGrid'
import type { BingoCell } from '@/types/bingo'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCell(i: number, overrides: Partial<BingoCell> = {}): BingoCell {
  return { id: String(i), content: `Item${i}`, isFree: false, ...overrides }
}

/** Build a flat BingoCell array for an n×n grid. */
function makeCells(size: number, freePos?: number): BingoCell[] {
  return Array.from({ length: size * size }, (_, i) =>
    makeCell(i, {
      isFree: freePos !== undefined && i === freePos,
      content: freePos !== undefined && i === freePos ? '' : `Item${i}`,
    }),
  )
}

// ---------------------------------------------------------------------------
// Rendering — static (no onSwap)
// ---------------------------------------------------------------------------

describe('BingoGrid — static rendering', () => {
  it('renders size×size cells', () => {
    render(<BingoGrid cells={makeCells(3)} size={3} />)
    // Each cell displays its content; there are 9 unique "ItemN" strings
    expect(screen.getAllByText(/^Item\d+$/)).toHaveLength(9)
  })

  it('renders the default free space label', () => {
    render(<BingoGrid cells={makeCells(3, 4)} size={3} />)
    expect(screen.getByText('FREE')).toBeInTheDocument()
  })

  it('renders a custom free space label', () => {
    render(
      <BingoGrid cells={makeCells(3, 4)} size={3} freeSpaceLabel="WILD" />,
    )
    expect(screen.getByText('WILD')).toBeInTheDocument()
    expect(screen.queryByText('FREE')).not.toBeInTheDocument()
  })

  it('renders the correct number of cells for a 5×5 grid', () => {
    render(<BingoGrid cells={makeCells(5, 12)} size={5} />)
    // 24 content cells + the "FREE" label
    expect(screen.getAllByText(/^Item\d+$/)).toHaveLength(24)
    expect(screen.getByText('FREE')).toBeInTheDocument()
  })

  it('renders empty cells without crashing (shows dash placeholder)', () => {
    const cells = Array.from({ length: 4 }, (_, i) =>
      makeCell(i, { content: '' }),
    )
    render(<BingoGrid cells={cells} size={2} />)
    // The empty placeholder "—" should appear for every empty cell
    expect(screen.getAllByText('—')).toHaveLength(4)
  })

  it('applies tableStyle without crashing', () => {
    const { container } = render(
      <BingoGrid cells={makeCells(3)} size={3} tableStyle />,
    )
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies custom colors without crashing', () => {
    render(
      <BingoGrid
        cells={makeCells(3, 4)}
        size={3}
        colors={{ primary: '#ff0000', freeSpace: '#00ff00', background: '#0000ff' }}
      />,
    )
    expect(screen.getByText('FREE')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Rendering — interactive (with onSwap)
// ---------------------------------------------------------------------------

describe('BingoGrid — interactive rendering', () => {
  it('renders without crashing in interactive mode', () => {
    render(
      <BingoGrid cells={makeCells(3)} size={3} onSwap={() => {}} />,
    )
    expect(screen.getAllByText(/^Item\d+$/)).toHaveLength(9)
  })

  it('renders the free space label in interactive mode', () => {
    render(
      <BingoGrid
        cells={makeCells(3, 4)}
        size={3}
        freeSpaceLabel="CENTER"
        onSwap={() => {}}
      />,
    )
    expect(screen.getByText('CENTER')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// squareWrap integration — multi-word content is wrapped in cells
// ---------------------------------------------------------------------------

describe('BingoGrid — cell text wrapping', () => {
  it('splits multi-word cell content across lines (pre-wrap)', () => {
    // "hello world" → squareWrap → "hello\nworld" → rendered with whitespace:pre-wrap
    const cells = [
      makeCell(0, { content: 'hello world' }),
      makeCell(1, { content: 'foo' }),
      makeCell(2, { content: 'bar' }),
      makeCell(3, { content: 'baz' }),
    ]
    render(<BingoGrid cells={cells} size={2} />)
    // "hello world" gets wrapped; the text node contains a newline
    const span = screen.getByText(/hello/)
    expect(span.textContent).toBe('hello\nworld')
  })
})
