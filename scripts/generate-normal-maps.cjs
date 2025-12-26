/**
 * Normal Map Generator for Pixel Art Sprites
 *
 * Generates normal maps from 2D sprites by:
 * 1. Converting pixel colors to height values (brightness-based)
 * 2. Applying Sobel filter to calculate surface gradients
 * 3. Converting gradients to normal vectors encoded as RGB
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
  // How much brightness affects height (0-1)
  heightStrength: 1.0,
  // Blur radius for smoothing (0 = no blur, helps with pixel art)
  blurRadius: 0,
  // Invert height (darker = higher instead of brighter = higher)
  invertHeight: false,
  // Edge detection strength multiplier
  normalStrength: 2.0,
  // Whether to preserve transparency in output
  preserveAlpha: true,
};

/**
 * Convert RGB to luminance (perceived brightness)
 */
function getLuminance(r, g, b) {
  // Standard luminance formula
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Generate height map from image pixels
 */
function generateHeightMap(pixels, width, height, channels) {
  const heightMap = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = channels === 4 ? pixels[idx + 3] : 255;

      // Transparent pixels get height 0
      if (a === 0) {
        heightMap[y * width + x] = 0;
        continue;
      }

      let luminance = getLuminance(r, g, b) / 255;

      if (config.invertHeight) {
        luminance = 1 - luminance;
      }

      heightMap[y * width + x] = luminance * config.heightStrength;
    }
  }

  return heightMap;
}

/**
 * Sample height map with boundary handling
 */
function sampleHeight(heightMap, x, y, width, height) {
  x = Math.max(0, Math.min(width - 1, x));
  y = Math.max(0, Math.min(height - 1, y));
  return heightMap[y * width + x];
}

/**
 * Generate normal map using Sobel filter
 */
function generateNormalMap(heightMap, width, height, originalPixels, channels) {
  const normalMap = Buffer.alloc(width * height * 4); // RGBA output

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const outIdx = idx * 4;
      const origIdx = idx * channels;

      // Check original alpha
      const origAlpha = channels === 4 ? originalPixels[origIdx + 3] : 255;

      if (config.preserveAlpha && origAlpha === 0) {
        // Transparent pixel - flat normal pointing up, transparent
        normalMap[outIdx] = 128;     // R (x = 0)
        normalMap[outIdx + 1] = 128; // G (y = 0)
        normalMap[outIdx + 2] = 255; // B (z = 1)
        normalMap[outIdx + 3] = 0;   // A (transparent)
        continue;
      }

      // Sobel filter for gradient calculation
      // Sample 3x3 neighborhood
      const tl = sampleHeight(heightMap, x - 1, y - 1, width, height);
      const t  = sampleHeight(heightMap, x,     y - 1, width, height);
      const tr = sampleHeight(heightMap, x + 1, y - 1, width, height);
      const l  = sampleHeight(heightMap, x - 1, y,     width, height);
      const r  = sampleHeight(heightMap, x + 1, y,     width, height);
      const bl = sampleHeight(heightMap, x - 1, y + 1, width, height);
      const b  = sampleHeight(heightMap, x,     y + 1, width, height);
      const br = sampleHeight(heightMap, x + 1, y + 1, width, height);

      // Sobel operators
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      // Create normal vector
      let nx = -dx * config.normalStrength;
      let ny = -dy * config.normalStrength;
      let nz = 1.0;

      // Normalize
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= length;
      ny /= length;
      nz /= length;

      // Convert from [-1, 1] to [0, 255]
      normalMap[outIdx] = Math.round((nx * 0.5 + 0.5) * 255);     // R
      normalMap[outIdx + 1] = Math.round((ny * 0.5 + 0.5) * 255); // G
      normalMap[outIdx + 2] = Math.round((nz * 0.5 + 0.5) * 255); // B
      normalMap[outIdx + 3] = origAlpha;                           // A
    }
  }

  return normalMap;
}

/**
 * Process a single image file
 */
async function processImage(inputPath, outputPath) {
  try {
    // Load image
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const { width, height, channels } = metadata;

    // Get raw pixel data
    const { data: pixels } = await image.raw().toBuffer({ resolveWithObject: true });

    // Generate height map
    const heightMap = generateHeightMap(pixels, width, height, channels);

    // Generate normal map
    const normalMap = generateNormalMap(heightMap, width, height, pixels, channels);

    // Save output
    await sharp(normalMap, {
      raw: {
        width,
        height,
        channels: 4,
      },
    })
      .png()
      .toFile(outputPath);

    console.log(`Generated: ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error.message);
    return false;
  }
}

/**
 * Process all sprites in a directory
 */
async function processDirectory(inputDir, outputDir) {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get all PNG files
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.png'));

  console.log(`Processing ${files.length} sprites...`);
  console.log(`Config: strength=${config.normalStrength}, heightStrength=${config.heightStrength}`);
  console.log('');

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const baseName = path.basename(file, '.png');
    const outputPath = path.join(outputDir, `${baseName}_n.png`);

    if (await processImage(inputPath, outputPath)) {
      success++;
    } else {
      failed++;
    }
  }

  console.log('');
  console.log(`Done! ${success} generated, ${failed} failed`);
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Default: process all character sprites
    const inputDir = path.join(__dirname, '../public/assets/characters');
    const outputDir = path.join(__dirname, '../public/assets/characters/normals');
    await processDirectory(inputDir, outputDir);
  } else if (args.length === 1) {
    // Single file
    const inputPath = args[0];
    const baseName = path.basename(inputPath, '.png');
    const outputPath = path.join(path.dirname(inputPath), `${baseName}_n.png`);
    await processImage(inputPath, outputPath);
  } else if (args.length === 2) {
    // Input and output specified
    if (fs.statSync(args[0]).isDirectory()) {
      await processDirectory(args[0], args[1]);
    } else {
      await processImage(args[0], args[1]);
    }
  } else {
    console.log('Usage:');
    console.log('  node generate-normal-maps.cjs                    # Process all character sprites');
    console.log('  node generate-normal-maps.cjs <input.png>        # Process single file');
    console.log('  node generate-normal-maps.cjs <inDir> <outDir>   # Process directory');
  }
}

main().catch(console.error);
