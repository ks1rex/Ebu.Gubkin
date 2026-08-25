import { useState } from 'react'
import { Attachment, MAX_ATTACHMENTS } from './attachments'
import { uploadForumFile } from './forumMedia'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export function useForumAttachments() {
  const { user } = useAuth()
  const showToast = useToast()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!picked.length || !user) return

    const free = MAX_ATTACHMENTS - attachments.length
    if (picked.length > free) showToast(`Можно прикрепить не больше ${MAX_ATTACHMENTS} файлов`, 'error')
    if (free <= 0) return

    setUploading(true)
    const added: Attachment[] = []
    for (const file of picked.slice(0, free)) {
      const uploaded = await uploadForumFile(file, user.id)
      if (uploaded) added.push(uploaded)
      else showToast(`Не удалось загрузить «${file.name}»`, 'error')
    }
    setAttachments(a => [...a, ...added])
    setUploading(false)
  }

  function removeAttachment(url: string) {
    setAttachments(a => a.filter(x => x.url !== url))
  }

  function reset() {
    setAttachments([])
  }

  return { attachments, uploading, handleFiles, removeAttachment, reset }
}
