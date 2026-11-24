import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SVG_PATH = process.argv[2] || 'C:\\Users\\mapay\\Downloads\\หน้าหลัก\\หน้าหลัก.svg';
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'images', 'figma');

const IMAGE_ID_NAME_MAP = {
  __direct_0: 'home-pill-glow.png',
  image0_11_64: 'torn-stone.png',
  image1_11_64: 'icon-register.png',
  image2_11_64: 'icon-home.png',
  image3_11_64: 'icon-directory.png',
  image4_11_64: 'hero-bg-1.png',
  image5_11_64: 'hero-bg-2.png',
  image6_11_64: 'hero-bg-3.png',
  image7_11_64: 'hero-bg-4.png',
  image8_11_64: 'hero-bg-5.png',
  image9_11_64: 'calligraphy-ayutthaya.png',
  image10_11_64: 'jersey-models.png',
};

function run() {
  if (!fs.existsSync(DEFAULT_SVG_PATH)) {
    console.error(`[extract-figma-assets] SVG file not found: ${DEFAULT_SVG_PATH}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const svg = fs.readFileSync(DEFAULT_SVG_PATH, 'utf8');
  const imageTagRegex = /<image([^>]*)>/g;

  let match;
  let directCount = 0;
  let extracted = 0;

  while ((match = imageTagRegex.exec(svg)) !== null) {
    const attrs = match[1];
    const idMatch = attrs.match(/\bid="([^"]+)"/);
    const hrefMatch = attrs.match(/xlink:href="data:image\/([a-zA-Z0-9+]+);base64,([^"]+)"/);

    if (!hrefMatch) continue;

    const key = idMatch ? idMatch[1] : `__direct_${directCount++}`;
    const targetName = IMAGE_ID_NAME_MAP[key] || `${key}.${hrefMatch[1]}`;
    const buffer = Buffer.from(hrefMatch[2], 'base64');

    if (buffer.length === 0) {
      console.error(`[extract-figma-assets] Empty image buffer for ${key}`);
      process.exit(1);
    }

    const outPath = path.join(OUT_DIR, targetName);
    fs.writeFileSync(outPath, buffer);
    console.log(`[extract-figma-assets] Extracted ${key} -> ${targetName} (${buffer.length} bytes)`);
    extracted++;
  }

  console.log(`[extract-figma-assets] Complete: ${extracted} image files written to ${OUT_DIR}`);
}

run();
