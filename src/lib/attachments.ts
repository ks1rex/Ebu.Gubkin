export interface Attachment { url: string; name: string; type: string }

export const MAX_ATTACHMENTS = 6          // столько же проверяет бэкенд
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export const isImage = (a: Attachment) => a.type.startsWith('image/')

// Чатовые вложения (message_attachments) хранят только file_name — MIME-типа
// там нет, поэтому картинку там определяем по расширению.
export const isImageName = (name: string) => /\.(jpe?g|png|webp|gif)$/i.test(name)
