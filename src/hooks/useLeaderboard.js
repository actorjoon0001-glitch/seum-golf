import { useEffect, useRef, useState } from 'react'
import { supabase, supabaseEnabled, LONG_DRIVE_TABLE, SAMPLE_LONG_DRIVE } from '../supabase.js'

// 정렬: 거리 내림차순, created_at 오름차순(먼저 등록한 사람 우선)
function sortRecords(rows) {
  return [...rows].sort((a, b) => {
    const diff = (b.distance ?? 0) - (a.distance ?? 0)
    if (diff !== 0) return diff
    const ta = new Date(a.created_at).getTime() || 0
    const tb = new Date(b.created_at).getTime() || 0
    return ta - tb
  })
}

export function useLongDriveBoard() {
  const [rows, setRows] = useState(() => sortRecords(SAMPLE_LONG_DRIVE))
  const [usingSample, setUsingSample] = useState(!supabaseEnabled)
  const [newRecordId, setNewRecordId] = useState(null)
  const lastTopRef = useRef(rows[0]?.distance ?? -Infinity)

  useEffect(() => {
    if (!supabaseEnabled) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from(LONG_DRIVE_TABLE)
        .select('*')
        .order('distance', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(50)
      if (cancelled) return
      if (error || !data) {
        setUsingSample(true)
        return
      }
      setUsingSample(false)
      const sorted = sortRecords(data)
      setRows(sorted)
      lastTopRef.current = sorted[0]?.distance ?? -Infinity
    }
    load()

    const channel = supabase
      .channel(`realtime-${LONG_DRIVE_TABLE}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: LONG_DRIVE_TABLE }, (payload) => {
        setRows((prev) => {
          let next = prev
          if (payload.eventType === 'INSERT') {
            next = [...prev.filter((r) => r.id !== payload.new.id), payload.new]
          } else if (payload.eventType === 'UPDATE') {
            next = prev.map((r) => (r.id === payload.new.id ? payload.new : r))
          } else if (payload.eventType === 'DELETE') {
            next = prev.filter((r) => r.id !== payload.old.id)
          }
          const sorted = sortRecords(next)
          const topVal = sorted[0]?.distance ?? -Infinity
          if (topVal > lastTopRef.current && sorted[0]) {
            setNewRecordId(sorted[0].id)
            setTimeout(() => setNewRecordId(null), 5000)
            lastTopRef.current = topVal
          }
          return sorted
        })
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const male = rows.filter((r) => r.gender === 'male')
  const female = rows.filter((r) => r.gender === 'female')
  return {
    rows,
    top: rows[0],
    top5: rows.slice(0, 5),
    male: { top: male[0], top5: male.slice(0, 5) },
    female: { top: female[0], top5: female.slice(0, 5) },
    usingSample,
    newRecordId
  }
}

export async function insertLongDrive({ name, phone_tail, gender, distance }) {
  if (!supabaseEnabled) {
    throw new Error('Supabase가 설정되지 않았습니다. .env 파일을 확인하세요.')
  }
  if (gender !== 'male' && gender !== 'female') {
    throw new Error('성별(남/여)을 선택하세요.')
  }
  const { data, error } = await supabase
    .from(LONG_DRIVE_TABLE)
    .insert([{ name, phone_tail, gender, distance, created_at: new Date().toISOString() }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLongDrive(id, fields) {
  if (!supabaseEnabled) throw new Error('Supabase가 설정되지 않았습니다.')
  const { data, error } = await supabase
    .from(LONG_DRIVE_TABLE)
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLongDrive(id) {
  if (!supabaseEnabled) throw new Error('Supabase가 설정되지 않았습니다.')
  const { error } = await supabase.from(LONG_DRIVE_TABLE).delete().eq('id', id)
  if (error) throw error
}

export async function clearLongDrive() {
  if (!supabaseEnabled) {
    throw new Error('Supabase가 설정되지 않았습니다.')
  }
  const { error } = await supabase
    .from(LONG_DRIVE_TABLE)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
}
