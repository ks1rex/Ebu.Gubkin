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
    throw e
  }
  return res.json()
}
