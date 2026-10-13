import { CircleAlert, Clock3, Layers3, Target, Trophy, XCircle } from 'lucide-react'
import { Card, SectionHeading } from '../components/ui.jsx'
import { buildStageFunnel, OPEN_STATES } from '../utils/leads.js'
import { DirectorioView } from './DirectorioView.jsx'

function KpiCard({ label, value, caption, icon: Icon, tone }) {
  return <Card className="kpi-card"><div className="kpi-top"><span>{label}</span><span className={`kpi-icon ${tone}`}><Icon size={18} /></span></div><div className="kpi-value">{value}</div><div className="kpi-caption">{caption}</div></Card>
}

export function ResumenView({ leads, metrics }) {
  const stages = buildStageFunnel(leads)
  const maxReached = Math.max(1, ...stages.map((stage) => stage.reached))
  const maxOpen = Math.max(1, ...stages.map((stage) => stage.open))
  const active = leads.filter((lead) => OPEN_STATES.includes(lead.estado)).length
  const scheduled = leads.filter((lead) => lead.proximaGestion).length

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
      <Card><SectionHeading title="Embudo por etapa" subtitle="Alcance acumulado aproximado según la etapa actual reportada por la API." /><div className="mini-funnel">{stages.map((stage) => <div className="funnel-row" key={stage.stage}><div className="funnel-row-top"><span>{stage.stage}. {stage.label}</span><strong>{stage.reached.toLocaleString('es-SV')}</strong></div><div className="funnel-track"><span style={{ width: `${stage.reached / maxReached * 100}%` }} /></div><small className="funnel-detail">{stage.current.toLocaleString('es-SV')} en esta etapa · {stage.open.toLocaleString('es-SV')} abiertos</small></div>)}</div><p className="summary-footnote">La API no expone el historial de cambios; el acumulado no confirma una transición individual.</p></Card>
      <Card><SectionHeading title="Oportunidades abiertas" subtitle="Ubicación actual de cada lead abierto entre las seis etapas del API." /><div className="mini-funnel">{stages.map((stage) => <div className="funnel-row" key={stage.stage}><div className="funnel-row-top"><span>{stage.stage}. {stage.label}</span><strong>{stage.open.toLocaleString('es-SV')}</strong></div><div className="funnel-track"><span style={{ width: `${stage.open / maxOpen * 100}%` }} /></div><small className="funnel-detail">{stage.current.toLocaleString('es-SV')} registros en etapa actual</small></div>)}</div><p className="summary-footnote">{active.toLocaleString('es-SV')} leads abiertos en total.</p></Card>
    </div>
    <Card><SectionHeading title="Seguimiento vencido" subtitle="La fecha y el comentario se extraen de la próxima gestión guardada por etapa." /><div className={`overdue-callout ${metrics.vencidos ? 'has-overdue' : 'is-clear'}`}><span className="overdue-symbol"><CircleAlert size={23} /></span><div><strong>{metrics.vencidos.toLocaleString('es-SV')}</strong><p>{metrics.vencidos ? 'gestiones abiertas con fecha vencida' : 'No hay gestiones abiertas vencidas en la selección actual.'}</p></div><span className="overdue-state">{metrics.vencidos ? 'Atención' : 'Al día'}</span></div><div className="summary-footnote">{scheduled.toLocaleString('es-SV')} leads tienen fecha de próxima gestión · {active.toLocaleString('es-SV')} leads abiertos. La fecha de reunión no se usa para calcular vencimientos.</div></Card>
    <DirectorioView leads={leads} />
  </div>
}
