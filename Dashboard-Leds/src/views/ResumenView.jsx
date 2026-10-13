import { AlertTriangle, CalendarClock, ChevronDown, CircleAlert, Clock3, Layers3, Target, Trophy, XCircle } from 'lucide-react'
import { Badge, Card, SectionHeading, TableWrap } from '../components/ui.jsx'
import { formatDate, isOverdue, toDate } from '../utils/dates.js'
import { buildStageFunnel, leadDisplayId, OPEN_STATES, stageLabel } from '../utils/leads.js'

function KpiCard({ label, value, caption, icon: Icon, tone }) {
  return <Card className="kpi-card"><div className="kpi-top"><span>{label}</span><span className={`kpi-icon ${tone}`}><Icon size={18} /></span></div><div className="kpi-value">{value}</div><div className="kpi-caption">{caption}</div></Card>
}

export function ResumenView({ leads, metrics }) {
  const stages = buildStageFunnel(leads)
  const openLeads = leads.filter((lead) => OPEN_STATES.includes(lead.estado))
  const active = openLeads.length
  const overdueLeads = openLeads
    .filter((lead) => isOverdue(lead.proximaGestion))
    .sort((left, right) => toDate(left.proximaGestion) - toDate(right.proximaGestion))
  const unscheduledLeads = openLeads.filter((lead) => !lead.proximaGestion)
  const scheduled = openLeads.length - unscheduledLeads.length
  const maxOpen = Math.max(1, ...stages.map((stage) => stage.open))
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const daysOverdue = (value) => {
    const dueDate = toDate(value)
    if (!dueDate) return 0
    dueDate.setHours(0, 0, 0, 0)
    return Math.round((dayStart.getTime() - dueDate.getTime()) / 86400000)
  }

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
    <Card><SectionHeading title="Leads en proceso" subtitle="Leads abiertos distribuidos por etapa actual, según la información que reporta el API." /><div className="mini-funnel">{stages.map((stage) => <div className="funnel-row" key={stage.stage}><div className="funnel-row-top"><span>{stage.stage}. {stage.label}</span><strong>{stage.open.toLocaleString('es-SV')}</strong></div><div className="funnel-track"><span style={{ width: `${stage.open / maxOpen * 100}%` }} /></div><small className="funnel-detail">{stage.current.toLocaleString('es-SV')} registros en etapa · {stage.open.toLocaleString('es-SV')} leads abiertos</small></div>)}</div><p className="summary-footnote">{active.toLocaleString('es-SV')} leads abiertos en total.</p></Card>
    <Card className="overdue-panel">
      <SectionHeading
        title="Seguimiento vencido"
        subtitle="Una gestión se marca vencida cuando su fecha de próxima gestión ya pasó y el lead continúa abierto."
      />
      <div className={`overdue-callout ${metrics.vencidos ? 'has-overdue' : 'is-clear'}`}>
        <span className="overdue-symbol"><CircleAlert size={23} /></span>
        <div>
          <strong>{overdueLeads.length.toLocaleString('es-SV')}</strong>
          <p>{overdueLeads.length ? 'leads abiertos con fecha de gestión anterior a hoy' : 'No hay fechas de gestión vencidas en los leads abiertos filtrados.'}</p>
        </div>
        <span className="overdue-state">{overdueLeads.length ? 'Requiere atención' : 'Al día'}</span>
      </div>
      {overdueLeads.length > 0 && <details className="overdue-details">
        <summary><span><AlertTriangle size={15} />Ver cuáles leads tienen la gestión vencida</span><strong>{overdueLeads.length.toLocaleString('es-SV')} leads</strong><ChevronDown size={16} /></summary>
        <TableWrap className="overdue-table"><thead><tr><th>Cliente</th><th>ID de lead</th><th>Estado</th><th>Etapa actual</th><th>Fecha vencida</th><th>Atraso</th><th>Comentario de gestión</th></tr></thead><tbody>
          {overdueLeads.map((lead) => <tr key={lead.id}>
            <td><strong>{lead.clientName || 'Sin nombre en API'}</strong></td>
            <td>{leadDisplayId(lead)}</td>
            <td><Badge state={lead.estado} /></td>
            <td>{lead.apiStageLabel || stageLabel(lead.etapa)}</td>
            <td className="overdue-date">{formatDate(lead.proximaGestion)}</td>
            <td><strong>{daysOverdue(lead.proximaGestion)} {daysOverdue(lead.proximaGestion) === 1 ? 'día' : 'días'}</strong></td>
            <td className="overdue-comment">{lead.comentarioGestion || 'El API no reportó comentario para esta gestión.'}</td>
          </tr>)}
        </tbody></TableWrap>
      </details>}
      <div className="overdue-data-summary">
        <div><CalendarClock size={15} /><span><strong>{scheduled.toLocaleString('es-SV')}</strong> de {active.toLocaleString('es-SV')} leads abiertos tienen fecha de próxima gestión.</span></div>
        {unscheduledLeads.length > 0 && <details className="overdue-missing-details">
          <summary><span>{unscheduledLeads.length.toLocaleString('es-SV')} leads abiertos no tienen fecha de próxima gestión registrada</span><ChevronDown size={14} /></summary>
          <p>Estos leads no se cuentan como vencidos porque el API no proporcionó una fecha que permita confirmar atraso.</p>
          <TableWrap className="overdue-table"><thead><tr><th>Cliente</th><th>ID de lead</th><th>Estado</th><th>Etapa actual</th><th>Comentario disponible</th></tr></thead><tbody>
            {unscheduledLeads.map((lead) => <tr key={lead.id}>
              <td><strong>{lead.clientName || 'Sin nombre en API'}</strong></td>
              <td>{leadDisplayId(lead)}</td>
              <td><Badge state={lead.estado} /></td>
              <td>{lead.apiStageLabel || stageLabel(lead.etapa)}</td>
              <td className="overdue-comment">{lead.comentarioGestion || lead.comentarioReunion || 'El API no reportó comentario de seguimiento.'}</td>
            </tr>)}
          </tbody></TableWrap>
        </details>}
      </div>
      <p className="summary-footnote">Se usan exclusivamente fechas de próxima gestión del API; la fecha de reunión no se toma como vencimiento.</p>
    </Card>
  </div>
}
