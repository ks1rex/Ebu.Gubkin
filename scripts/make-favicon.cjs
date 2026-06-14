const sharp = require('sharp');
const path  = require('path');

const SRC = path.join(__dirname, '..', 'public', 'logo-horizontal.png');
const OUT = path.join(__dirname, '..', 'public');

async function makeFavicon() {
  const meta = await sharp(SRC).metadata();
  const size = meta.height; // левый квадрат = высота файла

  await sharp(SRC)
    .extract({ left: 0, top: 0, width: size, height: size })
    .resize(180, 180)
    .toFile(path.join(OUT, 'favicon-180.png'));

  await sharp(SRC)
    .extract({ left: 0, top: 0, width: size, height: size })
    .resize(32, 32)
    .toFile(path.join(OUT, 'favicon-32.png'));

  console.log(`Source: ${meta.width}x${meta.height}, square: ${size}x${size}`);
  console.log('favicon-32.png and favicon-180.png created!');
}

makeFavicon().catch(e => { console.error(e); process.exit(1); });
