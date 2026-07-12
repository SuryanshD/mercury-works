import React from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import App from './App.jsx'
import './styles.css'

// Demo safeguard: any error thrown during render (a Convex query re-throwing a server
// error, a mid-demo backend push, a bad arg) must NEVER leave a blank white projector.
// This catches it and shows a branded "reconnecting" card that auto-recovers.
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch() { this._t = setTimeout(() => this.setState({ err: null }), 4000) }
  componentWillUnmount() { clearTimeout(this._t) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F0EEE6', color: '#1B1A15', fontFamily: 'Fraunces, Georgia, serif' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 44, color: '#B4451C' }}>☿</div>
          <h1 style={{ fontWeight: 600, margin: '10px 0 6px' }}>Reconnecting to the floor…</h1>
          <p style={{ color: '#4A473D', margin: '0 0 18px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>Mercury Works is re-syncing with Mission Control.</p>
          <button onClick={() => location.reload()} style={{ background: '#B4451C', color: '#F6EDE2', border: 0, borderRadius: 6, padding: '10px 18px', font: '700 13px IBM Plex Mono, monospace', cursor: 'pointer' }}>Reload</button>
        </div>
      </div>
    )
  }
}

const url = import.meta.env.VITE_CONVEX_URL
const root = createRoot(document.getElementById('root'))
if (!url) {
  root.render(<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F0EEE6', color: '#1B1A15', fontFamily: 'IBM Plex Mono, monospace' }}>VITE_CONVEX_URL is not set — rebuild with the Convex URL.</div>)
} else {
  const convex = new ConvexReactClient(url)
  root.render(
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </ErrorBoundary>
  )
}
