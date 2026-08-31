const sharp = require('sharp');
const path  = require('path');

// logo-mark.png — уже чистый квадратный кружок без текста (394x394,
// прозрачный фон). logo-horizontal.png раньше использовался как источник с
// извлечением левого квадрата "высота x высота", но при ширине текстового
// лого 1024x768 такой квадрат (768x768) залезал в надпись "Ebu.Gubkin"
// справа от значка — favicon получался вытянутым и с текстом вместо кружка.
const SRC = path.join(__dirname, '..', 'public', 'logo-mark.png');
const OUT = path.join(__dirname, '..', 'public');

async function makeFavicon() {
  const meta = await sharp(SRC).metadata();

  await sharp(SRC).resize(180, 180).toFile(path.join(OUT, 'favicon-180.png'));
  await sharp(SRC).resize(32, 32).toFile(path.join(OUT, 'favicon-32.png'));
  await sharp(SRC).resize(32, 32).toFile(path.join(OUT, 'favicon.ico'));

  console.log(`Source: ${meta.width}x${meta.height}`);
  console.log('favicon-32.png, favicon-180.png and favicon.ico created!');
}

makeFavicon().catch(e => { console.error(e); process.exit(1); });
