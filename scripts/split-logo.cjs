const sharp = require('sharp');
const path  = require('path');

const SRC     = path.join(__dirname, '..', 'public', 'logo.png');
const OUT_DIR = path.join(__dirname, '..', 'public');

async function main() {
  const meta = await sharp(SRC).metadata();
  console.log(`Source: ${meta.width}×${meta.height}px`);

  const half = Math.floor(meta.height / 2);

  // ── Vertical logo (top half) ──────────────────────────────────────────────
  const vertBuf = await sharp(SRC)
    .extract({ left: 0, top: 0, width: meta.width, height: half })
    .trim({ background: '#000000', threshold: 20 })
    .toBuffer({ resolveWithObject: true });

  await sharp(vertBuf.data)
    .png()
    .toFile(path.join(OUT_DIR, 'logo-vertical.png'));
  console.log(`logo-vertical.png:   ${vertBuf.info.width}×${vertBuf.info.height}px`);

  // ── Horizontal logo (bottom half) ─────────────────────────────────────────
  const horiBuf = await sharp(SRC)
    .extract({ left: 0, top: half, width: meta.width, height: meta.height - half })
    .trim({ background: '#000000', threshold: 20 })
    .toBuffer({ resolveWithObject: true });

  await sharp(horiBuf.data)
    .png()
    .toFile(path.join(OUT_DIR, 'logo-horizontal.png'));
  console.log(`logo-horizontal.png: ${horiBuf.info.width}×${horiBuf.info.height}px`);

  // ── Favicon: icon portion of vertical logo (top 55%) ─────────────────────
  const iconHeight = Math.floor(vertBuf.info.height * 0.55);
  const iconBuf = await sharp(vertBuf.data)
    .extract({ left: 0, top: 0, width: vertBuf.info.width, height: iconHeight })
    .trim({ background: '#000000', threshold: 20 })
    .toBuffer({ resolveWithObject: true });
  console.log(`icon (raw):          ${iconBuf.info.width}×${iconBuf.info.height}px`);

  await sharp(iconBuf.data).resize(32,  32,  { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toFile(path.join(OUT_DIR, 'favicon.png'));
  await sharp(iconBuf.data).resize(180, 180, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toFile(path.join(OUT_DIR, 'favicon-180.png'));
  console.log('favicon.png (32×32) and favicon-180.png (180×180) saved.');
}

main().catch(e => { console.error(e); process.exit(1); });
