import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import QRCode from 'qrcode'
import { api } from '../convex/_generated/api'

const NODES = ['intake','research','naming','review','copy','engineer','publish','voice','invoice','qa','learn']
const LABEL = { intake:'Intake', research:'Research', naming:'Naming', review:'Review', copy:'Copy', engineer:'Engineer', publish:'Publish', voice:'Voice', invoice:'Invoice', qa:'QA', learn:'Learn', deliver:'Deliver' }
const NODE_MODEL = { research:'Linkup', engineer:'GPT-5.6 Sol', voice:'ElevenLabs', invoice:'Dodo' }
// vermilion tint = in flight · moss = done · cold red = failure · glacier = revision
const COLORS = { done:'#7FB069', started:'#DF8757', working:'#DF8757', failed:'#E05252', rejected:'#E05252', revised:'#7FB5C9' }
// status is NEVER color-alone: every status carries a glyph + a text label too
const NGLYPH = { done:'✓', started:'▲', working:'▲', failed:'✕', rejected:'✕', revised:'↺' }
const JOB = {
  working:  { c:'var(--accent-lt)', g:'▲', label:'WORKING' },
  queued:   { c:'var(--faint)',     g:'○', label:'QUEUED' },
  invoiced: { c:'var(--accent-lt)', g:'$', label:'INVOICED' },   // real status: checkout created, awaiting pay
  delivered:{ c:'var(--green)',     g:'✓', label:'DELIVERED' },
  paid:     { c:'var(--violet)',    g:'◆', label:'PAID' },
  stuck:    { c:'var(--red)',       g:'✕', label:'STUCK' },      // real failure state — must read as alarm, not idle
  failed:   { c:'var(--red)',       g:'✕', label:'FAILED' },
}
const jobMeta = (s) => JOB[s] || { c:'var(--faint)', g:'·', label:(s || 'unknown').toUpperCase() }
const col = (s) => COLORS[s] || '#3A322A'
const money = (n) => (n == null ? '—' : '$' + Number(n).toFixed(2))
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const rel = (ts) => {
  if (!ts) return '—'
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}
const clock = (ts) => (ts ? new Date(ts).toLocaleTimeString([], { hour12: false }) : '—')
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

/* ── ?demo — LOCAL fixtures for layout/screenshot verification (never touches Convex).
   ?demo shows a mid-flight run + a finished run; ?demo=idle shows the empty board.
   Production (no param) is 100% live Convex data, exactly as before. ─────────── */
const DEMO_PARAM = (() => { try { return new URLSearchParams(location.search).get('demo') } catch { return null } })()
const DEMO = DEMO_PARAM !== null
const DEMO_IDLE = DEMO_PARAM === 'idle'
const T0 = Date.now()
const DEMO_JOBS = DEMO ? [
  { _id:'demo-run-1', _creationTime:T0-510e3, brief:'a subscription box for rare houseplants', clientName:'Ana K.', status:'working', startedAt:T0-420e3, lastEventAt:T0-9e3, costUsd:0.31 },
  { _id:'demo-run-2', _creationTime:T0-42*60e3, brief:'an AI notetaker for therapists', clientName:'Sam R.', status:'delivered', startedAt:T0-41*60e3, lastEventAt:T0-35*60e3, liveUrl:'https://noted-care.pages.dev', costUsd:0.27, durationS:352 },
  { _id:'demo-run-3', _creationTime:T0-2*60e3, brief:'a small-batch oat milk brand', clientName:'Jo', status:'queued', lastEventAt:T0-2*60e3 },
] : []
const DEMO_EVENTS = DEMO ? {
  'demo-run-1': [
    { _id:'d1', node:'intake',   status:'started',  note:'reading the brief…', ts:T0-420e3 },
    { _id:'d2', node:'intake',   status:'done',     note:'vertical: plants · client: Ana K.', ts:T0-408e3 },
    { _id:'d3', node:'research', status:'started',  note:'researching the rare-houseplant market…', model:'Linkup', ts:T0-400e3 },
    { _id:'d4', node:'research', status:'done',     note:'found 3 competitors · 9 cited sources', model:'Linkup', costUsd:0.04, ts:T0-345e3 },
    { _id:'d5', node:'naming',   status:'started',  note:'drafting a shortlist of names…', tokens:900, ts:T0-340e3 },
    { _id:'d6', node:'naming',   status:'rejected', note:"'Loomfolk' — domain and trademark already taken", ts:T0-300e3 },
    { _id:'d7', node:'naming',   status:'revised',  note:'regenerating around botanical latin…', ts:T0-290e3 },
    { _id:'d8', node:'naming',   status:'done',     note:"name locked: 'Verde & Vine' + tagline", costUsd:0.03, tokens:2100, ts:T0-260e3 },
    { _id:'d9', node:'review',   status:'done',     note:'MD sign-off — research + naming approved', ts:T0-250e3 },
    { _id:'d10', node:'copy',    status:'started',  note:'writing hero copy…', ts:T0-245e3 },
    { _id:'d11', node:'copy',    status:'done',     note:'hero, 3 sections + CTA drafted', costUsd:0.06, tokens:5400, ts:T0-190e3 },
    { _id:'d12', node:'engineer',status:'started',  note:'scaffolding the site…', model:'GPT-5.6 Sol', ts:T0-180e3 },
    { _id:'d13', node:'engineer',status:'started',  note:'building hero + feature sections…', ts:T0-120e3 },
    { _id:'d14', node:'engineer',status:'started',  note:'wiring the lead-capture form…', ts:T0-40e3 },
  ],
  'demo-run-2': [
    { _id:'f1', node:'intake',   status:'done', note:'vertical: healthtech · client: Sam R.', ts:T0-41*60e3 },
    { _id:'f2', node:'research', status:'done', note:'found 4 competitors · 11 cited sources', model:'Linkup', costUsd:0.05, ts:T0-40*60e3 },
    { _id:'f3', node:'naming',   status:'done', note:"name locked: 'Noted' + tagline", costUsd:0.03, tokens:1800, ts:T0-39*60e3 },
    { _id:'f4', node:'review',   status:'done', note:'MD sign-off — all upstream work approved', ts:T0-38.6*60e3 },
    { _id:'f5', node:'copy',     status:'done', note:'landing copy drafted · 4 sections', costUsd:0.05, tokens:4900, ts:T0-38*60e3 },
    { _id:'f6', node:'engineer', status:'done', note:'site built · lead form wired', model:'GPT-5.6 Sol', costUsd:0.09, tokens:12100, ts:T0-37*60e3 },
    { _id:'f7', node:'publish',  status:'done', note:'live at https://noted-care.pages.dev — HTTP 200', ts:T0-36.4*60e3 },
    { _id:'f8', node:'voice',    status:'done', note:'30s brand radio ad rendered → /ad.mp3', model:'ElevenLabs', costUsd:0.02, ts:T0-36*60e3 },
    { _id:'f9', node:'invoice',  status:'done', note:'checkout link created', model:'Dodo', ts:T0-35.6*60e3 },
    { _id:'f10', node:'qa',      status:'done', note:'HTTP 200 · form posts · audio plays', ts:T0-35.2*60e3 },
    { _id:'f11', node:'learn',   status:'done', note:'skill metrics written · healthtech v1', ts:T0-35*60e3 },
  ],
} : {}
const DEMO_DELTA = { vertical:'plants', rows:[{ durationS:312, costUsd:0.42 }, { durationS:201, costUsd:0.27 }] }

export default function MissionControl() {
  const jobsRaw = useQuery(api.jobs.listJobs)
  const activeRaw = useQuery(api.jobs.getActiveJob)
  const deltaRaw = useQuery(api.jobs.latestVerticalWithDelta)
  const leadsRaw = useQuery(api.jobs.leadCount)
  const enqueueBatch = useMutation(api.autopilot.enqueueBatch)

  const jobs = DEMO ? (DEMO_IDLE ? [] : DEMO_JOBS) : (jobsRaw || [])
  const loading = DEMO ? false : jobsRaw === undefined
  const active = DEMO ? (DEMO_IDLE ? null : DEMO_JOBS[0]) : activeRaw
  const delta = DEMO ? (DEMO_IDLE ? null : DEMO_DELTA) : deltaRaw
  const leads = DEMO ? (DEMO_IDLE ? 0 : 12) : (leadsRaw ?? 0)
  const commission = (count) => { if (DEMO) return; enqueueBatch({ count }) }

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

  const eventsRaw = useQuery(api.jobs.jobEvents, shown && !DEMO ? { jobId: shown._id } : 'skip')
  const events = DEMO ? (DEMO_EVENTS[shownId] || []) : (eventsRaw || [])
  const dagLoading = DEMO ? false : (!!shown && eventsRaw === undefined)

  /* ── TRANSPARENCY: keep EVERY event, grouped per agent (never collapsed) ── */
  const byNode = {}
  events.forEach((e) => { (byNode[e.node] = byNode[e.node] || []).push(e) })
  const nodeStatus = {}
  Object.keys(byNode).forEach((n) => { nodeStatus[n] = byNode[n][byNode[n].length - 1].status })
  // any node the pipeline reported that isn't in the canonical list still gets a card
  const dagNodes = NODES.concat(Object.keys(byNode).filter((n) => !NODES.includes(n)))
  // the agent thinking RIGHT NOW = the running node with the freshest event
  let liveNode = null, liveTs = -1
  dagNodes.forEach((n) => {
    const s = nodeStatus[n]
    if (s === 'started' || s === 'working') {
      const t = byNode[n][byNode[n].length - 1].ts || 0
      if (t >= liveTs) { liveTs = t; liveNode = n }
    }
  })
  const feed = [...events].reverse().slice(0, 7)

  /* ── agent-log drawer: click any node, during OR after the run, to replay
     everything that agent did. ?log=<node> deep-links a drawer open. ── */
  const [openNode, setOpenNode] = useState(() => {
    try { return new URLSearchParams(location.search).get('log') } catch { return null }
  })
  const firstShown = useRef(true)
  useEffect(() => {
    if (firstShown.current) { firstShown.current = false; return }
    setOpenNode(null) // switching runs closes the previous run's log
  }, [shownId])
  useEffect(() => {
    if (!openNode) return
    const onKey = (e) => { if (e.key === 'Escape') setOpenNode(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openNode])
  const closeRef = useRef(null)
  useEffect(() => { if (openNode) closeRef.current?.focus() }, [openNode])
  const openEvents = openNode ? (byNode[openNode] || []) : []
  // auto-follow the tail while the drawer is open on a live agent
  const logRef = useRef(null)
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [openNode, openEvents.length])
  const agg = openEvents.reduce((a, e) => {
    if (e.costUsd) a.cost += e.costUsd
    if (e.tokens) a.tok += e.tokens
    if (e.model) a.models.add(e.model)
    return a
  }, { cost: 0, tok: 0, models: new Set() })

  // The delivered site URL + its brand radio ad — surfaced ON the board so the live
  // link and the ElevenLabs voice ad are one click away, not buried in the feed text.
  const deliverEvent = [...events].reverse().find((e) => (e.node === 'deliver' || e.node === 'publish') && e.status === 'done')
  const eventUrl = deliverEvent ? ((deliverEvent.note || '').match(/https?:\/\/[^\s"']+/) || [])[0] : null
  // Prefer the URL persisted on the job (available even before events load); strip any trailing
  // prose punctuation so the payoff click + the /ad.mp3 audio never 404 on a stray "." or ")".
  const liveUrl = ((shown && shown.liveUrl) || eventUrl || '').replace(/[).,;:!?\]]+$/, '') || null
  const audioUrl = liveUrl ? liveUrl.replace(/\/+$/, '') + '/ad.mp3' : null

  const clientUrl = location.origin + '/?client'

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(clientUrl, { margin: 2, width: 380, color: { dark: '#f2ead9', light: '#1e1913' } })
      .then((url) => { if (alive) setQrSrc(url) })
      // Only reach for the external QR service if LOCAL generation actually fails — the happy
      // path never touches the network (that was the whole point of bundling qrcode).
      .catch(() => { if (alive) setQrSrc('https://api.qrserver.com/v1/create-qr-code/?size=380x380&margin=8&bgcolor=1e1913&color=f2ead9&data=' + encodeURIComponent(clientUrl)) })
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
          <button className="autopilot-btn" onClick={() => commission(3)} title="Ship 3 more real sites — uncapped overflow points">Autopilot ▶</button>
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
                    <button className="commission" onClick={() => commission(1)}>
                      commission a new run →
                    </button>
                  )}
                </div>
              </div>

              {liveUrl && (
                <div className="delivery">
                  <a className="open-site" href={liveUrl} target="_blank" rel="noreferrer">Open live site ↗</a>
                  <span className="dlv-url">{liveUrl.replace(/^https?:\/\//, '')}</span>
                  {audioUrl && (
                    <span className="ad-player">
                      <span className="ad-label">▶ brand radio ad · ElevenLabs</span>
                      <audio controls preload="metadata" src={audioUrl} onError={(e) => { const p = e.currentTarget.closest('.ad-player'); if (p) p.style.display = 'none' }} />
                    </span>
                  )}
                </div>
              )}

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
                  {dagNodes.map((n, i) => {
                    const evs = byNode[n] || []
                    const s = nodeStatus[n]
                    const pulsing = s === 'started' || s === 'working'
                    const isLive = n === liveNode
                    const last = evs[evs.length - 1]
                    return (
                      <button
                        key={n}
                        type="button"
                        data-node={n}
                        data-status={pulsing ? 'running' : (s || 'idle')}
                        className={'node' + (pulsing ? ' pulse' : '') + (s === 'done' ? ' done' : '') + (isLive ? ' live' : '')}
                        style={{ borderColor: col(s), animationDelay: (i * 0.03) + 's' }}
                        onClick={() => setOpenNode(n)}
                        aria-haspopup="dialog"
                        aria-label={(LABEL[n] || cap(n)) + ' — ' + (evs.length ? evs.length + ' logged event' + (evs.length === 1 ? '' : 's') : 'no events yet') + ' — open agent log'}
                      >
                        <span className="ntop">
                          <span className="ndot" style={{ background: col(s) }} />
                          {evs.length > 0 && <span className="ncount">{evs.length} ev</span>}
                          <span className="nglyph" style={{ color: s ? col(s) : 'var(--faint)' }}>{NGLYPH[s] || '·'}</span>
                        </span>
                        <span className="nname">{LABEL[n] || cap(n)}</span>
                        <span className="nmodel">{NODE_MODEL[n] || 'GPT-5.6 Sol'}</span>
                        {isLive ? (
                          <span className="nstream" aria-live="polite">
                            {evs.slice(-3).map((e, k, arr) => (
                              <span key={e._id} className={'nsline' + (k === arr.length - 1 ? ' now' : '')}>
                                <span className="nsg" style={{ color: col(e.status) }}>{NGLYPH[e.status] || '·'}</span>
                                <span className="nsnote">{e.note || e.status}</span>
                              </span>
                            ))}
                          </span>
                        ) : (last && last.note ? (
                          <span className="nlast">{last.note}</span>
                        ) : null)}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="feed">
                {feed.length === 0 && !dagLoading && (
                  <div className="fline fempty">awaiting first event on this run…</div>
                )}
                {feed.map((e, i) => (
                  <button key={e._id} type="button" className="fline" style={{ opacity: 1 - i * 0.11 }}
                    onClick={() => setOpenNode(e.node)} title={'Open the ' + (LABEL[e.node] || e.node) + ' agent log'}>
                    <span className="fdot" style={{ background: col(e.status) }} />
                    <b>{LABEL[e.node] || e.node}</b> <em>{e.status}</em> <span className="fnote">{e.note}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="idle">
              <div className="big-glyph">☿</div>
              <p>The agency is open — scan to commission</p>
              <button className="idle-hint" onClick={() => commission(3)}>or hit Autopilot ▶</button>
            </div>
          )}
        </section>

        {/* ---- right rail: commission QR, learning delta, the live queue ---- */}
        <aside className="rail">
          <div className="qr-card">
            {qrSrc
              ? <img className="qr" alt="commission QR — scan to file a brief" src={qrSrc} />
              : <div className="qr qr-ph" aria-hidden="true" />}
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
                          {j.liveUrl && (
                            <span className="qopen" role="link" tabIndex={0} title="Open live site"
                              onClick={(e) => { e.stopPropagation(); window.open(j.liveUrl, '_blank', 'noopener') }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); window.open(j.liveUrl, '_blank', 'noopener') } }}
                            >↗</span>
                          )}
                        </button>
                      )
                    })}
            </div>
          </div>
        </aside>
      </div>

      {/* ---- agent-log drawer: the FULL replay of one agent's work ---- */}
      {openNode && shown && (
        <div className="drawer-wrap" onClick={() => setOpenNode(null)}>
          <aside className="drawer" role="dialog" aria-modal="true"
            aria-label={(LABEL[openNode] || cap(openNode)) + ' agent log'}
            onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div className="drawer-id">
                <span className="drawer-kicker">agent log · run {String(shown._id).slice(-6).toUpperCase()}</span>
                <h2 className="drawer-title">{LABEL[openNode] || cap(openNode)}</h2>
                <span className="drawer-sub">
                  {NODE_MODEL[openNode] || 'GPT-5.6 Sol'}
                  {openEvents.length > 0 && <> · {openEvents.length} event{openEvents.length === 1 ? '' : 's'}</>}
                  {nodeStatus[openNode] && <> · {NGLYPH[nodeStatus[openNode]] || '·'} {nodeStatus[openNode]}</>}
                </span>
              </div>
              <button ref={closeRef} className="drawer-x" onClick={() => setOpenNode(null)} aria-label="Close agent log">✕</button>
            </div>
            {(agg.cost > 0 || agg.tok > 0 || agg.models.size > 0) && (
              <div className="drawer-stats">
                {agg.models.size > 0 && <span className="dstat"><span>model</span><b>{[...agg.models].join(', ')}</b></span>}
                {agg.cost > 0 && <span className="dstat"><span>cost</span><b>{money(agg.cost)}</b></span>}
                {agg.tok > 0 && <span className="dstat"><span>tokens</span><b>{agg.tok.toLocaleString()}</b></span>}
              </div>
            )}
            <ol className="drawer-log" ref={logRef}>
              {openEvents.length === 0 && (
                <li className="dempty">No events yet — this agent hasn't picked up the run.</li>
              )}
              {openEvents.map((e) => (
                <li key={e._id} className="devent">
                  <span className="dglyph" style={{ color: col(e.status) }}>{NGLYPH[e.status] || '·'}</span>
                  <span className="dbody">
                    <span className="dmeta">
                      <em className="dstatus" style={{ color: col(e.status) }}>{e.status}</em>
                      <span className="dtime">{clock(e.ts)}</span>
                      {e.model && <span>{e.model}</span>}
                      {e.costUsd != null && e.costUsd > 0 && <span>{money(e.costUsd)}</span>}
                      {e.tokens != null && e.tokens > 0 && <span>{e.tokens.toLocaleString()} tok</span>}
                    </span>
                    {e.note && <span className="dnote">{e.note}</span>}
                  </span>
                </li>
              ))}
              {openNode === liveNode && openEvents.length > 0 && (
                <li className="devent">
                  <span className="dglyph" style={{ color: 'var(--accent-lt)' }}>▲</span>
                  <span className="dbody">
                    <span className="dnote">working<span className="dcaret" aria-hidden="true" /></span>
                  </span>
                </li>
              )}
            </ol>
          </aside>
        </div>
      )}

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
