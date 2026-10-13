import { CircleAlert, Clock3, Layers3, Target, Trophy, XCircle } from 'lucide-react'
import { Card, SectionHeading } from '../components/ui.jsx'
import { isOverdue } from '../utils/dates.js'
import { DirectorioView } from './DirectorioView.jsx'

function KpiCard({ label, value, caption, icon: Icon, tone }) {
  return <Card className="kpi-card"><div className="kpi-top"><span>{label}</span><span className={`kpi-icon ${tone}`}><Icon size={18} /></span></div><div className="kpi-value">{value}</div><div className="kpi-caption">{caption}</div></Card>
}

export function ResumenView({ leads, metrics }) {
  const overdue = leads.filter((lead) => ['activo', 'en_espera', 'detenido'].includes(lead.estado) && isOverdue(lead.proximaGestion))
  const active = leads.filter((lead) => ['activo', 'en_espera', 'detenido'].includes(lead.estado)).length
  const stages = [
    ['contacto_inicial', 'Contacto inicial', '#fb7185'],
    ['propuesta_enviada', 'Propuesta / seguimiento', '#34d399'],
    ['documentacion', 'Documentación', '#64748b'],
    ['contratacion', 'Contratación', '#10b981'],
  ]
  const counts = stages.map(([key]) => leads.filter((lead) => lead.etapa === key && ['activo', 'en_espera', 'detenido'].includes(lead.estado)).length)
  const max = Math.max(1, ...counts)
  const validApiLeads = leads.filter((lead) => lead.estado !== 'invalido' && Number.isFinite(lead.apiStage))
  const funnelRows = [
    { label: 'Recorrido registrado', count: validApiLeads.length },
    { label: 'Propuesta / seguimiento o posterior', count: validApiLeads.filter((lead) => lead.apiStage >= 4).length },
    { label: 'Documentación', count: null },
    { label: 'Cierre reportado', count: validApiLeads.filter((lead) => lead.apiStage === 6).length },
  ]
  const funnelMax = Math.max(1, ...funnelRows.map((row) => row.count ?? 0))

  return <div className="view-stack">
    <SectionHeading title="Resumen comercial" subtitle="Panorama de actividad y resultados del equipo." />
    <div className="kpi-grid">
      <KpiCard label="Total de leads" value={metrics.total.toLocaleString('es-SV')} caption="En la selección actual" icon={Layers3} tone="blue" />
      <KpiCard label="En proceso" value={metrics.enProceso.toLocaleString('es-SV')} caption="Activos, en espera o detenidos" icon={Clock3} tone="amber" />
      <KpiCard label="Ganados" value={metrics.ganados.toLocaleString('es-SV')} caption="Cierres exitosos" icon={Trophy} tone="green" />
      <KpiCard label="Perdidos" value={metrics.perdidos.toLocaleString('es-SV')} caption="Oportunidades cerradas" icon={XCircle} tone="rose" />
      <KpiCard label="Tasa de cierre" value={`${(metrics.tasaCierre * 100).toFixed(1)}%`} caption="Ganados / total de leads" icon={Target} tone="violet" />
    </div>
    {metrics.reconciliationIssues.length > 0 && <div className="reconciliation-alert" role="alert"><CircleAlert size={18} /><div><strong>Revisión de consistencia</strong>{metrics.reconciliationIssues.map((issue) => <p key={issue.code}>{issue.message}</p>)}</div></div>}
    <div className="summary-grid">
      <Card><SectionHeading title="Pipeline abierto" subtitle="Leads abiertos agrupados por la etapa que informa el API." /><div className="mini-funnel">{stages.map(([key, label, color], index) => <div className={`funnel-row ${key === 'documentacion' ? 'stage-unavailable' : ''}`} key={key}><div className="funnel-row-top"><span>{label}{key === 'propuesta_enviada' && <small> · incluye seguimiento</small>}</span><strong>{key === 'documentacion' ? 'N/D' : counts[index]}</strong></div><div className="funnel-track"><span style={{ width: `${key === 'documentacion' ? 0 : counts[index] / max * 100}%`, backgroundColor: color }} /></div></div>)}</div></Card>
      <Card><SectionHeading title="Embudo estimado" subtitle="Etapa actual convertida a recorrido aproximado; no es historial de cambios." /><div className="mini-funnel">{funnelRows.map(({ label, count }) => <div className={`funnel-row ${count === null ? 'stage-unavailable' : ''}`} key={label}><div className="funnel-row-top"><span>{label}</span><strong>{count === null ? 'N/D' : count.toLocaleString('es-SV')}</strong></div><div className="funnel-track"><span style={{ width: `${count === null ? 0 : count / funnelMax * 100}%` }} /></div></div>)}</div><p className="summary-footnote">La API no identifica documentalización ni expone el historial individual de etapas.</p></Card>
    </div>
    <Card><SectionHeading title="Seguimiento vencido" subtitle="Solo se cuentan fechas de próxima gestión reales, no fechas de reunión." /><div className={`overdue-callout ${overdue.length ? 'has-overdue' : 'is-clear'}`}><span className="overdue-symbol"><CircleAlert size={23} /></span><div><strong>{overdue.length ? overdue.length : 'N/D'}</strong><p>{overdue.length ? 'gestiones con fecha vencida' : 'La API no incluye próxima gestión; no se calcula vencimiento.'}</p></div><span className="overdue-state">{overdue.length ? 'Atención' : 'Sin dato'}</span></div><div className="summary-footnote">{active.toLocaleString('es-SV')} leads abiertos; ninguna fecha de reunión se usa como vencimiento.</div></Card>
    <DirectorioView leads={leads} />
  </div>
}
