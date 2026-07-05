// Generates PWA icon set from public/app-icon-source.png. Run: node scripts/generate-pwa-icons.js
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(__dirname, '../public/app-icon-source.png')
const outDir = path.join(__dirname, '../public/icons')

async function main() {
  fs.mkdirSync(outDir, { recursive: true })

  await sharp(src).resize(192, 192).toFile(path.join(outDir, 'icon-192.png'))
  await sharp(src).resize(512, 512).toFile(path.join(outDir, 'icon-512.png'))
  await sharp(src).resize(180, 180).toFile(path.join(outDir, 'apple-touch-icon.png'))

  // maskable: source scaled to 60% and centered on a padded canvas (20% safe-zone margin each side)
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.6)
    const resized = await sharp(src).resize(inner, inner).toBuffer()
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 26, g: 17, b: 64, alpha: 1 },
      },
    })
      .composite([{ input: resized, gravity: 'center' }])
      .png()
      .toFile(path.join(outDir, `icon-maskable-${size}.png`))
  }

  console.log('PWA icons generated in public/icons')
}

main()
