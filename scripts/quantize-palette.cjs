#!/usr/bin/env node
/**
 * Quantize PixelLab-generated images to the game's color palette.
 *
 * Usage: node scripts/quantize-palette.js
 *
 * - Reads original images from public/assets/pixellab-originals/
 * - Outputs palette-quantized images to public/assets/objects/ and public/assets/tilesets/
 * - Preserves transparency
 * - Uses nearest-color matching to map to the 32-color palette
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');
const ORIGINALS_DIR = path.join(ASSETS_DIR, 'pixellab-originals');
const PALETTE_PATH = path.join(ASSETS_DIR, 'color-palette.png');
const PALETTE_JSON_PATH = path.join(ASSETS_DIR, 'color-palette.json');

// Output directories (where the game loads from)
const OUTPUT_DIRS = {
  objects: path.join(ASSETS_DIR, 'objects'),
  tilesets: path.join(ASSETS_DIR, 'tilesets'),
  characters: path.join(ASSETS_DIR, 'characters'),
};

// Load palette colors from JSON
function loadPalette() {
  const paletteData = JSON.parse(fs.readFileSync(PALETTE_JSON_PATH, 'utf8'));
  return paletteData.colors.map(c => c.hex);
}

// Parse hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate color distance (simple Euclidean in RGB space)
function colorDistance(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  // Weight green slightly more (human perception)
  return Math.sqrt(dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114);
}

// Find nearest palette color
function findNearestColor(rgb, paletteRgb) {
  let minDist = Infinity;
  let nearest = paletteRgb[0];

  for (const palColor of paletteRgb) {
    const dist = colorDistance(rgb, palColor);
    if (dist < minDist) {
      minDist = dist;
      nearest = palColor;
    }
  }

  return nearest;
}

// Check if ImageMagick is available
function checkImageMagick() {
  try {
    execSync('magick --version', { stdio: 'pipe' });
    return 'magick';
  } catch {
    try {
      execSync('convert --version', { stdio: 'pipe' });
      return 'convert';
    } catch {
      console.error('Error: ImageMagick is not installed.');
      console.error('Install with: brew install imagemagick');
      process.exit(1);
    }
  }
}

// Quantize image using ImageMagick with the palette (preserves transparency)
function quantizeImage(inputPath, outputPath, magickCmd, useDither = false) {
  const os = require('os');
  const tmpDir = os.tmpdir();
  const baseName = path.basename(inputPath, '.png');
  const tmpAlpha = path.join(tmpDir, `${baseName}_alpha.png`);
  const tmpRgb = path.join(tmpDir, `${baseName}_rgb.png`);
  const tmpQuantized = path.join(tmpDir, `${baseName}_quantized.png`);

  const ditherOpt = useDither ? '-dither FloydSteinberg' : '-dither None';

  try {
    // Step 1: Extract alpha channel
    execSync(`${magickCmd} "${inputPath}" -alpha extract "${tmpAlpha}"`, { stdio: 'pipe' });

    // Step 2: Flatten to RGB (remove alpha, fill with magenta for visibility)
    execSync(`${magickCmd} "${inputPath}" -background none -alpha remove "${tmpRgb}"`, { stdio: 'pipe' });

    // Step 3: Quantize RGB to palette
    execSync(`${magickCmd} "${tmpRgb}" ${ditherOpt} -remap "${PALETTE_PATH}" "${tmpQuantized}"`, { stdio: 'pipe' });

    // Step 4: Recombine quantized RGB with original alpha
    execSync(`${magickCmd} "${tmpQuantized}" "${tmpAlpha}" -alpha off -compose CopyOpacity -composite PNG32:"${outputPath}"`, { stdio: 'pipe' });

    // Cleanup temp files
    fs.unlinkSync(tmpAlpha);
    fs.unlinkSync(tmpRgb);
    fs.unlinkSync(tmpQuantized);

    return true;
  } catch (error) {
    console.error(`  Error processing ${path.basename(inputPath)}:`, error.message);
    // Cleanup on error
    [tmpAlpha, tmpRgb, tmpQuantized].forEach(f => { try { fs.unlinkSync(f); } catch {} });
    return false;
  }
}

// Process all images in a directory
function processDirectory(inputDir, outputDir, magickCmd, useDither = false) {
  if (!fs.existsSync(inputDir)) {
    console.log(`  Skipping ${path.basename(inputDir)} (directory not found)`);
    return 0;
  }

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.readdirSync(inputDir).filter(f =>
    f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
  );

  let processed = 0;
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file.replace(/\.(jpg|jpeg)$/i, '.png'));

    const success = quantizeImage(inputPath, outputPath, magickCmd, useDither);

    if (success) {
      processed++;
      console.log(`  ✓ ${file}`);
    }
  }

  return processed;
}

// Main
function main() {
  console.log('Palette Quantizer for Infernal Ascent');
  console.log('=====================================\n');

  // Check dependencies
  const magickCmd = checkImageMagick();
  console.log(`Using ImageMagick: ${magickCmd}\n`);

  // Load and verify palette
  const palette = loadPalette();
  console.log(`Loaded ${palette.length}-color palette\n`);

  // Create originals directory structure if it doesn't exist
  const originalsObjects = path.join(ORIGINALS_DIR, 'objects');
  const originalsTilesets = path.join(ORIGINALS_DIR, 'tilesets');
  fs.mkdirSync(originalsObjects, { recursive: true });
  fs.mkdirSync(originalsTilesets, { recursive: true });

  // Process objects (no dithering - keep pixel art crisp)
  console.log('Processing objects (no dither)...');
  const objectsProcessed = processDirectory(
    originalsObjects,
    OUTPUT_DIRS.objects,
    magickCmd,
    false
  );

  // Process tilesets (no dithering)
  console.log('\nProcessing tilesets (no dither)...');
  const tilesetsProcessed = processDirectory(
    originalsTilesets,
    OUTPUT_DIRS.tilesets,
    magickCmd,
    false
  );

  // Process characters (no dithering)
  // Character spritesheets are built by build-character-spritesheet.cjs first
  console.log('\nProcessing characters (no dither)...');
  const charactersProcessed = processDirectory(
    OUTPUT_DIRS.characters, // Already in output dir, quantize in place
    OUTPUT_DIRS.characters,
    magickCmd,
    false
  );

  console.log('\n=====================================');
  console.log(`Done! Processed ${objectsProcessed} objects, ${tilesetsProcessed} tilesets, ${charactersProcessed} characters`);

  if (objectsProcessed === 0 && tilesetsProcessed === 0 && charactersProcessed === 0) {
    console.log('\nNo images found to process.');
    console.log('Place original PixelLab images in:');
    console.log(`  - ${originalsObjects}`);
    console.log(`  - ${originalsTilesets}`);
  }
}

main();
