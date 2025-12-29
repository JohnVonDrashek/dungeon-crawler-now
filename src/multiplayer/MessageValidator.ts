/**
 * Validates incoming multiplayer messages to prevent cheating.
 */
import { SyncMessage } from './SyncMessages';

const MAX_DAMAGE_PER_HIT = 1000;
const MAX_POSITION_DELTA = 100;
const VALID_ROOM_CODE_REGEX = /^[A-Z0-9]{4,8}$/;

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
