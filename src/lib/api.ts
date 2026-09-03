import { supabase } from './supabase'

const BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function apiCall(method: string, path: string, body?: unknown): Promise<any> {
  const token = await getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  let fetchBody: BodyInit | undefined
  if (body instanceof FormData) {
    fetchBody = body
  } else if (body != null) {
    headers['Content-Type'] = 'application/json'
    fetchBody = JSON.stringify(body)
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: fetchBody })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const e: any = new Error(err.error ?? `HTTP ${res.status}`)
    e.data = err
    e.status = res.status
    throw e
  }
  return res.json()
}

// fetch не даёт событий прогресса аплоада — только XHR умеет xhr.upload.onprogress.
// Нужен отдельно от apiCall только там, где важно показать, сколько уже
// загрузилось (вложения в чат): без этого при большом файле на медленной
// сети непонятно, сайт завис или всё ещё грузит.
export function apiUpload(method: string, path: string, form: FormData, onProgress?: (pct: number) => void): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const token = await getToken()
    const xhr = new XMLHttpRequest()
    xhr.open(method, `${BASE}${path}`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onerror = () => reject(new Error('Ошибка сети'))
    xhr.onload = () => {
      let body: any = {}
      try { body = JSON.parse(xhr.responseText) } catch { /* пустой/нестандартный ответ */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body)
      } else {
        const e: any = new Error(body.error ?? `HTTP ${xhr.status}`)
        e.data = body
        reject(e)
      }
    }
    xhr.send(form)
  })
}
