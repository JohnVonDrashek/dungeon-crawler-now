import { Player } from '../../entities/Player';
import { InventoryUI } from '../../ui/InventoryUI';
import { LevelUpUI } from '../../ui/LevelUpUI';
import { SettingsUI } from '../../ui/SettingsUI';
import { DebugMenuUI } from '../../ui/DebugMenuUI';
import { LoreUIManager } from '../../ui/LoreUIManager';
import { DialogueUI } from '../../ui/DialogueUI';
import { DungeonNPCManager } from '../../systems/DungeonNPCManager';

/**
 * Input state tracking
 */
export interface InputState {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
  wasd: {
    W: Phaser.Input.Keyboard.Key | null;
    A: Phaser.Input.Keyboard.Key | null;
    S: Phaser.Input.Keyboard.Key | null;
    D: Phaser.Input.Keyboard.Key | null;
  };
}

/**
 * References needed for keyboard handlers
 */
export interface KeyboardHandlerRefs {
  player: Player;
  inventoryUI: InventoryUI;
  levelUpUI: LevelUpUI;
  settingsUI: SettingsUI;
  debugMenuUI: DebugMenuUI;
  loreUIManager: LoreUIManager;
  dialogueUI: DialogueUI;
  dungeonNPCManager: DungeonNPCManager;
}

/**
 * Create cursor keys and WASD input
 */
export function setupInput(scene: Phaser.Scene): InputState {
  const keyboard = scene.input.keyboard;

  if (!keyboard) {
    return {
      cursors: null,
      wasd: { W: null, A: null, S: null, D: null },
    };
  }

  const cursors = keyboard.createCursorKeys();
  const wasd = {
    W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
  };

  return { cursors, wasd };
}

/**
 * Process player movement based on input state
 */
export function processMovement(
  player: Player,
  inputState: InputState,
  speed: number
): void {
  const { cursors, wasd } = inputState;

  let velocityX = 0;
  let velocityY = 0;

  // Check horizontal movement
  if (cursors?.left.isDown || wasd.A?.isDown) {
    velocityX = -speed;
  } else if (cursors?.right.isDown || wasd.D?.isDown) {
    velocityX = speed;
  }

  // Check vertical movement
  if (cursors?.up.isDown || wasd.W?.isDown) {
    velocityY = -speed;
  } else if (cursors?.down.isDown || wasd.S?.isDown) {
    velocityY = speed;
  }

  // Normalize diagonal movement
  if (velocityX !== 0 && velocityY !== 0) {
    const factor = Math.SQRT1_2; // 1/sqrt(2)
    velocityX *= factor;
    velocityY *= factor;
  }

  player.setVelocity(velocityX, velocityY);
}

/**
 * Register keyboard handlers for interaction keys (E, ESC, L, Q, R)
 */
export function registerKeyboardHandlers(
  scene: Phaser.Scene,
  refs: KeyboardHandlerRefs
): void {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;

  const { player, inventoryUI, levelUpUI, settingsUI, debugMenuUI, loreUIManager, dialogueUI, dungeonNPCManager } = refs;

  // E: Toggle inventory
  keyboard.on('keydown-E', () => {
    // Don't open inventory if another menu is open
    if (settingsUI.getIsVisible() || levelUpUI.getIsVisible()) {
      return;
    }
    inventoryUI.toggle();
    if (inventoryUI.getIsVisible()) {
      player.setVelocity(0, 0);
    }
  });

  // ESC: Close menus or open settings
  keyboard.on('keydown-ESC', () => {
    if (settingsUI.getIsVisible()) {
      settingsUI.hide();
    } else if (levelUpUI.getIsVisible()) {
      levelUpUI.hide();
    } else if (inventoryUI.getIsVisible()) {
      inventoryUI.toggle();
    } else {
      // Open settings if nothing else is open
      player.setVelocity(0, 0);
      settingsUI.show();
    }
  });

  // L: Open character / stat allocation menu
  keyboard.on('keydown-L', () => {
    // Don't open levelup if another menu is open
    if (inventoryUI.getIsVisible() || settingsUI.getIsVisible()) {
      return;
    }

    if (levelUpUI.getIsVisible()) {
      levelUpUI.hide();
    } else {
      player.setVelocity(0, 0);
      levelUpUI.show();
    }
  });

  // Q: Interact with nearby lore objects
  keyboard.on('keydown-Q', () => {
    if (inventoryUI.getIsVisible() || levelUpUI.getIsVisible() || settingsUI.getIsVisible()) return;
    if (loreUIManager.hasActiveModal()) {
      // Close modal if open
      loreUIManager.closeModal();
      return;
    }
    loreUIManager.tryInteractWithLore();
  });

  // R: Talk to nearby NPCs
  keyboard.on('keydown-R', () => {
    if (inventoryUI.getIsVisible() || levelUpUI.getIsVisible() || settingsUI.getIsVisible()) return;
    if (dialogueUI.getIsVisible()) return;
    if (dungeonNPCManager.getNearbyNPC()) {
      dungeonNPCManager.talkToNPC();
    }
  });

  // Dev/Debug controls
  debugMenuUI.setupControls();
}

/**
 * Clean up keyboard handlers
 */
export function cleanupInput(scene: Phaser.Scene): void {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;

  keyboard.off('keydown-E');
  keyboard.off('keydown-ESC');
  keyboard.off('keydown-L');
  keyboard.off('keydown-Q');
  keyboard.off('keydown-R');
}
