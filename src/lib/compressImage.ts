// Сжатие фото в браузере перед загрузкой.
//
// Зачем: снимок с телефона весит 5–10 МБ, а показывается обложкой 300×100 или
// аватаркой 42×42. В хранилище это лишние гигабайты, а у пользователя — лишний
// трафик на каждое открытие ленты. Встроенные преобразования картинок у
// Supabase решили бы это на сервере, но они только на платном тарифе.
//
// ponytail: canvas + toBlob, без библиотек. Если понадобится качество получше
// (поэтапное уменьшение, чтобы не «мылило» при сильном ужатии) — тогда и брать
// внешний ресайзер.

/** Вписывает размер в квадрат `max`, сохраняя пропорции. Мелкое не растягивает. */
function fitSize(w: number, h: number, max: number): { w: number; h: number } {
  if (w <= max && h <= max) return { w, h }
  const k = w > h ? max / w : max / h
  return { w: Math.round(w * k), h: Math.round(h * k) }
}

/**
 * Витрина (обложки услуг, аватарки) — жмём сильно: показывается мелко.
 * Рабочие файлы (вложения к заказу, чат) — мягче: это может быть скан или
 * чертёж, который человеку нужно разглядеть.
 */
export const SHOWCASE = { maxSide: 1600, quality: 0.82 }
export const WORK_FILE = { maxSide: 2200, quality: 0.88 }

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>(res => canvas.toBlob(res, type, quality))

export interface CompressOptions {
  /** Максимальная сторона результата, px. */
  maxSide: number
  /** Качество WebP/JPEG, 0…1. */
  quality?: number
}

/**
 * Возвращает сжатую копию картинки. Не картинки, GIF (анимация) и всё, что не
 * удалось прочитать, возвращаются как есть — сжатие никогда не ломает загрузку.
 */
export async function compressImage(file: File, { maxSide, quality = 0.82 }: CompressOptions): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file

  try {
    // imageOrientation: снимки с телефона несут поворот в EXIF — без этого
    // портретные фото легли бы на бок.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const { w, h } = fitSize(bitmap.width, bitmap.height, maxSide)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // Белая подложка: JPEG прозрачность не умеет, и без заливки прозрачные
    // места стали бы чёрными.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    // Проверяем, что получилось на самом деле: браузер, который не умеет
    // кодировать webp, по стандарту молча отдаёт PNG — а PNG для фотографии
    // тяжелее оригинала в разы. Тип берём из самого результата, а не из запроса.
    let blob = await encode(canvas, 'image/webp', quality)
    if (blob?.type !== 'image/webp') blob = await encode(canvas, 'image/jpeg', quality)
    if (!blob || blob.size >= file.size) return file   // уже лёгкое — не трогаем

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext
    return new File([blob], name, { type: blob.type, lastModified: Date.now() })
  } catch {
    return file
  }
}
