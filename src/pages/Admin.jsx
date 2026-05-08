import { useState } from 'react'
import { useLeaderboard, insertRecord, clearRecords } from '../hooks/useLeaderboard.js'
import { supabaseEnabled } from '../supabase.js'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'seum1234'

function Login({ onOk }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  return (
    <div className="admin-login">
      <h1>관리자 로그인</h1>
      <p className="muted">세움 체험존 이벤트 관리자 페이지</p>
      <input
        type="password"
        placeholder="비밀번호"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (pw === ADMIN_PASSWORD ? onOk() : setErr('비밀번호가 올바르지 않습니다'))}
      />
      <button
        onClick={() => (pw === ADMIN_PASSWORD ? onOk() : setErr('비밀번호가 올바르지 않습니다'))}
      >
        입장
      </button>
      {err && <div className="error">{err}</div>}
    </div>
  )
}

function RecordForm({ kind, onSaved }) {
  const isLong = kind === 'longDrive'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    if (!name.trim() || !phone.trim() || !value.trim()) {
      setMsg({ type: 'error', text: '모든 항목을 입력하세요' })
      return
    }
    if (!/^\d{4}$/.test(phone)) {
      setMsg({ type: 'error', text: '연락처 뒷자리 4자리를 입력하세요' })
      return
    }
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) {
      setMsg({ type: 'error', text: isLong ? '유효한 거리(m)를 입력하세요' : '유효한 점수를 입력하세요' })
      return
    }
    setSaving(true)
    try {
      const payload = isLong
        ? { name: name.trim(), phone_tail: phone.trim(), distance: Math.round(num) }
        : { name: name.trim(), phone_tail: phone.trim(), score: Math.round(num) }
      const saved = await insertRecord(kind, payload)
      onSaved && onSaved(saved)
      setName('')
      setPhone('')
      setValue('')
      setMsg({ type: 'ok', text: '저장되었습니다' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message || '저장 실패' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="record-form" onSubmit={submit}>
      <h2>{isLong ? '장거리 기록 입력' : '노래방 기록 입력'}</h2>
      <label>
        <span>이름</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" autoComplete="off" />
      </label>
      <label>
        <span>연락처 뒷자리 4자리</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="1234"
          inputMode="numeric"
          autoComplete="off"
        />
      </label>
      <label>
        <span>{isLong ? '거리 (m)' : '점수 (점)'}</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
          placeholder={isLong ? '예) 285' : '예) 95'}
          inputMode="numeric"
        />
      </label>
      <button type="submit" disabled={saving}>
        {saving ? '저장 중...' : '저장'}
      </button>
      {msg && <div className={msg.type === 'ok' ? 'ok' : 'error'}>{msg.text}</div>}
    </form>
  )
}

function TopBox({ kind }) {
  const board = useLeaderboard(kind)
  const isLong = kind === 'longDrive'
  const top = board.top
  return (
    <div className="top-box">
      <div className="top-box-title">{isLong ? '현재 장거리 1위' : '현재 노래방 1위'}</div>
      {top ? (
        <div className="top-box-body">
          <div className="tb-name">{top.name} <span className="muted">{top.phone_tail}</span></div>
          <div className="tb-val">
            {isLong ? top.distance : top.score}
            <span className="muted"> {isLong ? 'm' : '점'}</span>
          </div>
        </div>
      ) : (
        <div className="muted">기록 없음</div>
      )}
      <ol className="mini-list">
        {board.top5.map((r, i) => (
          <li key={r.id}>
            <span>{i + 1}</span>
            <span>{r.name}</span>
            <span>{isLong ? r.distance + ' m' : r.score + ' 점'}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)

  async function reset(kind) {
    const label = kind === 'longDrive' ? '장거리' : '노래방'
    if (!confirm(`${label} 기록을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    try {
      await clearRecords(kind)
      alert(`${label} 기록이 초기화되었습니다`)
    } catch (e) {
      alert('초기화 실패: ' + (e.message || e))
    }
  }

  if (!authed) return <Login onOk={() => setAuthed(true)} />

  return (
    <div className="admin-root">
      <header className="admin-header">
        <h1>이벤트 기록 관리</h1>
        <div className="admin-sub">프로골퍼를 이겨라 · 세움 체험존</div>
        {!supabaseEnabled && (
          <div className="warn">⚠ Supabase가 설정되지 않았습니다. .env 파일에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 입력하세요.</div>
        )}
      </header>

      <div className="admin-grid">
        <div className="admin-col">
          <RecordForm kind="longDrive" />
          <TopBox kind="longDrive" />
          <button className="danger" onClick={() => reset('longDrive')}>장거리 기록 초기화</button>
        </div>
        <div className="admin-col">
          <RecordForm kind="karaoke" />
          <TopBox kind="karaoke" />
          <button className="danger" onClick={() => reset('karaoke')}>노래방 기록 초기화</button>
        </div>
      </div>

      <footer className="admin-footer">
        <a href="/" target="_blank" rel="noreferrer">TV 송출 화면 열기 →</a>
      </footer>
    </div>
  )
}
