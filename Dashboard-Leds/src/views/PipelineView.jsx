import { AlertTriangle, ChevronDown, CircleHelp } from 'lucide-react'
import { Badge, Card, SectionHeading, TableWrap } from '../components/ui.jsx'
import { buildStageFunnel, leadDisplayId, stateLabel } from '../utils/leads.js'

const colors = ['#472033', '#55243a', '#632b41', '#713449', '#80404f', '#17634f']

export function PipelineView({ leads }) {
  const stages = buildStageFunnel(leads)
  const maxReached = Math.max(1, ...stages.map((stage) => stage.reached))
  const stageTracked = leads.filter((lead) => Number.isFinite(lead.apiStage)).length
  const missingStage = leads.length - stageTracked

  return <div className="view-stack">
    <SectionHeading
      title="Pipeline comercial"
      subtitle="Recorrido y ubicación actual de los leads según las seis etapas que reporta Prospektia."
    />
    <div className="pipeline-note"><CircleHelp size={16} /><span>La API solo guarda la etapa actual, no el historial de transiciones. “Alcance acumulado” es una aproximación: cuenta leads cuya etapa actual es igual o posterior a cada paso.</span></div>
    {missingStage > 0 && <div className="reconciliation-alert" role="alert"><AlertTriangle size={18} /><div><strong>Hay leads sin etapa API utilizable</strong><p>{missingStage} de {leads.length} registros no se pueden ubicar en el embudo.</p></div></div>}

    <div className="pipeline-summary-grid">
      <Card><span>Leads ubicados en una etapa API</span><strong>{stageTracked.toLocaleString('es-SV')}</strong><small>Recuento conciliado con la etapa actual de los registros filtrados.</small></Card>
      <Card><span>En proceso dentro del pipeline</span><strong>{stages.reduce((sum, stage) => sum + stage.open, 0).toLocaleString('es-SV')}</strong><small>Abiertos agrupados una sola vez por su etapa actual.</small></Card>
    </div>

    <Card className="stage-funnel-card">
      <SectionHeading title="Avance acumulado por etapa" subtitle="La barra desciende de acuerdo con la etapa actual registrada; no representa eventos históricos observados." />
      <div className="stage-funnel-list">
        {stages.map((stage, index) => {
          const previous = index ? stages[index - 1].reached : stage.reached
          const continuation = previous ? stage.reached / previous * 100 : 0
          return <div className="stage-funnel-row" key={stage.stage}>
            <div className="stage-funnel-shape-wrap">
              <div className="stage-funnel-shape" style={{ width: `${Math.max(70, stage.reached / maxReached * 100)}%`, backgroundColor: colors[index] }}>
                <span className="stage-funnel-number">{String(stage.stage).padStart(2, '0')}</span>
                <div><strong>{stage.label}</strong><small>Alcance acumulado aproximado</small></div>
                <strong className="stage-funnel-count">{stage.reached.toLocaleString('es-SV')}</strong>
              </div>
              <div className="stage-funnel-stats"><span>{stage.current.toLocaleString('es-SV')} actualmente aquí</span><span>{stage.open.toLocaleString('es-SV')} abiertos</span><span>{index ? `${continuation.toFixed(1)}% vs. etapa anterior` : 'Base del embudo'}</span></div>
            </div>
            <details className="stage-lead-details">
              <summary><span>Ver {stage.current.toLocaleString('es-SV')} leads ubicados aquí</span><ChevronDown size={15} /></summary>
              {stage.leads.length ? <TableWrap><thead><tr><th>Cliente / lead</th><th>ID</th><th>Ejecutivo</th><th>Estado</th></tr></thead><tbody>
                {stage.stage === 6 ? ['ganado', 'perdido', 'activo', 'en_espera', 'detenido', 'invalido'].flatMap((state) => {
                  const stateLeads = stage.leads.filter((lead) => lead.estado === state)
                  return stateLeads.length ? [
                    <tr className={`pipeline-state-group pipeline-state-${state}`} key={`group-${state}`}><td colSpan="4">{stateLabel(state)} · {stateLeads.length.toLocaleString('es-SV')}</td></tr>,
                    ...stateLeads.map((lead) => <tr key={lead.id}><td><strong>{lead.clientName || 'Sin nombre en API'}</strong></td><td>{leadDisplayId(lead)}</td><td>{lead.asesor}</td><td><Badge state={lead.estado} /></td></tr>),
                  ] : []
                }) : stage.leads.map((lead) => <tr key={lead.id}><td><strong>{lead.clientName || 'Sin nombre en API'}</strong></td><td>{leadDisplayId(lead)}</td><td>{lead.asesor}</td><td><Badge state={lead.estado} /></td></tr>)}
              </tbody></TableWrap> : <p className="stage-empty">No hay leads en la etapa actual con los filtros seleccionados.</p>}
            </details>
          </div>
        })}
      </div>
    </Card>
  </div>
}
