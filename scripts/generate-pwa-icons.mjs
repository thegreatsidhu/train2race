/**
 * Generates PNG icon files for the PWA manifest from the SVG sources.
 * Run once after cloning or when icons change:
 *   node scripts/generate-pwa-icons.mjs
 *
 * Requires: npm install -D sharp
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const iconSvg = readFileSync(join(root, "public/icons/icon.svg"));
const maskableSvg = readFileSync(join(root, "public/icons/icon-maskable.svg"));

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function run() {
  for (const size of SIZES) {
    await sharp(iconSvg)
      .resize(size, size)
      .png()
      .toFile(join(root, `public/icons/icon-${size}.png`));
    console.log(`  ✓ icon-${size}.png`);

    await sharp(maskableSvg)
      .resize(size, size)
      .png()
      .toFile(join(root, `public/icons/icon-maskable-${size}.png`));
    console.log(`  ✓ icon-maskable-${size}.png`);
  }

  // Apple touch icon (180x180 from standard icon)
  await sharp(iconSvg)
    .resize(180, 180)
    .png()
    .toFile(join(root, "public/apple-touch-icon.png"));
  console.log("  ✓ apple-touch-icon.png");

  console.log("\nAll PWA icons generated.");
}

run().catch(console.error);
