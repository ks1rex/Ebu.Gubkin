import { supabase } from './supabase'
import { Attachment, MAX_FILE_BYTES } from './attachments'
import { compressImage, WORK_FILE } from './compressImage'

// Форумные картинки/файлы идут в тот же публичный бакет, что и медиа услуг
// (listing-media) — та же схема прав (пиши только в свою папку <uid>/...,
// читает кто угодно), заводить отдельный бакет под форум незачем.
export async function uploadForumFile(picked: File, userId: string): Promise<Attachment | null> {
  const file = picked.type.startsWith('image/') ? await compressImage(picked, WORK_FILE) : picked
  if (file.size > MAX_FILE_BYTES) return null

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/forum/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('listing-media').upload(path, file, { contentType: file.type })
  if (error) return null
  const url = supabase.storage.from('listing-media').getPublicUrl(path).data.publicUrl
  return { url, name: file.name, type: file.type }
}
