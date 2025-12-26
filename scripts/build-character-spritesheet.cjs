#!/usr/bin/env node
/**
 * Build character spritesheets from PixelLab-generated frames
 *
 * Creates a spritesheet with:
 * - Rows: animation frames (0-3 for walk)
 * - Columns: directions (S, SW, W, NW, N, NE, E, SE)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHARACTERS_DIR = path.join(__dirname, '..', 'public', 'assets', 'pixellab-originals', 'characters');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'characters');

// Direction order (matches typical 8-direction games)
const DIRECTIONS = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];

function buildSpritesheet(characterName) {
  const charDir = path.join(CHARACTERS_DIR, characterName);

  if (!fs.existsSync(charDir)) {
    console.error(`Character directory not found: ${charDir}`);
    return;
  }

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Building spritesheet for: ${characterName}`);

  // Build idle spritesheet (single row, 8 directions)
  const idleImages = DIRECTIONS.map(dir => {
    const rotationPath = path.join(charDir, 'rotations', `${dir}.png`);
    if (fs.existsSync(rotationPath)) {
      return rotationPath;
    }
    // Fallback: use adjacent direction if missing
    console.warn(`  Missing rotation: ${dir}, will use fallback`);
    return null;
  }).filter(Boolean);

  if (idleImages.length > 0) {
    const idleOutput = path.join(OUTPUT_DIR, `${characterName}_idle.png`);
    // Use ImageMagick to combine horizontally
    const idleCmd = `magick ${idleImages.map(p => `"${p}"`).join(' ')} +append "${idleOutput}"`;
    try {
      execSync(idleCmd, { stdio: 'pipe' });
      console.log(`  ✓ Created idle spritesheet: ${idleImages.length} directions`);
    } catch (error) {
      console.error(`  ✗ Failed to create idle spritesheet:`, error.message);
    }
  }

  // Build walk spritesheet (4 rows x 8 columns)
  const walkDir = path.join(charDir, 'animations', 'walking-4-frames');
  if (fs.existsSync(walkDir)) {
    const frameCount = 4;
    const rows = [];

    for (let frame = 0; frame < frameCount; frame++) {
      const rowImages = DIRECTIONS.map(dir => {
        const framePath = path.join(walkDir, dir, `frame_00${frame}.png`);
        if (fs.existsSync(framePath)) {
          return framePath;
        }
        // Fallback: use idle rotation if walk frame missing
        const idlePath = path.join(charDir, 'rotations', `${dir}.png`);
        if (fs.existsSync(idlePath)) {
          console.warn(`  Missing walk frame ${frame} for ${dir}, using idle`);
          return idlePath;
        }
        return null;
      }).filter(Boolean);

      if (rowImages.length === DIRECTIONS.length) {
        rows.push(rowImages);
      }
    }

    if (rows.length === frameCount) {
      const walkOutput = path.join(OUTPUT_DIR, `${characterName}_walk.png`);

      // Create each row, then combine vertically
      const tempFiles = [];
      for (let i = 0; i < rows.length; i++) {
        const tempFile = path.join(OUTPUT_DIR, `_temp_row_${i}.png`);
        const rowCmd = `magick ${rows[i].map(p => `"${p}"`).join(' ')} +append "${tempFile}"`;
        execSync(rowCmd, { stdio: 'pipe' });
        tempFiles.push(tempFile);
      }

      // Combine rows vertically
      const combineCmd = `magick ${tempFiles.map(p => `"${p}"`).join(' ')} -append "${walkOutput}"`;
      execSync(combineCmd, { stdio: 'pipe' });

      // Cleanup temp files
      tempFiles.forEach(f => fs.unlinkSync(f));

      console.log(`  ✓ Created walk spritesheet: ${frameCount} frames x ${DIRECTIONS.length} directions`);
    } else {
      console.warn(`  ⚠ Could not create complete walk spritesheet (missing frames)`);
    }
  }

  console.log(`Done: ${characterName}`);
}

// Main
function main() {
  console.log('Character Spritesheet Builder');
  console.log('=============================\n');

  // Get character name from args or process all
  const args = process.argv.slice(2);

  if (args.length > 0) {
    args.forEach(buildSpritesheet);
  } else {
    // Process all characters
    if (fs.existsSync(CHARACTERS_DIR)) {
      const characters = fs.readdirSync(CHARACTERS_DIR).filter(f =>
        fs.statSync(path.join(CHARACTERS_DIR, f)).isDirectory()
      );
      characters.forEach(buildSpritesheet);
    } else {
      console.log('No characters directory found.');
    }
  }
}

main();
