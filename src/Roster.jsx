import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

// Management UI: define an agent role live (no engineer needed) + see the current roster.
// The MD staffs the pipeline from this roster; spawned roles show up here too.
const TOOLS = ['web', 'terminal', 'image_gen', 'tts', 'file', 'code_execution']

export default function Roster() {
  const roles = useQuery(api.agentRoles.listRoles) || []
  const addRole = useMutation(api.agentRoles.addRole)
  const seedRoles = useMutation(api.agentRoles.seedRoles)

  const [roleName, setRoleName] = useState('')
  const [mission, setMission] = useState('')
  const [tools, setTools] = useState([])
  const [guardrails, setGuardrails] = useState('')
  const [maxRetries, setMaxRetries] = useState(2)
  const [busy, setBusy] = useState(false)

  const toggleTool = (t) =>
    setTools((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const toList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)

  async function submit(e) {
    e.preventDefault()
    if (!roleName.trim() || !mission.trim()) return
    setBusy(true)
    await addRole({
      roleName: roleName.trim(),
      mission: mission.trim(),
      allowedTools: tools,
      guardrails: toList(guardrails),
      maxRetriesBeforeEscalate: Number(maxRetries) || 0,
    })
    setRoleName(''); setMission(''); setTools([]); setGuardrails(''); setMaxRetries(2)
    setBusy(false)
  }

  return (
    <div className="cl">
      <div className="cl-head">MERCURY <span className="glyph">☿</span> WORKS — ROSTER</div>
      <h2>Define an agent role</h2>
      <form onSubmit={submit} className="cl-form">
        <input placeholder="Role name (e.g. Compliance Reviewer)" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
        <textarea rows={3} placeholder="Mission — what this role owns" value={mission} onChange={(e) => setMission(e.target.value)} />
        <div className="role-tools">
          {TOOLS.map((t) => (
            <label key={t} className={'tool-chip' + (tools.includes(t) ? ' on' : '')}>
              <input type="checkbox" checked={tools.includes(t)} onChange={() => toggleTool(t)} />
              {t}
            </label>
          ))}
        </div>
        <input placeholder="Guardrails (comma-separated)" value={guardrails} onChange={(e) => setGuardrails(e.target.value)} />
        <input type="number" min={0} placeholder="Max retries before escalate" value={maxRetries} onChange={(e) => setMaxRetries(e.target.value)} />
        <button disabled={busy} className="cl-cta">{busy ? 'Saving…' : 'Add role'}</button>
      </form>

      <div className="roster">
        <div className="board-h">CURRENT ROSTER · {roles.length}</div>
        {roles.map((r) => (
          <div key={r._id} className="role-row">
            <div className="role-top"><b>{r.roleName}</b><span className="role-retry">↻{r.maxRetriesBeforeEscalate}</span></div>
            <div className="role-mission">{r.mission}</div>
            <div className="role-tags">
              {r.allowedTools.map((t) => <span key={t} className="role-tag">{t}</span>)}
            </div>
          </div>
        ))}
        {!roles.length && (
          <div className="cl-line">
            No roles yet. <button className="role-seed" onClick={() => seedRoles()}>Seed the base roster</button>
          </div>
        )}
      </div>
    </div>
  )
}
