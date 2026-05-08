import { useEffect, useRef, useState } from 'react'
import { supabase, supabaseEnabled, TABLES, SAMPLE } from '../supabase.js'

// 정렬: value 내림차순, created_at 오름차순(먼저 등록한 사람 우선)
function sortRecords(rows, valueField) {
  return [...rows].sort((a, b) => {
    const diff = (b[valueField] ?? 0) - (a[valueField] ?? 0)
    if (diff !== 0) return diff
    const ta = new Date(a.created_at).getTime() || 0
    const tb = new Date(b.created_at).getTime() || 0
    return ta - tb
  })
}

export function useLeaderboard(kind) {
  // kind: 'longDrive' | 'karaoke'
  const table = TABLES[kind]
  const valueField = kind === 'longDrive' ? 'distance' : 'score'

  const [rows, setRows] = useState(() => sortRecords(SAMPLE[kind], valueField))
  const [usingSample, setUsingSample] = useState(!supabaseEnabled)
  const [newRecordId, setNewRecordId] = useState(null)
  const lastTopRef = useRef(rows[0]?.[valueField] ?? -Infinity)

  useEffect(() => {
    if (!supabaseEnabled) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(valueField, { ascending: false })
        .order('created_at', { ascending: true })
        .limit(50)
      if (cancelled) return
      if (error || !data) {
        setUsingSample(true)
        return
      }
      setUsingSample(false)
      const sorted = sortRecords(data, valueField)
      setRows(sorted)
      lastTopRef.current = sorted[0]?.[valueField] ?? -Infinity
    }
    load()

    const channel = supabase
      .channel(`realtime-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        setRows((prev) => {
          let next = prev
          if (payload.eventType === 'INSERT') {
            next = [...prev.filter((r) => r.id !== payload.new.id), payload.new]
          } else if (payload.eventType === 'UPDATE') {
            next = prev.map((r) => (r.id === payload.new.id ? payload.new : r))
          } else if (payload.eventType === 'DELETE') {
            next = prev.filter((r) => r.id !== payload.old.id)
          }
          const sorted = sortRecords(next, valueField)
          const topVal = sorted[0]?.[valueField] ?? -Infinity
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
  }, [table, valueField])

  return { rows, top: rows[0], top5: rows.slice(0, 5), usingSample, newRecordId }
}

export async function insertRecord(kind, payload) {
  const table = TABLES[kind]
  if (!supabaseEnabled) {
    throw new Error('Supabase가 설정되지 않았습니다. .env 파일을 확인하세요.')
  }
  const { data, error } = await supabase
    .from(table)
    .insert([{ ...payload, created_at: new Date().toISOString() }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function clearRecords(kind) {
  const table = TABLES[kind]
  if (!supabaseEnabled) {
    throw new Error('Supabase가 설정되지 않았습니다.')
  }
  const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
}
