import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import QRCode from 'qrcode'
import { api } from '../convex/_generated/api'

const NODES = ['intake','research','naming','review','copy','engineer','publish','voice','invoice','qa','learn']
const LABEL = { intake:'Intake', research:'Research', naming:'Naming', review:'Review', copy:'Copy', engineer:'Engineer', publish:'Publish', voice:'Voice', invoice:'Invoice', qa:'QA', learn:'Learn' }
const NODE_MODEL = { research:'Linkup', engineer:'GPT-5.6 Sol', voice:'ElevenLabs', invoice:'Dodo' }
const COLORS = { done:'#7FB069', started:'#F5A623', working:'#F5A623', failed:'#E4572E', rejected:'#E4572E', revised:'#7FB5C9' }
// status is NEVER color-alone: every status carries a glyph + a text label too
const NGLYPH = { done:'✓', started:'▲', working:'▲', failed:'✕', rejected:'✕', revised:'↺' }
const JOB = {
  working:  { c:'var(--accent)', g:'▲', label:'WORKING' },
  queued:   { c:'var(--faint)',  g:'○', label:'QUEUED' },
  delivered:{ c:'var(--green)',  g:'✓', label:'DELIVERED' },
  paid:     { c:'var(--violet)', g:'◆', label:'PAID' },
  failed:   { c:'var(--red)',    g:'✕', label:'FAILED' },
}
const jobMeta = (s) => JOB[s] || { c:'var(--faint)', g:'·', label:(s || 'unknown').toUpperCase() }
const col = (s) => COLORS[s] || '#3A322A'
const money = (n) => (n == null ? '—' : '$' + Number(n).toFixed(2))

const rel = (ts) => {
  if (!ts) return '—'
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}
const fmtDur = (sec) => {
  if (sec == null) return '—'
  if (sec < 60) return sec.toFixed(0) + 's'
  const m = Math.floor(sec / 60), s = Math.round(sec % 60)
  return m + 'm' + (s ? ' ' + s + 's' : '')
}
const readRun = () => {
  const m = /run=([^&]+)/.exec(location.hash) || /run=([^&]+)/.exec(location.search)
  return m ? decodeURIComponent(m[1]) : null
}

export default function MissionControl() {
  const jobsRaw = useQuery(api.jobs.listJobs)
  const jobs = jobsRaw || []
  const loading = jobsRaw === undefined
  const active = useQuery(api.jobs.getActiveJob)
  const delta = useQuery(api.jobs.latestVerticalWithDelta)
  const leads = useQuery(api.jobs.leadCount) ?? 0
  const enqueueBatch = useMutation(api.autopilot.enqueueBatch)

  // Deep-linkable selection: #run=<id> survives refresh + is shareable.
  const [selectedJobId, setSelectedJobId] = useState(readRun)

  // Commission QR — generated LOCALLY in the bundle so the projector's "scan me"
  // hook never depends on venue wifi reaching an external QR service.
  const [qrSrc, setQrSrc] = useState(null)
  useEffect(() => {
    const on = () => setSelectedJobId(readRun())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => {
    const h = selectedJobId ? '#run=' + selectedJobId : ' '
    if (selectedJobId && location.hash !== h) history.replaceState(null, '', h)
    if (!selectedJobId && location.hash) history.replaceState(null, '', location.pathname + location.search)
  }, [selectedJobId])

  // live elapsed ticker (only matters for a working run)
  const [, setNow] = useState(0)
  useEffect(() => { const t = setInterval(() => setNow((n) => n + 1), 1000); return () => clearInterval(t) }, [])

  // Effective run on the stage: an explicit click wins; otherwise the active
  // working job. If neither exists -> the stage shows the designed IDLE state
  // rather than a stale delivered job.
  const explicit = selectedJobId ? jobs.find((j) => j._id === selectedJobId) : null
  const shown = explicit || active || null
  const shownId = shown?._id

  const eventsRaw = useQuery(api.jobs.jobEvents, shown ? { jobId: shown._id } : 'skip')
  const events = eventsRaw || []
  const dagLoading = !!shown && eventsRaw === undefined

  const nodeStatus = {}
  events.forEach((e) => { nodeStatus[e.node] = e.status })
  const feed = [...events].reverse().slice(0, 7)
  const clientUrl = location.origin + '/?client'

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(clientUrl, { margin: 2, width: 380, color: { dark: '#f2ead9', light: '#1e1913' } })
      .then((url) => { if (alive) setQrSrc(url) })
      .catch(() => {}) // fall back to the external service render below
    return () => { alive = false }
  }, [clientUrl])

  // queue counts + heartbeat
  const counts = jobs.reduce((a, j) => { a[j.status] = (a[j.status] || 0) + 1; return a }, {})
  const doneCount = (counts.delivered || 0) + (counts.paid || 0)
  const latestActivity = jobs.reduce((m, j) => Math.max(m, j.lastEventAt || j._creationTime || 0), 0) || null

  const jm = shown ? jobMeta(shown.status) : null
  const finished = shown && (shown.status === 'delivered' || shown.status === 'paid')
  let durSec = null
  if (shown?.startedAt) {
    const end = shown.status === 'working' ? Date.now() : (shown.lastEventAt ?? Date.now())
    durSec = Math.max(0, (end - shown.startedAt) / 1000)
  }

  // keyboard traversal of the queue (up/down move focus, Enter/Space select natively)
  const rowRefs = useRef([])
  const onListKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const els = rowRefs.current.filter(Boolean)
    const i = els.indexOf(document.activeElement)
    let next = (i < 0 ? 0 : i) + (e.key === 'ArrowDown' ? 1 : -1)
    next = Math.max(0, Math.min(els.length - 1, next))
    els[next]?.focus()
  }

  return (
    <div className="mc">
      <header className="mc-head">
        <div className="wordmark">MERCURY <span className="glyph">☿</span> WORKS</div>
        <div className="stats">
          <button className="autopilot-btn" onClick={() => enqueueBatch({ count: 3 })} title="Ship 3 more real sites — uncapped overflow points">Autopilot ▶</button>
          <div className="stat"><span>JOBS</span><b>{jobs.length}</b></div>
          <div className="stat"><span>SIGNUPS</span><b>{leads}</b></div>
          <div className="stat"><span>MODEL</span><b>GPT-5.6 Sol</b></div>
        </div>
      </header>

      <div className="mc-body">
        {/* ---- the stage: selected run's DAG, or the idle reactor ---- */}
        <section className="stage">
          {shown ? (
            <>
              <div className="stage-head">
                <div className="rtitle">
                  <span className="brief">{shown.brief}</span>
                  <span className={'badge s-' + shown.status}>{jm.g} {jm.label}</span>
                </div>
                <div className="rmeta">
                  <span className="rid">RUN {String(shown._id).slice(-6).toUpperCase()}</span>
                  <span className="rsep">·</span>
                  <span>started {rel(shown.startedAt || shown._creationTime)}</span>
                  <span className="rsep">·</span>
                  <span className="rdur">{fmtDur(durSec)}</span>
                  {finished && (
                    <button className="commission" onClick={() => enqueueBatch({ count: 1 })}>
                      commission a new run →
                    </button>
                  )}
                </div>
              </div>

              {dagLoading ? (
                <div className="dag" data-dag-pane>
                  {NODES.map((n, i) => (
                    <div key={n} className="node sk" style={{ animationDelay: (i * 0.05) + 's' }}>
                      <span className="sk-line" style={{ width: '58%' }} />
                      <span className="sk-line short" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dag" data-dag-pane key={shownId}>
                  {NODES.map((n, i) => {
                    const s = nodeStatus[n]
                    const pulsing = s === 'started' || s === 'working'
                    return (
                      <div
                        key={n}
                        data-node={n}
                        data-status={pulsing ? 'running' : (s || 'idle')}
                        className={'node' + (pulsing ? ' pulse' : '') + (s === 'done' ? ' done' : '')}
                        style={{ borderColor: col(s), animationDelay: (i * 0.03) + 's' }}
                      >
                        <div className="ntop">
                          <span className="ndot" style={{ background: col(s) }} />
                          <span className="nglyph" style={{ color: s ? col(s) : 'var(--faint)' }}>{NGLYPH[s] || '·'}</span>
                        </div>
                        <div className="nname">{LABEL[n]}</div>
                        <div className="nmodel">{NODE_MODEL[n] || 'GPT-5.6 Sol'}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="feed">
                {feed.length === 0 && !dagLoading && (
                  <div className="fline fempty">awaiting first event on this run…</div>
                )}
                {feed.map((e, i) => (
                  <div key={e._id} className="fline" style={{ opacity: 1 - i * 0.11 }}>
                    <span className="fdot" style={{ background: col(e.status) }} />
                    <b>{LABEL[e.node] || e.node}</b> <em>{e.status}</em> {e.note}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="idle">
              <div className="big-glyph">☿</div>
              <p>The agency is open — scan to commission</p>
              <button className="idle-hint" onClick={() => enqueueBatch({ count: 3 })}>or hit Autopilot ▶</button>
            </div>
          )}
        </section>

        {/* ---- right rail: commission QR, learning delta, the live queue ---- */}
        <aside className="rail">
          <div className="qr-card">
            <img className="qr" alt="commission QR — scan to file a brief" src={qrSrc || ('https://api.qrserver.com/v1/create-qr-code/?size=380x380&margin=8&bgcolor=1e1913&color=f2ead9&data=' + encodeURIComponent(clientUrl))} />
            <div className="qr-cap">commission the agency</div>
          </div>

          {delta && delta.rows && delta.rows.length >= 2 && (
            <div className="delta">
              <div className="delta-h">LEARNING DELTA · {delta.vertical}</div>
              <div className="delta-row">
                <div className="dcell"><span>job 1</span><b>{delta.rows[0].durationS ?? '—'}s</b><b>{money(delta.rows[0].costUsd)}</b></div>
                <div className="arrow">→</div>
                <div className="dcell win"><span>job 2</span><b>{delta.rows[1].durationS ?? '—'}s</b><b>{money(delta.rows[1].costUsd)}</b></div>
              </div>
            </div>
          )}

          <div className="queue" onKeyDown={onListKey}>
            <div className="queue-h">
              <span className="board-h">JOB QUEUE</span>
              <div className="qcounts">
                <div className="qcount"><b>{counts.working || 0}</b><span>RUN</span></div>
                <div className="qcount"><b>{counts.queued || 0}</b><span>QUEUE</span></div>
                <div className="qcount"><b>{doneCount}</b><span>DONE</span></div>
              </div>
            </div>

            <div className="qlist" role="listbox" aria-label="Job queue">
              {loading
                ? Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="qrow sk-row"><span className="sk-line" style={{ width: (75 - i * 6) + '%' }} /></div>
                  ))
                : jobs.length === 0
                  ? <div className="q-empty">Queue is empty — scan the QR to file the first brief.</div>
                  : jobs.map((j, i) => {
                      const m = jobMeta(j.status)
                      const sel = j._id === shownId
                      return (
                        <button
                          key={j._id}
                          ref={(el) => (rowRefs.current[i] = el)}
                          type="button"
                          role="option"
                          aria-selected={sel}
                          className={'qrow' + (sel ? ' sel' : '')}
                          onClick={() => setSelectedJobId(j._id)}
                        >
                          <span className="qglyph" style={{ color: m.c }}>{m.g}</span>
                          <span className="qmain">
                            <span className="qbrief">{j.brief}</span>
                            <span className="qsub">
                              <span className="qstat" style={{ color: m.c }}>{m.label}</span>
                              <span className="qsep">·</span>
                              <span className="qtime">{rel(j.lastEventAt || j._creationTime)}</span>
                            </span>
                          </span>
                        </button>
                      )
                    })}
            </div>
          </div>
        </aside>
      </div>

      {/* ---- heartbeat line: the room's live pulse ---- */}
      <footer className="mc-foot">
        <span className="foot-item"><i className="fh" />{counts.working || 0} active worker{(counts.working || 0) === 1 ? '' : 's'}</span>
        <span className="foot-sep">·</span>
        <span className="foot-item">{jobs.length} jobs on the board</span>
        <span className="foot-sep">·</span>
        <span className="foot-item">{doneCount} shipped</span>
        <span className="foot-item foot-right">last activity {rel(latestActivity)}</span>
      </footer>
    </div>
  )
}