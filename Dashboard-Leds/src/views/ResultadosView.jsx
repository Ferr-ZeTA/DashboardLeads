import { AlertTriangle, BarChart3, Check, ChevronDown, CircleHelp, Percent, Tag, Target, Trophy } from 'lucide-react'
import { Card, EmptyState, SectionHeading, TableWrap } from '../components/ui.jsx'
import { leadDisplayId, lossReasonLabel, stageLabel } from '../utils/leads.js'

function ResultKpi({ label, value, detail, icon: Icon, tone }) {
  return <Card className="result-kpi">
    <div className="result-kpi-heading"><span>{label}</span><i className={`result-kpi-icon ${tone}`}><Icon size={17} /></i></div>
    <strong>{value}</strong>
    <p>{detail}</p>
  </Card>
}

export function ResultadosView({ leads, metrics }) {
  const lost = leads.filter((lead) => lead.estado === 'perdido')
  const won = leads.filter((lead) => lead.estado === 'ganado')
  const unitRows = won.filter((lead) => Number.isInteger(lead.cantidadEquipos) && lead.cantidadEquipos > 0)
  const wonUnits = unitRows.reduce((sum, lead) => sum + lead.cantidadEquipos, 0)
  const reasonCounts = new Map()

  for (const lead of lost) {
    const reason = lead.motivo ?? 'sin_motivo'
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1)
  }

  const reasonRows = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])
  const categorizedLosses = reasonRows.reduce((sum, [, count]) => sum + count, 0)
  const maxReason = Math.max(1, ...reasonRows.map(([, count]) => count))
  const reviewCount = (reasonCounts.get('otro') ?? 0) + (reasonCounts.get('sin_motivo') ?? 0)
  const classifiedCount = lost.length - reviewCount
  const otherReasonCategories = new Map()
  for (const lead of lost.filter((item) => item.motivo === 'otro')) {
    const rawReason = typeof lead.raw?.categoria_cierre === 'string' && lead.raw.categoria_cierre.trim()
      ? lead.raw.categoria_cierre.trim()
      : 'Sin categoría informativa'
    const categoryLeads = otherReasonCategories.get(rawReason) ?? []
    categoryLeads.push(lead)
    otherReasonCategories.set(rawReason, categoryLeads)
  }
  const otherReasonRows = [...otherReasonCategories.entries()].sort((a, b) => b[1].length - a[1].length)

  const reconciled = metrics.total === leads.length
    && metrics.ganados === won.length
    && metrics.perdidos === lost.length
    && categorizedLosses === metrics.perdidos
  const resultIssues = metrics.reconciliationIssues

  return <div className="view-stack results-view">
    <SectionHeading
      title="Resultados comerciales"
      subtitle="Cierres, texto original de las razones de pérdida y unidades documentadas en leads ganados."
    />

    <div className="results-purpose">
      <span className="results-purpose-icon"><BarChart3 size={18} /></span>
      <div>
        <strong>¿Para qué sirve esta vista?</strong>
        <p>Resume los cierres de los leads incluidos en los filtros. La cantidad ganada usa el mismo campo unificado que muestra Forecast; solo suma leads ganados con una cantidad explícita.</p>
      </div>
      <span className="results-filter-note">Respeta los filtros de ejecutivo, país y mes de próxima gestión</span>
    </div>

    <div className="results-kpis">
      <ResultKpi label="Leads analizados" value={metrics.total.toLocaleString('es-SV')} detail="Igual al total de leads del Resumen" icon={BarChart3} tone="pink" />
      <ResultKpi label="Cierres registrados" value={metrics.cierresDecididos.toLocaleString('es-SV')} detail={`${metrics.perdidos.toLocaleString('es-SV')} perdidos + ${metrics.ganados.toLocaleString('es-SV')} ganados`} icon={Target} tone="blue" />
      <ResultKpi label="Ganados" value={metrics.ganados.toLocaleString('es-SV')} detail="Igual a los ganados del Resumen" icon={Trophy} tone="green" />
      <ResultKpi label="Conversión de cierres" value={`${metrics.cierresDecididos ? (metrics.ganados / metrics.cierresDecididos * 100).toFixed(1) : '0.0'}%`} detail="Ganados ÷ (ganados + perdidos)" icon={Percent} tone="amber" />
    </div>
    <div className={`results-reconciliation ${reconciled && !resultIssues.length ? 'is-reconciled' : 'has-reconciliation-issue'}`} role={resultIssues.length ? 'alert' : 'status'}>
      {resultIssues.length ? <AlertTriangle size={17} /> : <Check size={17} />}
      <div>
        <strong>{reconciled ? 'Las cifras cuadran con Resumen' : 'Los totales no coinciden entre las vistas'}</strong>
        {resultIssues.length > 0 && <p>También se detectaron alertas de calidad o conflictos en los campos originales del API:</p>}
        <p>Total {metrics.total.toLocaleString('es-SV')} · Ganados {metrics.ganados.toLocaleString('es-SV')} · Perdidos {metrics.perdidos.toLocaleString('es-SV')} · Categorías de pérdida {categorizedLosses.toLocaleString('es-SV')}</p>
        {resultIssues.map((issue) => <p key={issue.code}>{issue.message}</p>)}
      </div>
    </div>

    <div className="results-grid">
      <Card className="results-panel">
        <SectionHeading
          title="¿Por qué se pierden?"
          subtitle="Motivos homologados desde el campo categoria_cierre que entrega Prospektia."
        />
        <div className="results-explainer">
          <CircleHelp size={15} />
          <p>El API guarda texto libre, no un catálogo oficial. “Otros / revisar” reúne valores originales que no se pueden asignar con seguridad a un motivo; despliega cada grupo para ver el texto recibido y sus leads.</p>
        </div>
        <div className="results-panel-summary">
          <strong>{classifiedCount.toLocaleString('es-SV')}</strong>
          <span>de {lost.length.toLocaleString('es-SV')} pérdidas agrupadas en categorías reconocibles</span>
        </div>
        {reasonRows.length ? <div className="reason-list">
          {reasonRows.map(([reason, count]) => {
            const unclassified = reason === 'otro' || reason === 'sin_motivo'
            const label = reason === 'otro'
              ? 'Otros / revisar texto original'
              : reason === 'sin_motivo'
                ? 'Sin categoría informativa'
                : lossReasonLabel(reason)
            return <div className={`reason-row ${unclassified ? 'reason-unclassified' : ''}`} key={reason}>
              <div className="reason-label">
                <span>{label}</span>
                <strong>{count.toLocaleString('es-SV')} <small>{lost.length ? `${(count / lost.length * 100).toFixed(1)}%` : '0%'}</small></strong>
              </div>
              <div className="reason-track" role="img" aria-label={`${label}: ${count} de ${lost.length} leads perdidos`}>
                <span style={{ width: `${count / maxReason * 100}%` }} />
              </div>
              {reason === 'otro' && <details className="other-reasons-details">
                <summary>Ver valores originales de {count.toLocaleString('es-SV')} cierres</summary>
                <div className="other-reasons-list">
                  {otherReasonRows.map(([rawReason, categoryLeads]) => <details key={rawReason}>
                    <summary><span>{rawReason}</span><strong>{categoryLeads.length.toLocaleString('es-SV')}</strong></summary>
                    <ul>{categoryLeads.map((lead) => <li key={lead.id}>{lead.clientName || 'Sin nombre en API'} · {leadDisplayId(lead)} · {lead.asesor}</li>)}</ul>
                  </details>)}
                </div>
              </details>}
            </div>
          })}
        </div> : <EmptyState title="No hay leads perdidos" body="Los filtros actuales no contienen oportunidades perdidas." />}
        <p className="results-footnote">El porcentaje de cada categoría se calcula sobre los leads perdidos; el texto no se altera en el detalle desplegable.</p>
      </Card>

      <Card className="results-panel">
        <SectionHeading
          title="Unidades ganadas"
          subtitle="Suma la cantidad explícita registrada en leads con estado Ganado."
        />
        <div className="results-explainer results-explainer-green">
          <Tag size={15} />
          <p>Se usa `cantidadEquipos`, la misma extracción conservadora que aparece en Forecast: primero campos estructurados del API y luego menciones explícitas en comentarios. Los leads sin cantidad no se suman.</p>
        </div>
        <details className="equipment-details equipment-unit-details">
          <summary className="equipment-summary-button"><span><strong>Unidades ganadas</strong><small>{unitRows.length.toLocaleString('es-SV')} leads ganados con cantidad explícita · pulsa para ver el detalle</small></span><strong className="equipment-summary-value">{wonUnits.toLocaleString('es-SV')}</strong><ChevronDown size={17} /></summary>
          {unitRows.length ? <TableWrap><thead><tr><th>Cliente</th><th>ID de lead</th><th>Ejecutivo</th><th>Etapa API</th><th>Unidades</th></tr></thead><tbody>
            {unitRows.map((lead) => <tr key={lead.id}><td><strong>{lead.clientName || 'Sin nombre en API'}</strong></td><td>{leadDisplayId(lead)}</td><td>{lead.asesor}</td><td>{lead.apiStageLabel || stageLabel(lead.etapa)}</td><td><strong>{lead.cantidadEquipos}</strong></td></tr>)}
          </tbody></TableWrap> : <EmptyState title="Sin cantidades explícitas" body="Los leads ganados seleccionados no incluyen una cantidad de equipos reconocible en los datos del API." />}
        </details>
      </Card>
    </div>

    <div className="results-highlight"><CircleHelp size={16} /><span>“Unidades ganadas” suma cantidades documentadas en leads cuyo estado es Ganado; el API no ofrece un campo independiente de unidades facturadas. Los valores originales de motivos se consultan en categoria_cierre y no se inventan cuando son ambiguos.</span></div>
  </div>
}
