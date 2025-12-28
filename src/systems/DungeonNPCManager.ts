import Phaser from 'phaser';
import { DungeonData, RoomType } from './DungeonGenerator';
import { NPC, createLostSoulData, createWarningSpirit } from '../entities/NPC';
import { SinWorld } from '../config/WorldConfig';
import { TILE_SIZE } from '../utils/constants';
import { Player } from '../entities/Player';
import { DialogueUI } from '../ui/DialogueUI';

/**
 * Manages dungeon NPCs (Lost Souls, Warning Spirits) in GameScene.
 * Lost Souls appear in shrine rooms and provide world-specific lore.
 * Warning Spirits appear near the exit on floor 2 to warn about the boss.
 */
export class DungeonNPCManager {
  private scene: Phaser.Scene;
  private player: Player;
  private dungeon: DungeonData;
  private dialogueUI: DialogueUI;
  private currentWorld: SinWorld | null;
  private floor: number;

  private dungeonNPCs: NPC[] = [];
  private nearbyNPC: NPC | null = null;
  private lorePrompt: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    dungeon: DungeonData,
    dialogueUI: DialogueUI,
    currentWorld: SinWorld | null,
    floor: number
  ) {
    this.scene = scene;
    this.player = player;
    this.dungeon = dungeon;
    this.dialogueUI = dialogueUI;
    this.currentWorld = currentWorld;
    this.floor = floor;
  }

  /**
   * Set the shared lore prompt text object for displaying interaction hints.
   */
  setLorePrompt(lorePrompt: Phaser.GameObjects.Text): void {
    this.lorePrompt = lorePrompt;
  }

  /**
   * Spawn dungeon NPCs (Lost Souls in shrine rooms, Warning Spirit on floor 2).
   */
  spawnDungeonNPCs(): void {
    this.dungeonNPCs = [];

    // Only spawn Lost Souls in world mode with world-specific lore
    if (!this.currentWorld) return;

    // Find shrine rooms to place Lost Souls
    const shrineRooms = this.dungeon.rooms.filter(r => r.type === RoomType.SHRINE);

    for (const room of shrineRooms) {
      // Offset from center so NPC doesn't overlap shrine
      const npcX = room.centerX * TILE_SIZE + TILE_SIZE * 2;
      const npcY = room.centerY * TILE_SIZE + TILE_SIZE / 2;

      const npcData = createLostSoulData(this.currentWorld);
      const npc = new NPC(this.scene, npcX, npcY, npcData);
      this.dungeonNPCs.push(npc);
    }

    // On floor 2, add a warning spirit near the exit
    if (this.floor === 2) {
      const exitRoom = this.dungeon.rooms.find(r => r.type === RoomType.EXIT);
      if (exitRoom) {
        const warningX = exitRoom.centerX * TILE_SIZE - TILE_SIZE * 2;
        const warningY = exitRoom.centerY * TILE_SIZE + TILE_SIZE / 2;

        const warningData = createWarningSpirit(this.currentWorld);
        const warningNPC = new NPC(this.scene, warningX, warningY, warningData);
        this.dungeonNPCs.push(warningNPC);
      }
    }
  }

  /**
   * Check proximity to NPCs and update nearbyNPC reference.
   * Call this every frame in update().
   */
  checkNPCProximity(): void {
    if (!this.player || this.dungeonNPCs.length === 0) {
      this.nearbyNPC = null;
      return;
    }

    const interactDistance = TILE_SIZE * 1.5;

    for (const npc of this.dungeonNPCs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        npc.x, npc.y
      );

      if (dist < interactDistance) {
        this.nearbyNPC = npc;
        return;
      }
    }

    this.nearbyNPC = null;
  }

  /**
   * Get the NPC currently within interaction range, or null.
   */
  getNearbyNPC(): NPC | null {
    return this.nearbyNPC;
  }

  /**
   * Show the NPC interaction prompt.
   */
  showNPCPrompt(): void {
    if (this.nearbyNPC && !this.dialogueUI.getIsVisible() && this.lorePrompt) {
      // Show interact hint at bottom of screen (like Hub)
      const npcData = this.nearbyNPC.getData();
      this.lorePrompt.setText(`[R] Talk to ${npcData.name}`);
      this.lorePrompt.setPosition(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height - 40
      );
      this.lorePrompt.setOrigin(0.5);
      this.lorePrompt.setVisible(true);
    }
  }

  /**
   * Initiate dialogue with the nearby NPC.
   */
  talkToNPC(): void {
    if (!this.nearbyNPC || this.dialogueUI.getIsVisible()) return;

    if (this.lorePrompt) {
      this.lorePrompt.setVisible(false);
    }
    // Hide the NPC's indicator while talking
    this.nearbyNPC.hideIndicator();

    const npcRef = this.nearbyNPC;
    this.dialogueUI.show({
      lines: this.nearbyNPC.getDialogue(),
      onComplete: () => {
        // Show the indicator again when dialogue is done
        npcRef.showIndicator();
      },
    });
  }
}
