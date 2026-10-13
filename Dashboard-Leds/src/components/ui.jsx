import { AlertTriangle, RefreshCw } from 'lucide-react'
import { stateLabel } from '../utils/leads.js'

export function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function SectionHeading({ title, subtitle, action }) {
  return <div className="section-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>
}

export function Badge({ state }) {
  return <span className={`badge badge-${state}`}>{stateLabel(state)}</span>
}

export function EmptyState({ title, body }) {
  return <div className="empty-state"><span className="empty-state-icon">—</span><strong>{title}</strong><p>{body}</p></div>
}

export function LoadingState() {
  return <div className="load-state" role="status"><RefreshCw size={17} className="spin" /> Cargando información comercial…</div>
}

export function ErrorBanner({ message, onRetry }) {
  return <div className="error-banner" role="alert"><AlertTriangle size={19} /><div><strong>No se pudo actualizar el dashboard</strong><p>{message}</p><small>Verifica el proxy y la variable de servidor RED_API_KEY.</small></div><button className="button button-outline" onClick={onRetry}>Reintentar</button></div>
}

export function TableWrap({ children }) {
  return <div className="table-scroll"><table>{children}</table></div>
}
