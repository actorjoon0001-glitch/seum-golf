import { useEffect, useRef, useState } from 'react'
import { useLongDriveBoard, insertLongDrive, updateLongDrive, deleteLongDrive, clearLongDrive } from '../hooks/useLeaderboard.js'
import { supabaseEnabled } from '../supabase.js'
import { broadcast, AUDIO_URL, INTERVAL_MS } from '../broadcast.js'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'seum1234'

function Login({ onOk }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  function tryEnter() {
    if (pw === ADMIN_PASSWORD) onOk()
    else setErr('비밀번호가 올바르지 않습니다')
  }
  return (
    <div className="admin-login">
      <h1>관리자 로그인</h1>
      <p className="muted">세움 체험존 이벤트 관리자 페이지</p>
      <input
        type="password"
        placeholder="비밀번호"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && tryEnter()}
      />
      <button onClick={tryEnter}>입장</button>
      {err && <div className="error">{err}</div>}
    </div>
  )
}

function LongDriveForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [distance, setDistance] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    if (!name.trim() || !phone.trim() || !distance.trim()) {
      setMsg({ type: 'error', text: '모든 항목을 입력하세요' })
      return
    }
    if (gender !== 'male' && gender !== 'female') {
      setMsg({ type: 'error', text: '성별(남/여)을 선택하세요' })
      return
    }
    if (!/^\d{4}$/.test(phone)) {
      setMsg({ type: 'error', text: '연락처 뒷자리 4자리를 입력하세요' })
      return
    }
    const num = Number(distance)
    if (!Number.isFinite(num) || num <= 0) {
      setMsg({ type: 'error', text: '유효한 거리(m)를 입력하세요' })
      return
    }
    setSaving(true)
    try {
      await insertLongDrive({
        name: name.trim(),
        phone_tail: phone.trim(),
        gender,
        distance: Math.round(num)
      })
      setName('')
      setPhone('')
      setGender('')
      setDistance('')
      setMsg({ type: 'ok', text: '저장되었습니다' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message || '저장 실패' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="record-form" onSubmit={submit}>
      <h2>장거리 기록 입력</h2>
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
      <div className="gender-row">
        <span>성별</span>
        <div className="gender-options">
          <button
            type="button"
            className={`gender-btn ${gender === 'male' ? 'active male' : ''}`}
            onClick={() => setGender('male')}
          >
            남자
          </button>
          <button
            type="button"
            className={`gender-btn ${gender === 'female' ? 'active female' : ''}`}
            onClick={() => setGender('female')}
          >
            여자
          </button>
        </div>
      </div>
      <label>
        <span>거리 (m)</span>
        <input
          value={distance}
          onChange={(e) => setDistance(e.target.value.replace(/[^\d.]/g, ''))}
          placeholder="예) 285"
          inputMode="numeric"
        />
      </label>
      <button type="submit" disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
      {msg && <div className={msg.type === 'ok' ? 'ok' : 'error'}>{msg.text}</div>}
    </form>
  )
}

function RecordManager() {
  const board = useLongDriveBoard()
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', phone_tail: '', gender: '', distance: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  function startEdit(r) {
    setEditId(r.id)
    setEditForm({ name: r.name, phone_tail: r.phone_tail, gender: r.gender || '', distance: String(r.distance) })
    setErr(null)
  }
  function cancelEdit() {
    setEditId(null)
    setErr(null)
  }
  async function saveEdit() {
    if (!editForm.name.trim()) { setErr('이름을 입력하세요'); return }
    if (!/^\d{4}$/.test(editForm.phone_tail)) { setErr('연락처 뒷자리 4자리'); return }
    if (editForm.gender !== 'male' && editForm.gender !== 'female') { setErr('성별을 선택하세요'); return }
    const dist = Number(editForm.distance)
    if (!Number.isFinite(dist) || dist <= 0) { setErr('유효한 거리(m)'); return }
    setBusy(true)
    setErr(null)
    try {
      await updateLongDrive(editId, {
        name: editForm.name.trim(),
        phone_tail: editForm.phone_tail,
        gender: editForm.gender,
        distance: Math.round(dist)
      })
      setEditId(null)
    } catch (e) {
      setErr('저장 실패: ' + (e?.message || e))
    } finally {
      setBusy(false)
    }
  }
  async function del(r) {
    if (!confirm(`${r.name} (${r.phone_tail}) · ${r.distance}m 기록을 삭제할까요?`)) return
    try {
      await deleteLongDrive(r.id)
    } catch (e) {
      alert('삭제 실패: ' + (e?.message || e))
    }
  }

  const list = board.rows.slice(0, 30)
  const maleTop = board.male.top
  const femaleTop = board.female.top

  return (
    <div className="record-manager">
      <h2>기록 관리</h2>
      <div className="rm-hint">거리(m) 내림차순 · 동점은 먼저 등록한 사람 우선 · 남/여 부문 분리</div>

      <div className="rm-top-pair">
        <div className="rm-top male">
          <div className="rm-top-label">남자 1위</div>
          {maleTop ? (
            <div className="rm-top-body">
              <span className="rm-top-name">{maleTop.name} <em>{maleTop.phone_tail}</em></span>
              <span className="rm-top-val">{maleTop.distance}<em> m</em></span>
            </div>
          ) : (
            <div className="rm-top-body muted">기록 없음</div>
          )}
        </div>
        <div className="rm-top female">
          <div className="rm-top-label">여자 1위</div>
          {femaleTop ? (
            <div className="rm-top-body">
              <span className="rm-top-name">{femaleTop.name} <em>{femaleTop.phone_tail}</em></span>
              <span className="rm-top-val">{femaleTop.distance}<em> m</em></span>
            </div>
          ) : (
            <div className="rm-top-body muted">기록 없음</div>
          )}
        </div>
      </div>

      <ul className="rm-list">
        {list.length === 0 && <li className="rm-empty">기록 없음</li>}
        {list.map((r, i) => (
          <li key={r.id} className={editId === r.id ? 'editing' : ''}>
            {editId === r.id ? (
              <div className="rm-edit">
                <div className="rm-edit-grid">
                  <span className="rm-rank">{i + 1}</span>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="이름"
                    autoFocus
                  />
                  <input
                    value={editForm.phone_tail}
                    onChange={(e) => setEditForm({ ...editForm, phone_tail: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="1234"
                    inputMode="numeric"
                  />
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  >
                    <option value="">성별</option>
                    <option value="male">남</option>
                    <option value="female">여</option>
                  </select>
                  <input
                    value={editForm.distance}
                    onChange={(e) => setEditForm({ ...editForm, distance: e.target.value.replace(/\D/g, '') })}
                    placeholder="거리(m)"
                    inputMode="numeric"
                  />
                </div>
                <div className="rm-edit-actions">
                  <button onClick={saveEdit} disabled={busy}>{busy ? '저장 중...' : '저장'}</button>
                  <button className="secondary" onClick={cancelEdit} disabled={busy}>취소</button>
                </div>
                {err && <div className="error">{err}</div>}
              </div>
            ) : (
              <div className="rm-row">
                <span className="rm-rank">{i + 1}</span>
                <span className="rm-name">
                  <span className={`rm-gender ${r.gender || ''}`}>{r.gender === 'female' ? '여' : r.gender === 'male' ? '남' : '?'}</span>
                  {r.name} <em>{r.phone_tail}</em>
                </span>
                <span className="rm-val">{r.distance} <em>m</em></span>
                <div className="rm-row-actions">
                  <button className="rm-edit-btn" onClick={() => startEdit(r)}>수정</button>
                  <button className="rm-del-btn" onClick={() => del(r)}>삭제</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {board.rows.length > list.length && (
        <div className="rm-more muted">상위 {list.length}개 표시 중 (총 {board.rows.length}건)</div>
      )}
    </div>
  )
}

function BroadcastPanel() {
  const [enabled, setEnabled] = useState(broadcast.getEnabled())
  const [volume, setVolume] = useState(broadcast.getVolume())
  const [lastAt, setLastAt] = useState(broadcast.getLastAt())
  const [now, setNow] = useState(Date.now())
  const [status, setStatus] = useState(null)
  const testAudioRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now())
      setLastAt(broadcast.getLastAt())
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const off1 = broadcast.on('played', ({ at }) => setLastAt(Number(at) || 0))
    const off2 = broadcast.on('enabled', ({ value }) => setEnabled(Boolean(value)))
    const off3 = broadcast.on('volume', ({ value }) => setVolume(Number(value) || 0))
    return () => { off1(); off2(); off3() }
  }, [])

  const next = lastAt > 0 ? lastAt + INTERVAL_MS : 0
  const remainingMs = Math.max(0, next - now)
  const remainMin = Math.floor(remainingMs / 60000)
  const remainSec = Math.floor((remainingMs % 60000) / 1000)

  function toggle(b) {
    setEnabled(b)
    broadcast.setEnabled(b)
  }
  function changeVolume(v) {
    setVolume(v)
    broadcast.setVolume(v)
  }
  function playNow() {
    broadcast.triggerNow()
    setStatus('TV에 송출 명령을 전송했습니다')
    setTimeout(() => setStatus(null), 4000)
  }
  async function testPlay() {
    setStatus(null)
    try {
      if (testAudioRef.current) {
        testAudioRef.current.pause()
        testAudioRef.current.currentTime = 0
      }
      const audio = new Audio(AUDIO_URL)
      audio.volume = Math.max(0, Math.min(1, volume / 100))
      testAudioRef.current = audio
      const onEnded = () => setStatus('테스트 재생 완료')
      const onError = () => setStatus('파일 로드 실패: public/audio/notice-golf.mp3 확인')
      audio.addEventListener('ended', onEnded, { once: true })
      audio.addEventListener('error', onError, { once: true })
      await audio.play()
      setStatus('테스트 재생 중 (이 기기에서만 들립니다)')
    } catch (e) {
      setStatus('재생 실패: ' + (e?.message || e))
    }
  }
  function stopTest() {
    if (testAudioRef.current) {
      testAudioRef.current.pause()
      testAudioRef.current.currentTime = 0
    }
    setStatus('테스트 정지')
  }

  return (
    <div className="broadcast-panel">
      <h2>🔊 안내방송</h2>
      <p className="bp-desc">30초마다 자동 재생 · TV 화면에서 "방송 시작" 1회 클릭 필수</p>

      <label className="toggle-row">
        <span>안내방송 자동 재생</span>
        <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} />
      </label>

      <div className={`countdown ${enabled ? '' : 'off'}`}>
        <div className="countdown-label">다음 안내방송까지</div>
        <div className="countdown-value">
          {!enabled
            ? '자동 재생 OFF'
            : lastAt > 0
              ? remainingMs > 0
                ? `${remainMin}분 ${String(remainSec).padStart(2, '0')}초 남음`
                : '곧 송출 (TV에 명령 전달 중)'
              : 'TV 화면에서 "방송 시작" 필요'}
        </div>
      </div>

      <div className="bp-actions">
        <button onClick={playNow}>📢 지금 방송하기</button>
        <button className="secondary" onClick={testPlay}>🔉 테스트 재생</button>
        <button className="secondary" onClick={stopTest}>■ 테스트 정지</button>
      </div>

      <label className="vol-row">
        <div className="vol-row-head">
          <span>볼륨</span>
          <strong>{volume}%</strong>
        </div>
        <input type="range" min="0" max="100" value={volume} onChange={(e) => changeVolume(Number(e.target.value))} />
      </label>

      {status && <div className="bp-status">{status}</div>}
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)

  async function reset() {
    if (!confirm('장거리 기록을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return
    try {
      await clearLongDrive()
      alert('장거리 기록이 초기화되었습니다')
    } catch (e) {
      alert('초기화 실패: ' + (e.message || e))
    }
  }

  if (!authed) return <Login onOk={() => setAuthed(true)} />

  return (
    <div className="admin-root">
      <header className="admin-header">
        <h1>이벤트 기록 관리</h1>
        <div className="admin-sub">프로골퍼를 이겨라 · 세움 체험존 (스크린골프 장거리)</div>
        {!supabaseEnabled && (
          <div className="warn">⚠ Supabase가 설정되지 않았습니다. .env 파일에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 입력하세요.</div>
        )}
      </header>

      <div className="admin-single">
        <LongDriveForm />
        <RecordManager />
        <button className="danger" onClick={reset}>장거리 기록 전체 초기화</button>
        <BroadcastPanel />
      </div>

      <footer className="admin-footer">
        <a href="/" target="_blank" rel="noreferrer">TV 송출 화면 열기 →</a>
      </footer>
    </div>
  )
}
