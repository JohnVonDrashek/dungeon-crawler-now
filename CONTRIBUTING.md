# Contributing to Dungeon Crawler Now

First off, **thank you** for considering contributing! I truly believe in open source and the power of community collaboration. Unlike many repositories, I actively welcome contributions of all kinds - from bug fixes to new features.

## My Promise to Contributors

- **I will respond to every PR and issue** - I guarantee feedback on all contributions
- **Bug fixes are obvious accepts** - If it fixes a bug, it's getting merged
- **New features are welcome** - I'm genuinely open to new ideas and enhancements
- **Direct line of communication** - If I'm not responding to a PR or issue, email me directly at johnvondrashek@gmail.com

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/JohnVonDrashek/dungeon-crawler-now.git
cd dungeon-crawler-now

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:5173`.

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **[Phaser 3](https://phaser.io/)** - HTML5 game framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[Trystero](https://github.com/dmotz/trystero)** - WebRTC P2P multiplayer
- **[phaser3-rex-plugins](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/)** - UI components

## Project Structure

```
src/
├── entities/          # Player and enemy classes
├── scenes/            # Phaser scenes (Menu, Game, etc.)
├── systems/           # Game systems (Dungeon, Combat, Loot)
├── ui/                # UI components (Inventory, Minimap)
├── multiplayer/       # P2P networking (NetworkManager)
└── utils/             # Constants and utilities
```

## Dev Controls (for testing)

| Key | Action |
|-----|--------|
| `F1` | Toggle god mode |
| `F2` | Skip to next floor |
| `F3` | Jump to final boss (floor 20) |
| `F4` | Instant level up |
| `F5` | Spawn epic loot |
| `F6` | Kill all enemies |

## Areas Where Contributions Are Especially Welcome

- **New enemy types** - The game supports various enemy variants
- **New items/weapons** - The loot system is designed to be extensible
- **UI improvements** - Better inventory, stats screens, or HUD elements
- **Performance optimizations** - Especially for dungeon generation and rendering
- **Multiplayer features** - The P2P system can always be improved
- **Bug fixes** - Always appreciated!

## Code of Conduct

This project follows the [Rule of St. Benedict](CODE_OF_CONDUCT.md) as its code of conduct.

## Questions?

- Open an issue
- Email: johnvondrashek@gmail.com
