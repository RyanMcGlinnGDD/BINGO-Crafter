import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Center,
  ThemeIcon,
} from '@mantine/core'
import { CardThumbnail } from '@/components/CardThumbnail'
import { CardDetailModal } from '@/components/CardDetailModal'
import { useBingoCards } from '@/hooks/useBingoCards'
import type { BingoCard } from '@/types/bingo'

function EmptyState() {
  const navigate = useNavigate()
  return (
    <Center py={80}>
      <Stack align="center" gap="md" maw={360}>
        <ThemeIcon size={64} radius="xl" variant="light" color="violet">
          <svg
            viewBox="0 0 24 24"
            width="32"
            height="32"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </ThemeIcon>
        <Title order={3} ta="center">
          No bingo cards yet
        </Title>
        <Text c="dimmed" ta="center" size="sm">
          Create your first bingo card to get started. You can customise the grid size, add a free
          space, and fill in your content.
        </Text>
        <Button size="md" onClick={() => void navigate({ to: '/create' })}>
          Create your first card
        </Button>
      </Stack>
    </Center>
  )
}

export function IndexComponent() {
  const navigate = useNavigate()
  const { cards, deleteCard, duplicateCard } = useBingoCards()
  const [selectedCard, setSelectedCard] = useState<BingoCard | null>(null)

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" align="center" mb="xl">
        <div>
          <Title order={1}>Bingo Crafter</Title>
          <Text c="dimmed" size="sm" mt={2}>
            Your bingo card collection
          </Text>
        </div>
        <Button onClick={() => void navigate({ to: '/create' })}>+ New Card</Button>
      </Group>

      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          {cards.map((card) => (
            <CardThumbnail key={card.id} card={card} onClick={() => setSelectedCard(card)} />
          ))}
        </div>
      )}

      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onDelete={deleteCard}
        onDuplicate={duplicateCard}
      />
    </Container>
  )
}
