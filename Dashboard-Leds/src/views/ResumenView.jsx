import { CircleAlert, Clock3, Layers3, Target, Trophy, XCircle } from 'lucide-react'
import { Card, SectionHeading } from '../components/ui.jsx'
import { OPEN_STATES } from '../utils/leads.js'

function KpiCard({ label, value, caption, icon: Icon, tone }) {
  return <Card className="kpi-card"><div className="kpi-top"><span>{label}</span><span className={`kpi-icon ${tone}`}><Icon size={18} /></span></div><div className="kpi-value">{value}</div><div className="kpi-caption">{caption}</div></Card>
}

export function ResumenView({ leads, metrics }) {
  const openLeads = leads.filter((lead) => OPEN_STATES.includes(lead.estado))
  const active = openLeads.length
  const scheduled = leads.filter((lead) => lead.proximaGestion).length
  const openByState = OPEN_STATES.map((state) => ({
    state,
    count: openLeads.filter((lead) => lead.estado === state).length,
    label: { activo: 'Activos', en_espera: 'En espera', detenido: 'Detenidos' }[state],
  }))

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
    <Card className="summary-open-card"><SectionHeading title="Leads en proceso" subtitle="Cantidad de leads abiertos, sin importar si están activos, en espera o detenidos." /><div className="summary-open-total"><strong>{active.toLocaleString('es-SV')}</strong><span>leads abiertos en los filtros actuales</span></div><div className="summary-open-breakdown">{openByState.map(({ state, count, label }) => <div key={state}><span>{label}</span><strong>{count.toLocaleString('es-SV')}</strong></div>)}</div><p className="summary-footnote">Para ver la etapa actual y los nombres de cada oportunidad, abre Pipeline.</p></Card>
    <Card><SectionHeading title="Seguimiento vencido" subtitle="La fecha y el comentario se extraen de la próxima gestión guardada por etapa." /><div className={`overdue-callout ${metrics.vencidos ? 'has-overdue' : 'is-clear'}`}><span className="overdue-symbol"><CircleAlert size={23} /></span><div><strong>{metrics.vencidos.toLocaleString('es-SV')}</strong><p>{metrics.vencidos ? 'gestiones abiertas con fecha vencida' : 'No hay gestiones abiertas vencidas en la selección actual.'}</p></div><span className="overdue-state">{metrics.vencidos ? 'Atención' : 'Al día'}</span></div><div className="summary-footnote">{scheduled.toLocaleString('es-SV')} leads tienen fecha de próxima gestión · {active.toLocaleString('es-SV')} leads abiertos. La fecha de reunión no se usa para calcular vencimientos.</div></Card>
  </div>
}
