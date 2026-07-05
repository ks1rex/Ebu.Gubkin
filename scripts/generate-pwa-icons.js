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

  // maskable: source already has its own square background/padding baked in, so just resize to fill —
  // shrinking it further onto an extra padded canvas doubles the border and looks broken.
  await sharp(src).resize(192, 192).toFile(path.join(outDir, 'icon-maskable-192.png'))
  await sharp(src).resize(512, 512).toFile(path.join(outDir, 'icon-maskable-512.png'))

  console.log('PWA icons generated in public/icons')
}

main()
