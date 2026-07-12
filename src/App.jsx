import MissionControl from './MissionControl.jsx'
import Client from './Client.jsx'

// Big screen by default; the phone brief page at /?client (or /brief).
export default function App() {
  const isClient =
    location.search.includes('client') || location.pathname.startsWith('/brief')
  return isClient ? <Client /> : <MissionControl />
}
