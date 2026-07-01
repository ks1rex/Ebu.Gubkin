const sharp = require('sharp');
const path  = require('path');

const PUB = path.join(__dirname, '..', 'public');

async function trimLogo(src, dest) {
  const buf = await sharp(src)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
    .toBuffer({ resolveWithObject: true });
  await sharp(buf.data).png().toFile(dest);
  console.log(`${path.basename(dest)}: ${buf.info.width}x${buf.info.height}`);
}

async function main() {
  await trimLogo(
    path.join(PUB, 'logo-horizontal.png'),
    path.join(PUB, 'logo-horizontal-trimmed.png')
  );
}

main().catch(e => { console.error(e); process.exit(1); });
