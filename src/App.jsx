import MissionControl from './MissionControl.jsx'
import Client from './Client.jsx'
import Roster from './Roster.jsx'

// Big screen by default; the phone brief page at /?client (or /brief); the org roster at /?roster.
export default function App() {
  // exact query keys — so a stray ?clientId=/utm param can't flip the projector into phone view
  const params = new URLSearchParams(location.search)
  const isClient = params.has('client') || location.pathname.startsWith('/brief')
  const isRoster = params.has('roster') || location.pathname.startsWith('/roster')
  if (isRoster) return <Roster />
  return isClient ? <Client /> : <MissionControl />
}
