// Генерирует src/pages/Admin/adminGuideText.ts из reshbirga/ADMIN_GUIDE.md.
// Запуск: node scripts/sync-admin-guide.mjs
//
// Гайд лежит в соседнем репозитории, а Vite не импортирует файлы за пределами
// своего корня — поэтому текст приходится дублировать. Раньше это делалось
// руками «правки вносить в оба файла», что гарантированно расходится.
// ponytail: копирование скриптом вместо синхронизации руками; настоящее
// решение — общий пакет или сборочный шаг, но ради одного файла это лишнее.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC  = path.resolve(__dirname, '../../reshbirga/ADMIN_GUIDE.md')
const DEST = path.resolve(__dirname, '../src/pages/Admin/adminGuideText.ts')

const md = fs.readFileSync(SRC, 'utf8')

// Внутри template literal опасны только эти три последовательности.
const escaped = md
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${')

fs.writeFileSync(DEST, `// СГЕНЕРИРОВАННЫЙ ФАЙЛ — не правьте вручную.
// Источник: reshbirga/ADMIN_GUIDE.md. Обновить: node scripts/sync-admin-guide.mjs
// Дублируется намеренно: гайд лежит в другом репозитории, Vite не умеет
// импортировать файлы за пределами своего корня. Рендерит ./Help.tsx.

export const ADMIN_GUIDE_MD = \`${escaped}\`
`, 'utf8')

console.log(`adminGuideText.ts обновлён из ADMIN_GUIDE.md (${md.length} символов)`)
