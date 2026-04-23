import { Text, UnstyledButton } from '@mantine/core'
import { BingoGrid } from '@/components/BingoGrid'
import type { BingoCard } from '@/types/bingo'
import classes from './CardThumbnail.module.css'

interface CardThumbnailProps {
  card: BingoCard
  onClick: () => void
}

export function CardThumbnail({ card, onClick }: CardThumbnailProps) {
  return (
    <UnstyledButton
      className={classes.wrapper}
      onClick={onClick}
      aria-label={`View ${card.name}`}
    >
      <div className={classes.grid}>
        <BingoGrid cells={card.cells} size={card.size} freeSpaceLabel={card.freeSpaceLabel} colors={card.colors} tableStyle small />
      </div>
      <Text size="sm" fw={500} ta="center" mt={8} lineClamp={2}>
        {card.name}
      </Text>
    </UnstyledButton>
  )
}
