import Phaser from 'phaser';
import { Room, DungeonData } from './DungeonGenerator';
import { TILE_SIZE } from '../utils/constants';
import { Player } from '../entities/Player';
import { RoomManager, RoomState } from './RoomManager';

export enum HazardType {
  SPIKE_TRAP = 'spike_trap',
  LAVA_PIT = 'lava_pit',
  ARROW_SHOOTER = 'arrow_shooter',
}

interface SpikeTrap {
  sprite: Phaser.GameObjects.Sprite;
  isActive: boolean;
  timer: number;
  activeDuration: number;
  inactiveDuration: number;
}

interface LavaPit {
  sprite: Phaser.GameObjects.Sprite;
  damageTimer: number;
}

interface ArrowShooter {
  sprite: Phaser.GameObjects.Sprite;
  direction: { x: number; y: number };
  fireTimer: number;
  fireRate: number;
  roomId: number;
}

export class HazardSystem {
  private scene: Phaser.Scene;
  private spikeTraps: SpikeTrap[] = [];
  private lavaPits: LavaPit[] = [];
  private arrowShooters: ArrowShooter[] = [];
  private arrowGroup: Phaser.Physics.Arcade.Group;
  private player: Player;
  private floor: number;
  private roomManager: RoomManager | null = null;

  // Damage values
  private readonly SPIKE_DAMAGE = 10;
  private readonly LAVA_DAMAGE_PER_TICK = 5;
  private readonly ARROW_DAMAGE = 8;

  constructor(scene: Phaser.Scene, player: Player, floor: number) {
    this.scene = scene;
    this.player = player;
    this.floor = floor;
    this.arrowGroup = scene.physics.add.group();
  }

  setRoomManager(roomManager: RoomManager): void {
    this.roomManager = roomManager;
  }

  spawnHazardsInRoom(room: Room, dungeonData: DungeonData): void {
    // Don't spawn hazards in spawn room (room 0)
    if (room.id === 0) return;

    // Chance to spawn each hazard type increases with floor
    const hazardChance = Math.min(0.4 + this.floor * 0.02, 0.7);

    // Spike traps (floor hazards)
    if (Math.random() < hazardChance) {
      const spikeCount = Math.floor(Math.random() * 3) + 1;
      this.spawnSpikeTraps(room, spikeCount);
    }

    // Lava pits (floor hazards, less common)
    if (Math.random() < hazardChance * 0.5 && this.floor >= 3) {
      const lavaCount = Math.floor(Math.random() * 2) + 1;
      this.spawnLavaPits(room, lavaCount);
    }

    // Arrow shooters (wall hazards)
    if (Math.random() < hazardChance * 0.6 && this.floor >= 2) {
      this.spawnArrowShooters(room, dungeonData);
    }
  }

  private spawnSpikeTraps(room: Room, count: number): void {
    for (let i = 0; i < count; i++) {
      // Random position inside room (not on edges)
      const x = room.x + 2 + Math.floor(Math.random() * (room.width - 4));
      const y = room.y + 2 + Math.floor(Math.random() * (room.height - 4));

      const worldX = x * TILE_SIZE + TILE_SIZE / 2;
      const worldY = y * TILE_SIZE + TILE_SIZE / 2;

      const sprite = this.scene.add.sprite(worldX, worldY, 'spike_trap');
      sprite.setDepth(1);

      // Randomize initial state and timing
      const isActive = Math.random() < 0.3;
      const activeDuration = 800 + Math.random() * 400;
      const inactiveDuration = 1500 + Math.random() * 1000;

      sprite.setTexture(isActive ? 'spike_trap_active' : 'spike_trap');

      this.spikeTraps.push({
        sprite,
        isActive,
        timer: 0,
        activeDuration,
        inactiveDuration,
      });
    }
  }

  private spawnLavaPits(room: Room, count: number): void {
    for (let i = 0; i < count; i++) {
      // Random position inside room
      const x = room.x + 2 + Math.floor(Math.random() * (room.width - 4));
      const y = room.y + 2 + Math.floor(Math.random() * (room.height - 4));

      const worldX = x * TILE_SIZE + TILE_SIZE / 2;
      const worldY = y * TILE_SIZE + TILE_SIZE / 2;

      const sprite = this.scene.add.sprite(worldX, worldY, 'lava_pit');
      sprite.setDepth(1);

      // Add bubbling animation
      this.scene.tweens.add({
        targets: sprite,
        scaleX: 1.05,
        scaleY: 0.95,
        duration: 500 + Math.random() * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.lavaPits.push({
        sprite,
        damageTimer: 0,
      });
    }
  }

  private spawnArrowShooters(room: Room, dungeonData: DungeonData): void {
    const tiles = dungeonData.tiles;

    // Try to place 1-2 arrow shooters on walls
    const attempts = 2;
    let placed = 0;

    for (let i = 0; i < attempts * 10 && placed < attempts; i++) {
      // Pick a random wall adjacent to the room
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;
      let direction: { x: number; y: number };

      switch (side) {
        case 0: // Top wall, shoots down
          x = room.x + 1 + Math.floor(Math.random() * (room.width - 2));
          y = room.y - 1;
          direction = { x: 0, y: 1 };
          break;
        case 1: // Bottom wall, shoots up
          x = room.x + 1 + Math.floor(Math.random() * (room.width - 2));
          y = room.y + room.height;
          direction = { x: 0, y: -1 };
          break;
        case 2: // Left wall, shoots right
          x = room.x - 1;
          y = room.y + 1 + Math.floor(Math.random() * (room.height - 2));
          direction = { x: 1, y: 0 };
          break;
        default: // Right wall, shoots left
          x = room.x + room.width;
          y = room.y + 1 + Math.floor(Math.random() * (room.height - 2));
          direction = { x: -1, y: 0 };
          break;
      }

      // Check if this is actually a wall tile
      if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length && tiles[y][x] === 1) {
        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = y * TILE_SIZE + TILE_SIZE / 2;

        const sprite = this.scene.add.sprite(worldX, worldY, 'arrow_shooter');
        sprite.setDepth(3);

        // Rotate based on direction
        if (direction.x === 1) sprite.setAngle(0);
        else if (direction.x === -1) sprite.setAngle(180);
        else if (direction.y === 1) sprite.setAngle(90);
        else if (direction.y === -1) sprite.setAngle(-90);

        this.arrowShooters.push({
          sprite,
          direction,
          fireTimer: Math.random() * 2000, // Stagger initial shots
          fireRate: 2000 + Math.random() * 1000, // 2-3 seconds between shots
          roomId: room.id,
        });

        placed++;
      }
    }
  }

  update(delta: number): void {
    this.updateSpikeTraps(delta);
    this.updateLavaPits(delta);
    this.updateArrowShooters(delta);
    this.updateArrows();
  }

  private updateSpikeTraps(delta: number): void {
    for (const trap of this.spikeTraps) {
      trap.timer += delta;

      if (trap.isActive) {
        // Check for player collision
        if (this.isPlayerOnTile(trap.sprite.x, trap.sprite.y)) {
          this.damagePlayer(this.SPIKE_DAMAGE + this.floor, 'spike');
        }

        // Switch to inactive after duration
        if (trap.timer >= trap.activeDuration) {
          trap.isActive = false;
          trap.timer = 0;
          trap.sprite.setTexture('spike_trap');
        }
      } else {
        // Switch to active after duration
        if (trap.timer >= trap.inactiveDuration) {
          trap.isActive = true;
          trap.timer = 0;
          trap.sprite.setTexture('spike_trap_active');

          // Play sound
          this.scene.events.emit('hazardActivate', trap.sprite.x, trap.sprite.y);
        }
      }
    }
  }

  private updateLavaPits(delta: number): void {
    for (const lava of this.lavaPits) {
      lava.damageTimer += delta;

      // Check for player collision every 500ms
      if (this.isPlayerOnTile(lava.sprite.x, lava.sprite.y)) {
        if (lava.damageTimer >= 500) {
          this.damagePlayer(this.LAVA_DAMAGE_PER_TICK + Math.floor(this.floor / 2), 'lava');
          lava.damageTimer = 0;
        }
      }
    }
  }

  private updateArrowShooters(delta: number): void {
    for (const shooter of this.arrowShooters) {
      // Only fire if the room is still active (not cleared)
      if (this.roomManager) {
        const roomState = this.roomManager.getRoomState(shooter.roomId);
        if (roomState !== RoomState.ACTIVE) {
          continue; // Skip firing if room is cleared or unvisited
        }
      }

      shooter.fireTimer += delta;

      if (shooter.fireTimer >= shooter.fireRate) {
        shooter.fireTimer = 0;
        this.fireArrow(shooter);
      }
    }
  }

  private fireArrow(shooter: ArrowShooter): void {
    const arrow = this.arrowGroup.create(
      shooter.sprite.x + shooter.direction.x * TILE_SIZE,
      shooter.sprite.y + shooter.direction.y * TILE_SIZE,
      'arrow'
    ) as Phaser.Physics.Arcade.Sprite;

    arrow.setDepth(8);
    arrow.setData('damage', this.ARROW_DAMAGE + this.floor);

    // Set rotation based on direction
    const angle = Math.atan2(shooter.direction.y, shooter.direction.x) * (180 / Math.PI);
    arrow.setAngle(angle);

    // Set velocity
    const speed = 200;
    arrow.setVelocity(shooter.direction.x * speed, shooter.direction.y * speed);

    // Destroy after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      if (arrow.active) arrow.destroy();
    });
  }

  private updateArrows(): void {
    // Check arrow collisions with player
    this.arrowGroup.getChildren().forEach((child) => {
      const arrow = child as Phaser.Physics.Arcade.Sprite;
      if (!arrow.active) return;

      const dist = Phaser.Math.Distance.Between(
        arrow.x, arrow.y,
        this.player.x, this.player.y
      );

      if (dist < TILE_SIZE * 0.6) {
        const damage = arrow.getData('damage') || this.ARROW_DAMAGE;
        this.damagePlayer(damage, 'arrow');
        arrow.destroy();
      }
    });
  }

  private isPlayerOnTile(tileX: number, tileY: number): boolean {
    const dist = Phaser.Math.Distance.Between(
      tileX, tileY,
      this.player.x, this.player.y
    );
    return dist < TILE_SIZE * 0.6;
  }

  private lastDamageTime: number = 0;

  private damagePlayer(damage: number, source: string): void {
    if (this.player.getIsInvulnerable()) return;

    // Prevent damage spam (100ms cooldown)
    const now = Date.now();
    if (now - this.lastDamageTime < 100) return;
    this.lastDamageTime = now;

    this.player.takeDamage(damage);
    this.scene.events.emit('hazardDamage', damage, source);
  }

  getArrowGroup(): Phaser.Physics.Arcade.Group {
    return this.arrowGroup;
  }

  destroy(): void {
    for (const trap of this.spikeTraps) {
      trap.sprite.destroy();
    }
    for (const lava of this.lavaPits) {
      lava.sprite.destroy();
    }
    for (const shooter of this.arrowShooters) {
      shooter.sprite.destroy();
    }
    this.arrowGroup.clear(true, true);
  }
}
