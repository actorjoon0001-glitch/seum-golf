import { useEffect, useRef, useState } from 'react'
import { useLongDriveBoard, insertLongDrive, clearLongDrive } from '../hooks/useLeaderboard.js'
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
        distance: Math.round(num)
      })
      setName('')
      setPhone('')
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

function TopBox() {
  const board = useLongDriveBoard()
  const top = board.top
  return (
    <div className="top-box">
      <div className="top-box-title">현재 장거리 1위</div>
      {top ? (
        <div className="top-box-body">
          <div className="tb-name">{top.name} <span className="muted">{top.phone_tail}</span></div>
          <div className="tb-val">{top.distance}<span className="muted"> m</span></div>
        </div>
      ) : (
        <div className="muted">기록 없음</div>
      )}
      <ol className="mini-list">
        {board.top5.map((r, i) => (
          <li key={r.id}>
            <span>{i + 1}</span>
            <span>{r.name}</span>
            <span>{r.distance} m</span>
          </li>
        ))}
      </ol>
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
      <p className="bp-desc">30분마다 자동 재생 · TV 화면에서 "방송 시작" 1회 클릭 필수</p>

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
        <TopBox />
        <button className="danger" onClick={reset}>장거리 기록 초기화</button>
        <BroadcastPanel />
      </div>

      <footer className="admin-footer">
        <a href="/" target="_blank" rel="noreferrer">TV 송출 화면 열기 →</a>
      </footer>
    </div>
  )
}
