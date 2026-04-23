# Bingo Crafter

A tool for designing custom goal-oriented bingo boards for content creators and beyond. Create, customise, and export bingo cards with configurable grid sizes, colours, and cell content. Everything is saved locally in your browser with no account or server required.

---

## Features

### Card management
- **Create** bingo cards with a name, grid size, and cell content
- **Edit** any saved card — changes are reflected live in the preview
- **Duplicate** a card to use it as a starting point for a new one
- **Delete** cards with a confirmation prompt

### Grid configuration
- **Grid sizes** from 2×2 to 7×7
- **Free space** - optional center cell with a configurable label (defaults to `FREE`)
- **Custom free space label** - set any text for the free space cell

### Cell content
- Enter one item per line in the text editor; the grid updates instantly
- **Drag and drop** cells in the live preview to rearrange them
- **Randomize** button shuffles all non-free cells at once
- The free space stays fixed in its position during rearrangement

### Colour customisation
- **Text & Lines** - controls cell text, the card title, and grid lines
- **Free Space** - background colour of the free space cell
- **Background** - background colour of regular cells
- **Reset Colors** restores all three to the defaults
- **Sync Free Space Color** copies the Text & Lines colour to the Free Space colour

### Export
- **Export Image** downloads the card as a JPEG at 1080px tall
- The title is rendered in all caps above the grid
- Font sizes in the export match what you see in the preview

---

## Usage

### Creating a card
1. Click **+ New Card** on the home screen
2. Enter a card name and choose a grid size
3. Optionally enable a free space and customise its label
4. Type cell content in the text editor - one entry per line
5. Drag cells in the preview to arrange them, or click **Randomize**
6. Adjust colours if desired
7. Click **Save Card**

### Editing a card
Click any card thumbnail on the home screen to open its detail view, then click **Edit**.

### Exporting a card
Open the card detail view (click a thumbnail) and click **Export Image**. The file downloads as a JPEG named after the card.

### Duplicating a card
Open the card detail view and click **Duplicate**. A copy named `<original name> Copy` is added to your collection.

---

## Data storage

Cards are saved to `localStorage` under the key `bingo-crafter-cards`. Clearing your browser's site data will remove all saved cards. There is no cloud sync or export/import for the card data itself.

---

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
npm install
```

### Run locally
```bash
npm run dev
```

### Run tests
```bash
npm test
```

### Build
```bash
npm run build
```

### Tech stack
- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) - build tool
- [Mantine](https://mantine.dev/) - UI components
- [TanStack Router](https://tanstack.com/router) - client-side routing
- [dnd-kit](https://dndkit.com/) - drag and drop
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) - unit tests
