import { useNavigate } from '@tanstack/react-router'
import { Modal, Group, Stack, Text, Button, Divider, Title, SimpleGrid } from '@mantine/core'
import { modals } from '@mantine/modals'
import { BingoGrid } from '@/components/BingoGrid'
import { exportCardAsJpeg } from '@/utils/exportCardImage'
import type { BingoCard } from '@/types/bingo'

interface CardDetailModalProps {
  card: BingoCard | null
  onClose: () => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function CardDetailModal({ card, onClose, onDelete, onDuplicate }: CardDetailModalProps) {
  const navigate = useNavigate()

  function handleEdit() {
    if (!card) return
    onClose()
    void navigate({ to: '/edit/$cardId', params: { cardId: card.id } })
  }

  function handleDelete() {
    if (!card) return
    modals.openConfirmModal({
      title: 'Delete card?',
      children: (
        <Text size="sm">
          &ldquo;{card.name}&rdquo; will be permanently deleted. This cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        onDelete(card.id)
        onClose()
      },
    })
  }

  function handleDuplicate() {
    if (!card) return
    onDuplicate(card.id)
    onClose()
  }

  function handleExport() {
    if (!card) return
    exportCardAsJpeg(card)
  }

  // Show "Last edited" only when meaningfully different from creation date
  const showEdited = card ? card.updatedAt - card.createdAt > 60_000 : false

  return (
    <Modal
      opened={card !== null}
      onClose={onClose}
      title={card ? <Title order={4}>{card.name}</Title> : null}
      size="xl"
      centered
    >
      {card && (
        <Stack gap="md">
          {/* Grid preview — constrain width so height (≈ width for a square grid)
              never pushes the metadata and actions below the fold. */}
          <div style={{ width: 'min(100%, 55vh)', margin: '0 auto' }}>
            <BingoGrid cells={card.cells} size={card.size} freeSpaceLabel={card.freeSpaceLabel} colors={card.colors} tableStyle />
          </div>

          {/* Metadata */}
          <SimpleGrid cols={showEdited ? 2 : 1} spacing="xs">
            <Text size="sm" c="dimmed">
              Created {formatDate(card.createdAt)}
            </Text>
            {showEdited && (
              <Text size="sm" c="dimmed">
                Last edited {formatDate(card.updatedAt)}
              </Text>
            )}
          </SimpleGrid>

          <Divider />

          {/* Actions */}
          <Group justify="space-between">
            <Group gap="sm">
              <Button onClick={handleEdit}>Edit</Button>
              <Button variant="default" onClick={handleDuplicate}>
                Duplicate
              </Button>
            </Group>
            <Group gap="sm">
              <Button variant="default" onClick={handleExport}>
                Export Image
              </Button>
              <Button color="red" variant="light" onClick={handleDelete}>
                Delete
              </Button>
            </Group>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}
