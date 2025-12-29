/**
 * Validates incoming multiplayer messages to prevent cheating.
 */
import { SyncMessage } from './SyncMessages';

const MAX_DAMAGE_PER_HIT = 1000;
const MAX_POSITION_DELTA = 100;
const VALID_ROOM_CODE_REGEX = /^[A-Z0-9]{4,8}$/;
const MAX_MESSAGES_PER_SECOND = 100;
const MIN_POSITION = -1000;
const MAX_POSITION = 50000;

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateRoomCode(code: string): ValidationResult {
  if (!VALID_ROOM_CODE_REGEX.test(code)) {
    return { valid: false, reason: 'Invalid room code format' };
  }
  return { valid: true };
}

export function validateDamage(damage: number): ValidationResult {
  if (typeof damage !== 'number' || isNaN(damage)) {
    return { valid: false, reason: 'Damage must be a number' };
  }
  if (damage < 0) {
    return { valid: false, reason: 'Damage cannot be negative' };
  }
  if (damage > MAX_DAMAGE_PER_HIT) {
    return { valid: false, reason: `Damage exceeds max of ${MAX_DAMAGE_PER_HIT}` };
  }
  return { valid: true };
}

export function validatePositionDelta(
  oldX: number, oldY: number,
  newX: number, newY: number
): ValidationResult {
  const deltaX = Math.abs(newX - oldX);
  const deltaY = Math.abs(newY - oldY);

  if (deltaX > MAX_POSITION_DELTA || deltaY > MAX_POSITION_DELTA) {
    return { valid: false, reason: 'Position change too large (possible teleport)' };
  }
  return { valid: true };
}

export function validateEnemyId(
  enemyId: string,
  validEnemyIds: Set<string>
): ValidationResult {
  if (!validEnemyIds.has(enemyId)) {
    return { valid: false, reason: 'Invalid enemy ID' };
  }
  return { valid: true };
}

export function validateSyncMessage(message: SyncMessage): ValidationResult {
  if (!message || typeof message !== 'object') {
    return { valid: false, reason: 'Message must be an object' };
  }
  if (!message.type || typeof message.type !== 'string') {
    return { valid: false, reason: 'Message must have a type' };
  }
  return { valid: true };
}

/**
 * Validates that position values are within acceptable world bounds.
 */
export function validatePosition(x: number, y: number): ValidationResult {
  if (typeof x !== 'number' || typeof y !== 'number') {
    return { valid: false, reason: 'Position must be numbers' };
  }
  if (isNaN(x) || isNaN(y)) {
    return { valid: false, reason: 'Position contains NaN' };
  }
  if (x < MIN_POSITION || x > MAX_POSITION || y < MIN_POSITION || y > MAX_POSITION) {
    return { valid: false, reason: 'Position out of world bounds' };
  }
  return { valid: true };
}

/**
 * Simple rate limiter to prevent message flooding.
 */
export class MessageRateLimiter {
  private messageCount: number = 0;
  private lastReset: number = Date.now();
  private readonly maxMessagesPerSecond: number;

  constructor(maxPerSecond: number = MAX_MESSAGES_PER_SECOND) {
    this.maxMessagesPerSecond = maxPerSecond;
  }

  /**
   * Check if a message should be allowed.
   * @returns true if allowed, false if rate limited
   */
  checkAllowed(): boolean {
    const now = Date.now();
    if (now - this.lastReset >= 1000) {
      this.messageCount = 0;
      this.lastReset = now;
    }

    this.messageCount++;
    return this.messageCount <= this.maxMessagesPerSecond;
  }

  reset(): void {
    this.messageCount = 0;
    this.lastReset = Date.now();
  }
}
