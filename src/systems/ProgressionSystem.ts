/**
 * Progression System - Tracks world completion and game state
 */

import { SinWorld, getAllWorlds, WORLD_CONFIGS } from '../config/WorldConfig';

export interface WorldProgress {
  started: boolean;
  currentFloor: number;  // 0 = not started, 1-3 = in progress
  completed: boolean;
  deathCount: number;
}

export interface ActiveRun {
  world: SinWorld;
  floor: number;
}

export interface GameProgression {
  worldProgress: Record<SinWorld, WorldProgress>;
  activeRun: ActiveRun | null;
  hubUnlocks: string[];
  totalDeaths: number;
  totalEnemiesKilled: number;
  totalGoldEarned: number;
}

// Default progress for a single world
function createDefaultWorldProgress(): WorldProgress {
  return {
    started: false,
    currentFloor: 0,
    completed: false,
    deathCount: 0,
  };
}

// Create fresh progression state
export function createDefaultProgression(): GameProgression {
  const worldProgress: Record<string, WorldProgress> = {};

  for (const world of getAllWorlds()) {
    worldProgress[world] = createDefaultWorldProgress();
  }

  return {
    worldProgress: worldProgress as Record<SinWorld, WorldProgress>,
    activeRun: null,
    hubUnlocks: [],
    totalDeaths: 0,
    totalEnemiesKilled: 0,
    totalGoldEarned: 0,
  };
}

/**
 * ProgressionManager - Singleton to manage game progression
 */
export class ProgressionManager {
  private static instance: ProgressionManager;
  private progression: GameProgression;

  private constructor() {
    this.progression = createDefaultProgression();
  }

  static getInstance(): ProgressionManager {
    if (!ProgressionManager.instance) {
      ProgressionManager.instance = new ProgressionManager();
    }
    return ProgressionManager.instance;
  }

  // Get current progression state
  getProgression(): GameProgression {
    return this.progression;
  }

  // Set progression state (e.g., from save)
  setProgression(progression: GameProgression): void {
    this.progression = progression;
  }

  // Reset to fresh state
  reset(): void {
    this.progression = createDefaultProgression();
  }

  // === World Progress ===

  getWorldProgress(world: SinWorld): WorldProgress {
    return this.progression.worldProgress[world];
  }

  isWorldCompleted(world: SinWorld): boolean {
    return this.progression.worldProgress[world].completed;
  }

  isWorldStarted(world: SinWorld): boolean {
    return this.progression.worldProgress[world].started;
  }

  getCompletedWorlds(): SinWorld[] {
    return getAllWorlds().filter(world => this.isWorldCompleted(world));
  }

  getCompletedWorldCount(): number {
    return this.getCompletedWorlds().length;
  }

  areAllWorldsCompleted(): boolean {
    return this.getCompletedWorldCount() === getAllWorlds().length;
  }

  // === Active Run ===

  hasActiveRun(): boolean {
    return this.progression.activeRun !== null;
  }

  getActiveRun(): ActiveRun | null {
    return this.progression.activeRun;
  }

  startWorld(world: SinWorld, floor: number = 1): void {
    this.progression.worldProgress[world].started = true;
    this.progression.worldProgress[world].currentFloor = floor;
    this.progression.activeRun = { world, floor };
  }

  advanceFloor(): void {
    if (!this.progression.activeRun) return;

    const { world, floor } = this.progression.activeRun;
    const maxFloors = WORLD_CONFIGS[world].floorCount;
    const newFloor = floor + 1;

    if (newFloor > maxFloors) {
      // World completed
      this.completeWorld(world);
    } else {
      // Advance to next floor
      this.progression.activeRun.floor = newFloor;
      this.progression.worldProgress[world].currentFloor = newFloor;
    }
  }

  completeWorld(world: SinWorld): void {
    this.progression.worldProgress[world].completed = true;
    this.progression.worldProgress[world].currentFloor = 0;
    this.progression.activeRun = null;
  }

  // Called when player dies in a world
  handleDeath(): void {
    if (this.progression.activeRun) {
      const { world } = this.progression.activeRun;
      this.progression.worldProgress[world].deathCount++;
    }
    this.progression.totalDeaths++;
    // Clear active run but keep world progress (can retry)
    this.progression.activeRun = null;
  }

  // Return to hub (voluntary exit or world complete)
  returnToHub(): void {
    this.progression.activeRun = null;
  }

  // === Stats ===

  addEnemiesKilled(count: number): void {
    this.progression.totalEnemiesKilled += count;
  }

  addGoldEarned(amount: number): void {
    this.progression.totalGoldEarned += amount;
  }

  // === Hub Unlocks ===

  unlockHubFeature(feature: string): void {
    if (!this.progression.hubUnlocks.includes(feature)) {
      this.progression.hubUnlocks.push(feature);
    }
  }

  isHubFeatureUnlocked(feature: string): boolean {
    return this.progression.hubUnlocks.includes(feature);
  }

  // Get features unlocked based on world completion
  getAutoUnlocks(): string[] {
    const unlocks: string[] = [];
    const completed = this.getCompletedWorldCount();

    // Unlock features based on progression
    if (completed >= 1) unlocks.push('shop_tier_2');
    if (completed >= 3) unlocks.push('shop_tier_3');
    if (completed >= 5) unlocks.push('fountain_upgrade');
    if (completed >= 7) unlocks.push('victory_portal');

    return unlocks;
  }
}

// Convenience export
export const progressionManager = ProgressionManager.getInstance();
