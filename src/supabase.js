import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseEnabled = Boolean(url && anon && !url.includes('YOUR-PROJECT-REF'))

export const supabase = supabaseEnabled
  ? createClient(url, anon, {
      realtime: { params: { eventsPerSecond: 5 } }
    })
  : null

export const LONG_DRIVE_TABLE = 'long_drive_records'

// Supabase 연결 실패 시 사용할 샘플 데이터
export const SAMPLE_LONG_DRIVE = [
  { id: 's1', name: '김민준', phone_tail: '1234', gender: 'male', distance: 312, created_at: '2026-05-08T09:10:00Z' },
  { id: 's2', name: '이서연', phone_tail: '5678', gender: 'female', distance: 248, created_at: '2026-05-08T09:25:00Z' },
  { id: 's3', name: '박지후', phone_tail: '9012', gender: 'male', distance: 298, created_at: '2026-05-08T09:40:00Z' },
  { id: 's4', name: '정하늘', phone_tail: '3456', gender: 'female', distance: 232, created_at: '2026-05-08T10:00:00Z' },
  { id: 's5', name: '한지우', phone_tail: '7890', gender: 'male', distance: 285, created_at: '2026-05-08T10:20:00Z' },
  { id: 's6', name: '최유진', phone_tail: '2345', gender: 'female', distance: 218, created_at: '2026-05-08T10:35:00Z' }
]
