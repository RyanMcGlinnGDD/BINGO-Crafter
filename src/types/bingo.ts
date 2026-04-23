export interface BingoCell {
  id: string
  content: string
  isFree: boolean
}

export interface CardColors {
  primary: string    // title text, cell text, grid lines
  freeSpace: string  // free space cell background
  background: string // cell background
}

export const DEFAULT_COLORS: CardColors = {
  primary: '#000000',
  freeSpace: '#845ef7',
  background: '#ffffff',
}

export interface BingoCard {
  id: string
  name: string
  size: number
  freeSpace: boolean
  freeSpaceLabel?: string  // undefined / absent means 'FREE'
  colors?: CardColors
  cells: BingoCell[]
  createdAt: number
  updatedAt: number
}

export function centerIndex(size: number): number {
  return Math.floor((size * size) / 2)
}

