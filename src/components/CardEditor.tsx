import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  TextInput,
  Textarea,
  Select,
  Checkbox,
  ColorInput,
  Button,
  Group,
  Stack,
  Title,
  Text,
  Paper,
  SimpleGrid,
  Divider,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { BingoGrid } from '@/components/BingoGrid'
import { useBingoCards } from '@/hooks/useBingoCards'
import { centerIndex, DEFAULT_COLORS, type BingoCard, type BingoCell } from '@/types/bingo'

const SIZE_OPTIONS = ['2', '3', '4', '5', '6', '7']
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i

// Maximum possible grid positions (7×7). The buffer is always this size so
// no content is ever lost when the grid shrinks or free-space is toggled.
const BUFFER_SIZE = 49

// Build a gridSlots array: each entry maps a grid position to a contentBuffer
// slot index. When a free space is present, positions after fp each map to
// (i - 1) because the free cell consumes no textarea line.
function makeSlots(size: number, hasFree: boolean, fp: number): number[] {
  const slots = Array.from({ length: BUFFER_SIZE }, (_, i) => i)
  if (hasFree) {
    for (let i = fp + 1; i < size * size; i++) {
      slots[i] = i - 1
    }
  }
  return slots
}

interface CardEditorProps {
  initialCard?: BingoCard
}

export function CardEditor({ initialCard }: CardEditorProps) {
  const navigate = useNavigate()
  const { saveCard } = useBingoCards()

  const [name, setName] = useState(initialCard?.name ?? '')
  const [nameError, setNameError] = useState('')
  const [size, setSize] = useState(initialCard?.size ?? 5)
  const [freeSpace, setFreeSpace] = useState(initialCard?.freeSpace ?? true)
  const [useCustomFreeLabel, setUseCustomFreeLabel] = useState(
    () => !!initialCard?.freeSpaceLabel,
  )
  const [customFreeLabel, setCustomFreeLabel] = useState(
    () => initialCard?.freeSpaceLabel ?? '',
  )

  const [primaryColor, setPrimaryColor] = useState(
    () => initialCard?.colors?.primary ?? DEFAULT_COLORS.primary,
  )
  const [freeSpaceColor, setFreeSpaceColor] = useState(
    () => initialCard?.colors?.freeSpace ?? DEFAULT_COLORS.freeSpace,
  )
  const [backgroundColor, setBackgroundColor] = useState(
    () => initialCard?.colors?.background ?? DEFAULT_COLORS.background,
  )

  // Content stored in textarea-input order (slot 0 = first line, slot 1 = second
  // line, …). Dragging in the grid never touches this buffer, so the textarea
  // order is always preserved across rearrangements.
  const [contentBuffer, setContentBuffer] = useState<string[]>(() => {
    const buf = Array<string>(BUFFER_SIZE).fill('')
    if (initialCard) {
      let slot = 0
      initialCard.cells.forEach((cell) => {
        if (!cell.isFree) buf[slot++] = cell.content
      })
    }
    return buf
  })

  // Which grid position holds the free space. Tracked independently of
  // contentBuffer so the content at that position is always preserved.
  const [freePos, setFreePos] = useState<number>(() => {
    if (initialCard?.freeSpace) {
      const fi = initialCard.cells.findIndex((c) => c.isFree)
      return fi !== -1 ? fi : centerIndex(initialCard.size)
    }
    return centerIndex(initialCard?.size ?? 5)
  })

  // Maps each grid position to a contentBuffer slot. Dragging swaps two
  // entries here without touching contentBuffer, so the textarea is unaffected.
  const [gridSlots, setGridSlots] = useState<number[]>(() => {
    if (initialCard) {
      const fi = initialCard.freeSpace
        ? initialCard.cells.findIndex((c) => c.isFree)
        : -1
      const fp = fi !== -1 ? fi : centerIndex(initialCard.size)
      return makeSlots(initialCard.size, initialCard.freeSpace, fp)
    }
    // New card defaults: size=5, freeSpace=true, freePos=centerIndex(5)
    return makeSlots(5, true, centerIndex(5))
  })

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  // Cells passed to BingoGrid — each grid position reads its content via
  // gridSlots so dragging only affects the visual layout, not the buffer.
  const cells = useMemo<BingoCell[]>(
    () =>
      Array.from({ length: size * size }, (_, i) => ({
        id: String(i),
        content: contentBuffer[gridSlots[i]] ?? '',
        isFree: freeSpace && i === freePos,
      })),
    [size, contentBuffer, gridSlots, freePos, freeSpace],
  )

  // Textarea shows exactly totalContent lines in buffer order — unaffected by
  // grid rearrangements.
  const totalContent = size * size - (freeSpace ? 1 : 0)
  const { textareaValue, filledCount } = useMemo(() => {
    const lines = Array.from({ length: totalContent }, (_, j) => contentBuffer[j] ?? '')
    return {
      textareaValue: lines.join('\n'),
      filledCount: lines.filter((s) => s.trim() !== '').length,
    }
  }, [contentBuffer, totalContent])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleSizeChange(val: string | null) {
    if (!val) return
    const newSize = parseInt(val, 10)
    const newFreePos =
      freeSpace && freePos >= newSize * newSize ? centerIndex(newSize) : freePos
    if (newFreePos !== freePos) setFreePos(newFreePos)
    setGridSlots(makeSlots(newSize, freeSpace, newFreePos))
    setSize(newSize)
  }

  function handleFreeSpaceChange(checked: boolean) {
    setFreeSpace(checked)
    if (checked) {
      // The gap slot is always size²-1: toggle-off assigns it to gridSlots[freePos],
      // and swaps only permute values so the gap slot stays in the active range but
      // may migrate to a different grid position after rearrangement.
      // We must put the free space at whichever position currently holds the gap slot
      // so that (a) the invariant is restored and (b) the correct buffer entry
      // (the one beyond totalContent after the shrink) becomes the free cell.
      const gapSlot = size * size - 1
      const gapPos = gridSlots.findIndex((s) => s === gapSlot)
      setFreePos(gapPos !== -1 ? gapPos : centerIndex(size))
      // Do NOT reset gridSlots — the existing slot assignments for all
      // non-free positions are still valid and preserve the current arrangement.
    } else {
      // Removing the free space: give the formerly-free cell the one slot in
      // [0..size²-1] that is not held by any other position, so every grid
      // position ends up with a unique slot assignment. There is always exactly
      // one such gap: non-free positions hold size²-1 unique values, leaving
      // precisely one slot unoccupied regardless of prior toggle history.
      setGridSlots((prev) => {
        const next = [...prev]
        const used = new Set<number>()
        for (let i = 0; i < size * size; i++) {
          if (i !== freePos) used.add(next[i])
        }
        let gap = 0
        while (used.has(gap)) gap++
        next[freePos] = gap
        return next
      })
    }
  }

  function handleTextareaChange(value: string) {
    const lines = value.split('\n')
    setContentBuffer((prev) => {
      const next = [...prev]
      // Write exactly totalContent slots: update present lines, clear any
      // trailing slots that are missing from value (guards against edge cases
      // where the controlled textarea receives fewer lines than expected).
      for (let j = 0; j < totalContent; j++) {
        next[j] = lines[j] ?? ''
      }
      return next
    })
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    const { selectionStart: start, selectionEnd: end, value } = el
    const hasSelection = start !== end

    if (e.key === 'Enter') {
      e.preventDefault()
      const nextNewline = value.indexOf('\n', start)
      if (nextNewline === -1) {
        // Last line — wrap to end of first line
        const firstLineEnd = value.indexOf('\n')
        const pos = firstLineEnd === -1 ? value.length : firstLineEnd
        el.setSelectionRange(pos, pos)
      } else {
        // Move to end of next line
        const lineEnd = value.indexOf('\n', nextNewline + 1)
        const pos = lineEnd === -1 ? value.length : lineEnd
        el.setSelectionRange(pos, pos)
      }
      return
    }

    // Printable character typed over a multi-line selection: insert the
    // character at the selection start and clear the selected lines while
    // preserving the newline count so cell positions stay intact.
    if (hasSelection && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const selected = value.slice(start, end)
      if (selected.includes('\n')) {
        e.preventDefault()
        const newlineCount = (selected.match(/\n/g) ?? []).length
        const newValue = value.slice(0, start) + e.key + '\n'.repeat(newlineCount) + value.slice(end)
        handleTextareaChange(newValue)
        requestAnimationFrame(() => el.setSelectionRange(start + 1, start + 1))
        return
      }
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selected = value.slice(start, end)
      if (hasSelection && selected.includes('\n')) {
        // Multi-line selection: clear the selected text but keep the same
        // number of newlines so every cell position stays intact.
        e.preventDefault()
        const newlineCount = (selected.match(/\n/g) ?? []).length
        const newValue = value.slice(0, start) + '\n'.repeat(newlineCount) + value.slice(end)
        handleTextareaChange(newValue)
        requestAnimationFrame(() => el.setSelectionRange(start, start))
        return
      }
      // No selection: prevent cursor merging across line boundaries.
      if (!hasSelection) {
        const atLineBoundary =
          e.key === 'Backspace'
            ? start === 0 || value[start - 1] === '\n'
            : start === value.length || value[start] === '\n'
        if (atLineBoundary) e.preventDefault()
      }
    }
  }

  // Cut with a multi-line selection: copy to clipboard and clear the selected
  // lines while keeping the same number of newlines so cell positions are intact.
  function handleTextareaCut(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    const { selectionStart: start, selectionEnd: end, value } = el
    const selected = value.slice(start, end)
    if (!selected.includes('\n')) return // let browser handle single-line cut
    e.preventDefault()
    e.clipboardData.setData('text/plain', selected)
    const newlineCount = (selected.match(/\n/g) ?? []).length
    const newValue = value.slice(0, start) + '\n'.repeat(newlineCount) + value.slice(end)
    handleTextareaChange(newValue)
    requestAnimationFrame(() => el.setSelectionRange(start, start))
  }

  // Paste: strip newlines from pasted text (each cell is a single line).
  // If the current selection spans multiple lines, clear those lines first
  // (preserving the newline count) then insert the pasted text.
  function handleTextareaPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    e.preventDefault()
    const el = e.currentTarget
    const { selectionStart: start, selectionEnd: end, value } = el
    const pasteText = e.clipboardData.getData('text').replace(/[\r\n]+/g, ' ').trim()
    const selected = value.slice(start, end)
    let newValue: string
    let cursorPos: number
    if (selected.includes('\n')) {
      const newlineCount = (selected.match(/\n/g) ?? []).length
      newValue = value.slice(0, start) + pasteText + '\n'.repeat(newlineCount) + value.slice(end)
      cursorPos = start + pasteText.length
    } else {
      newValue = value.slice(0, start) + pasteText + value.slice(end)
      cursorPos = start + pasteText.length
    }
    handleTextareaChange(newValue)
    requestAnimationFrame(() => el.setSelectionRange(cursorPos, cursorPos))
  }

  // Called by BingoGrid when the user swaps two cells by dragging.
  // Only gridSlots is updated — contentBuffer (and therefore the textarea) is
  // left completely unchanged.
  function handleSwap(oldPos: number, newPos: number) {
    setGridSlots((prev) => {
      const next = [...prev]
      ;[next[oldPos], next[newPos]] = [next[newPos], next[oldPos]]
      return next
    })
    if (freeSpace) {
      if (oldPos === freePos) setFreePos(newPos)
      else if (newPos === freePos) setFreePos(oldPos)
    }
  }

  function handleRandomize() {
    setGridSlots((prev) => {
      const next = [...prev]
      const positions = Array.from({ length: size * size }, (_, i) => i).filter(
        (i) => !(freeSpace && i === freePos),
      )
      // Fisher-Yates shuffle of the slot values at the active positions.
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[next[positions[i]], next[positions[j]]] = [next[positions[j]], next[positions[i]]]
      }
      return next
    })
  }

  // True when the current state differs from what was loaded (or from the blank
  // defaults for a new card). Drives the Cancel confirmation dialog.
  const isDirty = useMemo(() => {
    const initialName = initialCard?.name ?? ''
    const initialSize = initialCard?.size ?? 5
    const initialFreeSpace = initialCard?.freeSpace ?? true
    if (name !== initialName || size !== initialSize || freeSpace !== initialFreeSpace) return true
    const effectiveLabel = useCustomFreeLabel ? (customFreeLabel.trim() || 'FREE') : 'FREE'
    const initialLabel = initialCard?.freeSpaceLabel || 'FREE'
    if (effectiveLabel !== initialLabel) return true
    if (primaryColor !== (initialCard?.colors?.primary ?? DEFAULT_COLORS.primary)) return true
    if (freeSpaceColor !== (initialCard?.colors?.freeSpace ?? DEFAULT_COLORS.freeSpace)) return true
    if (backgroundColor !== (initialCard?.colors?.background ?? DEFAULT_COLORS.background)) return true
    return cells.some((cell, i) => {
      const orig = initialCard?.cells[i]
      return cell.content !== (orig?.content ?? '') || cell.isFree !== (orig?.isFree ?? false)
    })
  }, [name, size, freeSpace, useCustomFreeLabel, customFreeLabel, primaryColor, freeSpaceColor, backgroundColor, cells, initialCard])

  function handleCancel() {
    if (!isDirty) {
      void navigate({ to: '/' })
      return
    }
    modals.openConfirmModal({
      title: 'Discard changes?',
      children: <Text size="sm">Your unsaved changes will be lost.</Text>,
      labels: { confirm: 'Discard changes', cancel: 'Keep editing' },
      confirmProps: { color: 'red' },
      onConfirm: () => void navigate({ to: '/' }),
    })
  }

  function handleSave() {
    if (!name.trim()) {
      setNameError('Card name is required')
      return
    }
    setNameError('')
    const now = Date.now()
    const card: BingoCard = {
      id: initialCard?.id ?? crypto.randomUUID(),
      name: name.trim(),
      size,
      freeSpace,
      freeSpaceLabel:
        useCustomFreeLabel && customFreeLabel.trim() ? customFreeLabel.trim() : undefined,
      colors: {
        primary: HEX_COLOR_RE.test(primaryColor) ? primaryColor : DEFAULT_COLORS.primary,
        freeSpace: HEX_COLOR_RE.test(freeSpaceColor) ? freeSpaceColor : DEFAULT_COLORS.freeSpace,
        background: HEX_COLOR_RE.test(backgroundColor) ? backgroundColor : DEFAULT_COLORS.background,
      },
      cells,
      createdAt: initialCard?.createdAt ?? now,
      updatedAt: now,
    }
    saveCard(card)
    void navigate({ to: '/' })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Stack gap="xl">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>{initialCard ? 'Edit Card' : 'New Bingo Card'}</Title>
          <Text c="dimmed" size="sm" mt={2}>
            {filledCount} / {totalContent} cells filled
          </Text>
        </div>
        <Group gap="sm">
          <Button variant="default" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Card</Button>
        </Group>
      </Group>

      <Divider />

      {/* Settings row */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <TextInput
          label="Card Name"
          placeholder="My Bingo Card"
          required
          value={name}
          onChange={(e) => {
            setName(e.currentTarget.value)
            if (e.currentTarget.value.trim()) setNameError('')
          }}
          error={nameError}
        />
        <Select
          label="Grid Size"
          description="Rows × columns"
          data={SIZE_OPTIONS}
          value={String(size)}
          onChange={handleSizeChange}
          allowDeselect={false}
        />
        <Checkbox
          label="Include free space"
          checked={freeSpace}
          onChange={(e) => handleFreeSpaceChange(e.currentTarget.checked)}
          mt={{ base: 0, sm: 22 }}
        />
      </SimpleGrid>

      {freeSpace && (
        <Group gap="sm" align="center">
          <Checkbox
            label="Custom Free Space"
            checked={useCustomFreeLabel}
            onChange={(e) => setUseCustomFreeLabel(e.currentTarget.checked)}
          />
          {useCustomFreeLabel && (
            <TextInput
              placeholder="FREE"
              value={customFreeLabel}
              onChange={(e) => setCustomFreeLabel(e.currentTarget.value)}
              aria-label="Free space text"
              style={{ width: 200 }}
            />
          )}
        </Group>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <ColorInput
          label="Text & Lines"
          description="Cell text, title, grid lines"
          format="hex"
          value={primaryColor}
          onChange={setPrimaryColor}
        />
        <ColorInput
          label="Free Space"
          description="Free space cell background"
          format="hex"
          value={freeSpaceColor}
          onChange={setFreeSpaceColor}
        />
        <ColorInput
          label="Background"
          description="Cell background"
          format="hex"
          value={backgroundColor}
          onChange={setBackgroundColor}
        />
      </SimpleGrid>

      <Group gap="sm">
        <Button
          variant="default"
          size="xs"
          onClick={() => {
            setPrimaryColor(DEFAULT_COLORS.primary)
            setFreeSpaceColor(DEFAULT_COLORS.freeSpace)
            setBackgroundColor(DEFAULT_COLORS.background)
          }}
        >
          Reset Colors
        </Button>
        <Button
          variant="default"
          size="xs"
          onClick={() => setFreeSpaceColor(primaryColor)}
        >
          Sync Free Space Color
        </Button>
      </Group>

      <Divider />

      {/* Main two-column layout */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        {/* Left: textarea */}
        <Paper withBorder p="md" radius="md">
          <Title order={5} mb={4}>
            Cell Content
          </Title>
          <Text size="xs" c="dimmed" mb="md">
            One entry per line — {totalContent} spaces available
          </Text>
          <Textarea
            value={textareaValue}
            onChange={(e) => handleTextareaChange(e.currentTarget.value)}
            onKeyDown={handleTextareaKeyDown}
            onCut={handleTextareaCut}
            onPaste={handleTextareaPaste}
            autosize
            minRows={totalContent}
            maxRows={totalContent}
            styles={{
              input: {
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: '1.6',
                resize: 'none',
              },
            }}
          />
        </Paper>

        {/* Right: live preview */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="center" mb="md">
            <Title order={5}>Preview — drag to rearrange</Title>
            <Button variant="default" size="xs" onClick={handleRandomize}>
              Randomize
            </Button>
          </Group>
          <BingoGrid
            cells={cells}
            size={size}
            onSwap={handleSwap}
            freeSpaceLabel={useCustomFreeLabel ? (customFreeLabel || 'FREE') : undefined}
            colors={{ primary: primaryColor, freeSpace: freeSpaceColor, background: backgroundColor }}
          />
        </Paper>
      </SimpleGrid>
    </Stack>
  )
}
