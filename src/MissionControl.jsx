import { useQuery, useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'

const NODES = ['intake','research','naming','review','copy','engineer','publish','voice','invoice','qa','learn']
const LABEL = { intake:'Intake', research:'Research', naming:'Naming', review:'Review', copy:'Copy', engineer:'Engineer', publish:'Publish', voice:'Voice', invoice:'Invoice', qa:'QA', learn:'Learn' }
const NODE_MODEL = { research:'Linkup', engineer:'GPT-5.6 Sol', voice:'ElevenLabs', invoice:'Dodo' }
const COLORS = { done:'#3FB68B', started:'#F5A623', working:'#F5A623', failed:'#E5484D', rejected:'#E5484D', revised:'#8B5CF6' }
const col = (s) => COLORS[s] || '#3A4356'
const money = (n) => (n == null ? '—' : '$' + Number(n).toFixed(2))

export default function MissionControl() {
  const jobs = useQuery(api.jobs.listJobs) || []
  const active = useQuery(api.jobs.getActiveJob)
  const hero = active || jobs[0]
  const events = useQuery(api.jobs.jobEvents, hero ? { jobId: hero._id } : 'skip') || []
  const delta = useQuery(api.jobs.latestVerticalWithDelta)
  const leads = useQuery(api.jobs.leadCount) ?? 0
  const enqueueBatch = useMutation(api.autopilot.enqueueBatch)

  const nodeStatus = {}
  events.forEach((e) => { nodeStatus[e.node] = e.status })
  const feed = [...events].reverse().slice(0, 7)
  const clientUrl = location.origin + '/?client'

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
        <section className="stage">
          {hero ? (
            <>
              <div className="job-title">
                <span className="brief">{hero.brief}</span>
                <span className={'badge s-' + hero.status}>{hero.status}</span>
              </div>

              <div className="dag">
                {NODES.map((n) => {
                  const s = nodeStatus[n]
                  const pulsing = s === 'started' || s === 'working'
                  return (
                    <div key={n} className={'node' + (pulsing ? ' pulse' : '') + (s === 'done' ? ' done' : '')} style={{ borderColor: col(s) }}>
                      <span className="ndot" style={{ background: col(s) }} />
                      <div className="nname">{LABEL[n]}</div>
                      <div className="nmodel">{NODE_MODEL[n] || 'GPT-5.6 Sol'}</div>
                    </div>
                  )
                })}
              </div>

              <div className="feed">
                {feed.map((e, i) => (
                  <div key={e._id} className="fline" style={{ opacity: 1 - i * 0.11 }}>
                    <span className="fdot" style={{ background: col(e.status) }} />
                    <b>{LABEL[e.node] || e.node}</b> <em>{e.status}</em> {e.note}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="idle"><div className="big-glyph">☿</div><p>The agency is open. Scan to commission.</p></div>
          )}
        </section>

        <aside className="rail">
          <div className="qr-card">
            <img className="qr" alt="commission QR" src={'https://api.qrserver.com/v1/create-qr-code/?size=190x190&margin=8&bgcolor=12161f&color=e6e9ef&data=' + encodeURIComponent(clientUrl)} />
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

          <div className="board">
            <div className="board-h">JOB BOARD</div>
            {jobs.map((j) => (
              <div key={j._id} className="brow">
                <span className="bdot" style={{ background: j.status === 'delivered' ? '#3FB68B' : j.status === 'working' ? '#F5A623' : j.status === 'paid' ? '#8B5CF6' : '#3A4356' }} />
                <span className="bbrief">{j.brief}</span>
                <span className="bstat">{j.status}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
