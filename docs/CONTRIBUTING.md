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

Run tests with:
```bash
npm test
```

Write tests for:
- Pure functions (damage calculations, loot generation)
- State transitions (save/load, progression)
- Edge cases (empty inventory, max stats)

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
