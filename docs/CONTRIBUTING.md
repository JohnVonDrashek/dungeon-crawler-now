# Contributing to Infernal Ascent

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit
```

## Code Style

### File Organization
- Keep files under 500 lines
- One class per file (except related small classes)
- Group imports: Phaser, then local modules

### Naming Conventions
- Classes: PascalCase (`EnemySpawnManager`)
- Methods/variables: camelCase (`spawnEnemy`)
- Constants: UPPER_SNAKE_CASE (`TILE_SIZE`)
- Files: PascalCase for classes, camelCase for utilities

### TypeScript
- Always add type annotations to function parameters
- Use `interface` for object shapes, `type` for unions
- Avoid `any` - use `unknown` and type guards instead

### Documentation
- Add JSDoc to all public methods
- Include `@param` and `@returns` tags
- Add `@example` for complex usage

```typescript
/**
 * Calculates damage dealt from attacker to target.
 * Applies equipment bonuses, critical hits, and defense.
 *
 * @param attacker - The entity dealing damage
 * @param target - The entity receiving damage
 * @returns Damage result with amount, crit status, and blocked status
 *
 * @example
 * const result = combatSystem.calculateDamage(player, enemy);
 * if (result.isCrit) showCritEffect();
 * target.takeDamage(result.damage);
 */
calculateDamage(attacker: Entity, target: Entity): DamageResult {
  // ...
}
```

## Testing

> **Note:** Testing is not yet configured for this project. A testing framework (likely Vitest or Jest) is planned for future implementation.

When testing is set up, prioritize writing tests for:
- Pure functions (damage calculations, loot generation)
- State transitions (save/load, progression)
- Edge cases (empty inventory, max stats)

For now, manually verify changes by:
1. Running the development server (`npm run dev`)
2. Testing affected gameplay systems in-browser
3. Ensuring `npm run build` completes without errors

## Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code change that neither fixes nor adds
- `test:` Adding or updating tests
- `chore:` Build process, dependencies

## Pull Request Process

1. Create feature branch from `main`
2. Make changes with atomic commits
3. Ensure `npm run build` passes
4. Update documentation if needed
5. Request review
6. Address review feedback with additional commits (avoid force-pushing during review)
7. Once approved, squash and merge to `main`
