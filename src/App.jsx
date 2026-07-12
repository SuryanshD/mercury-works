import MissionControl from './MissionControl.jsx'
import Client from './Client.jsx'
import Roster from './Roster.jsx'

// Big screen by default; the phone brief page at /?client (or /brief); the org roster at /?roster.
export default function App() {
  const isClient =
    location.search.includes('client') || location.pathname.startsWith('/brief')
  const isRoster =
    location.search.includes('roster') || location.pathname.startsWith('/roster')
  if (isRoster) return <Roster />
  return isClient ? <Client /> : <MissionControl />
}
