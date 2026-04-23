import { useState, useCallback } from 'react'
import type { BingoCard, BingoCell } from '@/types/bingo'
import { centerIndex } from '@/types/bingo'

const STORAGE_KEY = 'bingo-crafter-cards'

/** Ensure a card loaded from localStorage has the current BingoCard shape. */
function normalizeCard(raw: BingoCard): BingoCard {
  const now = Date.now()
  const cells: BingoCell[] = (raw.cells as unknown[]).map((cell, i) => {
    if (typeof cell === 'string') {
      // Old format: cells was string[]
      const isFree = raw.freeSpace && i === centerIndex(raw.size)
      return { id: String(i), content: isFree ? '' : cell, isFree }
    }
    const c = cell as Partial<BingoCell>
    return {
      id: c.id ?? String(i),
      content: c.content ?? '',
      isFree: c.isFree ?? false,
    }
  })
  return {
    ...raw,
    cells,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  }
}

function loadCards(): BingoCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as BingoCard[]).map(normalizeCard)
  } catch {
    return []
  }
}

function persistCards(cards: BingoCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
}

export function useBingoCards() {
  const [cards, setCards] = useState<BingoCard[]>(loadCards)

  const saveCard = useCallback((card: BingoCard) => {
    setCards((prev) => {
      const existing = prev.find((c) => c.id === card.id)
      const stamped: BingoCard = {
        ...card,
        // Preserve original createdAt; always refresh updatedAt
        createdAt: existing?.createdAt ?? card.createdAt,
        updatedAt: Date.now(),
      }
      const next = existing
        ? prev.map((c) => (c.id === card.id ? stamped : c))
        : [...prev, stamped]
      persistCards(next)
      return next
    })
  }, [])

  const deleteCard = useCallback((id: string) => {
    setCards((prev) => {
      const next = prev.filter((c) => c.id !== id)
      persistCards(next)
      return next
    })
  }, [])

  const duplicateCard = useCallback((id: string) => {
    setCards((prev) => {
      const source = prev.find((c) => c.id === id)
      if (!source) return prev
      const now = Date.now()
      const copy: BingoCard = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} Copy`,
        createdAt: now,
        updatedAt: now,
      }
      const next = [...prev, copy]
      persistCards(next)
      return next
    })
  }, [])

  return { cards, saveCard, deleteCard, duplicateCard }
}
