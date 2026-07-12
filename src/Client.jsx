import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

const LABEL = { intake:'Intake', research:'Research', naming:'Naming', review:'Review', copy:'Copy', engineer:'Engineer', publish:'Publish', voice:'Voice', invoice:'Invoice', qa:'QA', deliver:'Deliver', learn:'Learn' }

export default function Client() {
  const enqueue = useMutation(api.jobs.enqueueJob)
  const [brief, setBrief] = useState('')
  const [name, setName] = useState('')
  const [jobId, setJobId] = useState(null)
  const [busy, setBusy] = useState(false)
  const events = useQuery(api.jobs.jobEvents, jobId ? { jobId } : 'skip') || []
  const job = useQuery(api.jobs.getJob, jobId ? { jobId } : 'skip')

  async function submit(e) {
    e.preventDefault()
    if (!brief.trim()) return
    setBusy(true)
    const id = await enqueue({ brief, clientName: name || 'Guest' })
    setJobId(id)
    setBusy(false)
  }

  const siteEvent = [...events].reverse().find((e) => e.node === 'deliver' || (e.node === 'publish' && e.status === 'done'))
  const liveUrl = siteEvent && (siteEvent.note || '').match(/https:\/\/[^\s]+/)?.[0]

  if (jobId) {
    return (
      <div className="cl">
        <div className="cl-head">MERCURY <span className="glyph">☿</span> WORKS</div>
        <h2>{job?.status === 'delivered' ? 'Your launch kit is live 🎉' : 'Your agency is working…'}</h2>
        <div className="cl-feed">
          {[...events].reverse().map((e) => (
            <div key={e._id} className="cl-line"><b>{LABEL[e.node] || e.node}</b> — {e.note}</div>
          ))}
          {!events.length && <div className="cl-line">Queued. The agents are picking up your brief…</div>}
        </div>
        {liveUrl && (
          <a className="cl-cta" href={liveUrl} target="_blank" rel="noreferrer">Open your live site →</a>
        )}
      </div>
    )
  }

  return (
    <div className="cl">
      <div className="cl-head">MERCURY <span className="glyph">☿</span> WORKS</div>
      <h2>What should we launch for you?</h2>
      <form onSubmit={submit} className="cl-form">
        <textarea rows={4} placeholder="e.g. a cold-brew coffee brand for developers who code late at night" value={brief} onChange={(e) => setBrief(e.target.value)} />
        <input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <button disabled={busy} className="cl-cta">{busy ? 'Commissioning…' : 'Commission the agency'}</button>
      </form>
    </div>
  )
}
