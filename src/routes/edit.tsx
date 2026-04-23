import { useParams, useNavigate } from '@tanstack/react-router'
import { Container, Title, Text, Button, Stack } from '@mantine/core'
import { CardEditor } from '@/components/CardEditor'
import { useBingoCards } from '@/hooks/useBingoCards'

export function EditComponent() {
  const { cardId } = useParams({ from: '/edit/$cardId' })
  const { cards } = useBingoCards()
  const navigate = useNavigate()
  const card = cards.find((c) => c.id === cardId)

  if (!card) {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" gap="md">
          <Title order={3}>Card not found</Title>
          <Text c="dimmed">This card doesn't exist or was deleted.</Text>
          <Button onClick={() => void navigate({ to: '/' })}>Back to Cards</Button>
        </Stack>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <CardEditor initialCard={card} />
    </Container>
  )
}
