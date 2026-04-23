import { renderHook, act } from '@testing-library/react'
import { useBingoCards } from './useBingoCards'
import { centerIndex, type BingoCard, type BingoCell } from '@/types/bingo'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCell(overrides: Partial<BingoCell> = {}): BingoCell {
  return { id: '0', content: '', isFree: false, ...overrides }
}

function makeCard(overrides: Partial<BingoCard> = {}): BingoCard {
  const size = overrides.size ?? 3
  const cells = overrides.cells ?? Array.from({ length: size * size }, (_, i) =>
    makeCell({ id: String(i), content: `Item ${i}` }),
  )
  return {
    id: 'card-1',
    name: 'Test Card',
    size,
    freeSpace: false,
    cells,
    createdAt: 1_000_000,
    updatedAt: 1_000_000,
    ...overrides,
  }
}

const STORAGE_KEY = 'bingo-crafter-cards'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear()
})

describe('useBingoCards — initial state', () => {
  it('returns an empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useBingoCards())
    expect(result.current.cards).toEqual([])
  })

  it('loads cards that were already in localStorage', () => {
    const card = makeCard({ id: 'pre-existing' })
    localStorage.setItem(STORAGE_KEY, JSON.stringify([card]))

    const { result } = renderHook(() => useBingoCards())
    expect(result.current.cards).toHaveLength(1)
    expect(result.current.cards[0].id).toBe('pre-existing')
  })

  it('returns an empty array when localStorage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json {{')
    const { result } = renderHook(() => useBingoCards())
    expect(result.current.cards).toEqual([])
  })
})

describe('useBingoCards — saveCard', () => {
  it('adds a new card', () => {
    const { result } = renderHook(() => useBingoCards())
    const card = makeCard()

    act(() => { result.current.saveCard(card) })

    expect(result.current.cards).toHaveLength(1)
    expect(result.current.cards[0].name).toBe('Test Card')
  })

  it('persists the new card to localStorage', () => {
    const { result } = renderHook(() => useBingoCards())
    act(() => { result.current.saveCard(makeCard({ id: 'abc' })) })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as BingoCard[]
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('abc')
  })

  it('upserts an existing card by id', () => {
    const { result } = renderHook(() => useBingoCards())
    act(() => { result.current.saveCard(makeCard({ id: 'same-id', name: 'Original' })) })
    act(() => { result.current.saveCard(makeCard({ id: 'same-id', name: 'Updated' })) })

    expect(result.current.cards).toHaveLength(1)
    expect(result.current.cards[0].name).toBe('Updated')
  })

  it('preserves createdAt from the first save when updating', () => {
    const { result } = renderHook(() => useBingoCards())
    act(() => { result.current.saveCard(makeCard({ id: 'x', createdAt: 1111 })) })
    act(() => { result.current.saveCard(makeCard({ id: 'x', createdAt: 9999 })) })

    expect(result.current.cards[0].createdAt).toBe(1111)
  })

  it('refreshes updatedAt on every save', () => {
    const { result } = renderHook(() => useBingoCards())
    const before = Date.now()
    act(() => { result.current.saveCard(makeCard({ updatedAt: 0 })) })
    const after = Date.now()

    expect(result.current.cards[0].updatedAt).toBeGreaterThanOrEqual(before)
    expect(result.current.cards[0].updatedAt).toBeLessThanOrEqual(after)
  })

  it('appends a second card without removing the first', () => {
    const { result } = renderHook(() => useBingoCards())
    act(() => { result.current.saveCard(makeCard({ id: 'a' })) })
    act(() => { result.current.saveCard(makeCard({ id: 'b' })) })

    expect(result.current.cards).toHaveLength(2)
  })
})

describe('useBingoCards — deleteCard', () => {
  it('removes the card with the given id', () => {
    const { result } = renderHook(() => useBingoCards())
    act(() => { result.current.saveCard(makeCard({ id: 'keep' })) })
    act(() => { result.current.saveCard(makeCard({ id: 'remove' })) })
    act(() => { result.current.deleteCard('remove') })

    expect(result.current.cards).toHaveLength(1)
    expect(result.current.cards[0].id).toBe('keep')
  })

  it('persists the deletion to localStorage', () => {
    const { result } = renderHook(() => useBingoCards())
    act(() => { result.current.saveCard(makeCard({ id: 'gone' })) })
    act(() => { result.current.deleteCard('gone') })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as BingoCard[]
    expect(stored).toHaveLength(0)
  })

  it('is a no-op for an unknown id', () => {
    const { result } = renderHook(() => useBingoCards())
    act(() => { result.current.saveCard(makeCard({ id: 'real' })) })
    act(() => { result.current.deleteCard('does-not-exist') })

    expect(result.current.cards).toHaveLength(1)
  })
})

describe('useBingoCards — duplicateCard', () => {
  it('creates a copy with a different id', () => {
    const { result } = renderHook(() => useBingoCards())
    act(() => { result.current.saveCard(makeCard({ id: 'original' })) })
    act(() => { result.current.duplicateCard('original') })

    expect(result.current.cards).toHaveLength(2)
    expect(result.current.cards[1].id).not.toBe('original')
  })

  it('appends " Copy" to the name', () => {
    const { result } = renderHook(() => useBingoCards())
    act(() => { result.current.saveCard(makeCard({ id: 'src', name: 'My Card' })) })
    act(() => { result.current.duplicateCard('src') })

    expect(result.current.cards[1].name).toBe('My Card Copy')
  })

  it('copies the cells from the source card', () => {
    const cells = [makeCell({ id: '0', content: 'Hello' })]
    const { result } = renderHook(() => useBingoCards())
    act(() => { result.current.saveCard(makeCard({ id: 'src', size: 1, cells })) })
    act(() => { result.current.duplicateCard('src') })

    expect(result.current.cards[1].cells[0].content).toBe('Hello')
  })

  it('is a no-op for an unknown id', () => {
    const { result } = renderHook(() => useBingoCards())
    act(() => { result.current.duplicateCard('nope') })
    expect(result.current.cards).toHaveLength(0)
  })
})

describe('useBingoCards — normalizeCard (migration)', () => {
  it('converts old string-array cells to BingoCell objects', () => {
    const oldCard = {
      id: 'old',
      name: 'Legacy',
      size: 3,
      freeSpace: false,
      cells: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
      createdAt: 500,
      updatedAt: 500,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([oldCard]))

    const { result } = renderHook(() => useBingoCards())
    const cells = result.current.cards[0].cells

    expect(cells[0]).toMatchObject({ id: '0', content: 'A', isFree: false })
    expect(cells[8]).toMatchObject({ id: '8', content: 'I', isFree: false })
  })

  it('marks the center cell as free when freeSpace is true in old format', () => {
    const center = centerIndex(3) // 4
    const oldCard = {
      id: 'old-free',
      name: 'Legacy Free',
      size: 3,
      freeSpace: true,
      cells: ['A', 'B', 'C', 'D', 'FREE', 'F', 'G', 'H', 'I'],
      createdAt: 500,
      updatedAt: 500,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([oldCard]))

    const { result } = renderHook(() => useBingoCards())
    const cells = result.current.cards[0].cells

    expect(cells[center].isFree).toBe(true)
    expect(cells[center].content).toBe('')  // free cell content is cleared
    expect(cells[0].isFree).toBe(false)
  })

  it('backfills missing createdAt / updatedAt with current time', () => {
    const cardWithoutTimestamps = {
      id: 'notimestamp',
      name: 'Old',
      size: 2,
      freeSpace: false,
      cells: ['A', 'B', 'C', 'D'],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([cardWithoutTimestamps]))

    const before = Date.now()
    const { result } = renderHook(() => useBingoCards())
    const after = Date.now()

    const { createdAt, updatedAt } = result.current.cards[0]
    expect(createdAt).toBeGreaterThanOrEqual(before)
    expect(createdAt).toBeLessThanOrEqual(after)
    expect(updatedAt).toBeGreaterThanOrEqual(before)
    expect(updatedAt).toBeLessThanOrEqual(after)
  })
})
