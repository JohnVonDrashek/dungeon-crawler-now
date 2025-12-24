# Dungeon Crawler Now

[![GitHub Pages](https://img.shields.io/badge/Play%20Now-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://johnvondrashek.github.io/dungeon-crawler-now/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.80-blueviolet?style=flat-square)](https://phaser.io/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/github/license/JohnVonDrashek/dungeon-crawler-now?style=flat-square)](LICENSE)

A roguelike action RPG dungeon crawler built with Phaser 3 and TypeScript. Battle through procedurally generated dungeons, defeat enemies, collect loot, and face challenging bosses every 5 floors.

## Features

- **Procedural Dungeon Generation** - Every run features unique room layouts and corridors
- **Room-Based Combat** - Doors seal when entering a room, enemies spawn with warning indicators
- **Fog of War** - Explore to reveal rooms and corridors
- **Multiple Enemy Types** - Basic, Fast, Tank, Ranged, and Boss enemies
- **Loot System** - Procedurally generated items with rarities (Common, Uncommon, Rare, Epic, Legendary)
- **Character Progression** - Level up and allocate stats (HP, Attack, Defense, Speed)
- **Boss Battles** - Face a boss every 5 floors, with the final boss on floor 20
- **Minimap** - Track your exploration in real-time
- **Save System** - Progress is saved between sessions

## Play Now

**[Play in your browser](https://johnvondrashek.github.io/dungeon-crawler-now/)**

## Controls

| Key | Action |
|-----|--------|
| `W` `A` `S` `D` | Move |
| `Left Click` | Attack (shoot projectile) |
| `Space` | Dodge roll |
| `E` | Open inventory |
| `L` | Open character stats / level up |
| `ESC` | Close menus |

### Dev Controls (for testing)

| Key | Action |
|-----|--------|
| `F1` | Toggle god mode |
| `F2` | Skip to next floor |
| `F3` | Jump to final boss (floor 20) |
| `F4` | Instant level up |
| `F5` | Spawn epic loot |
| `F6` | Kill all enemies |

## Development

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

## Project Structure

```
src/
├── entities/          # Player and enemy classes
│   ├── Player.ts
│   ├── Enemy.ts
│   └── enemies/       # Enemy type variants
├── scenes/            # Phaser scenes
│   ├── BootScene.ts   # Asset loading
│   ├── MenuScene.ts   # Main menu
│   ├── GameScene.ts   # Main gameplay
│   └── ...
├── systems/           # Game systems
│   ├── DungeonGenerator.ts
│   ├── RoomManager.ts
│   ├── CombatSystem.ts
│   ├── LootSystem.ts
│   └── ...
├── ui/                # UI components
│   ├── InventoryUI.ts
│   ├── MinimapUI.ts
│   └── LevelUpUI.ts
└── utils/             # Constants and utilities
```

## License

MIT

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/c351a20e10b1048d9bd99269b5b57664d1912a68.svg "Repobeats analytics image")
