import { AlertTriangle, BarChart3, Check, CircleHelp, Percent, Tag, Target, Trophy } from 'lucide-react'
import { Card, EmptyState, SectionHeading, TableWrap } from '../components/ui.jsx'
import { lossReasonLabel, OPEN_STATES, stageLabel } from '../utils/leads.js'

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
  const radioRows = won.filter((lead) => Number.isInteger(lead.radiosEnComentario) && lead.radiosEnComentario > 0)
  const reportedRadios = radioRows.reduce((sum, lead) => sum + lead.radiosEnComentario, 0)
  const pendingSignature = leads.filter((lead) =>
    OPEN_STATES.includes(lead.estado)
    && lead.pendienteFirma
    && !['perdida', 'cerrada'].includes(lead.raw?.resultado_venta),
  )
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
      subtitle="Revisa cierres, motivos de pérdida, radios documentadas y oportunidades pendientes de firma."
    />

    <div className="results-purpose">
      <span className="results-purpose-icon"><BarChart3 size={18} /></span>
      <div>
        <strong>¿Para qué sirve esta vista?</strong>
        <p>Resume los cierres de los leads incluidos en los filtros globales. Las unidades de radios solo se cuentan cuando existe una cantidad explícita en comentarios de un lead ganado.</p>
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
          subtitle="Clasificación orientativa de la categoría de cierre escrita en el API."
        />
        <div className="results-explainer">
          <CircleHelp size={15} />
          <p>El API guarda texto libre, no un catálogo oficial de motivos. Las coincidencias claras se agrupan; “Otros / revisar” contiene textos no reconocidos y categorías vacías o genéricas.</p>
        </div>
        <div className="results-panel-summary">
          <strong>{classifiedCount.toLocaleString('es-SV')}</strong>
          <span>de {lost.length.toLocaleString('es-SV')} pérdidas agrupadas en categorías reconocibles</span>
        </div>
        {reasonRows.length ? <div className="reason-list">
          {reasonRows.map(([reason, count]) => {
            const unclassified = reason === 'otro' || reason === 'sin_motivo'
            const label = reason === 'otro'
              ? 'Otros / revisar texto'
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
                <summary>Desglosar {count.toLocaleString('es-SV')} cierres agrupados</summary>
                <div className="other-reasons-list">
                  {otherReasonRows.map(([rawReason, categoryLeads]) => <details key={rawReason}>
                    <summary><span>{rawReason}</span><strong>{categoryLeads.length.toLocaleString('es-SV')}</strong></summary>
                    <ul>{categoryLeads.map((lead) => <li key={lead.id}>#{lead.id} · {lead.asesor}</li>)}</ul>
                  </details>)}
                </div>
              </details>}
            </div>
          })}
        </div> : <EmptyState title="No hay leads perdidos" body="Los filtros actuales no contienen oportunidades perdidas." />}
        <p className="results-footnote">El porcentaje de cada categoría se calcula sobre los leads perdidos, no sobre todos los leads.</p>
      </Card>

      <Card className="results-panel">
        <SectionHeading
          title="Equipos por oportunidad"
          subtitle="Radios mencionadas en cierres ganados y oportunidades que aún esperan firma."
        />
        <div className="results-explainer results-explainer-green">
          <Tag size={15} />
          <p>La cantidad se extrae de menciones explícitas como “4 radios” en comentarios de leads ganados. Para no duplicar una misma oportunidad, se toma la mayor cantidad encontrada por lead. Un comentario sin cantidad no se interpreta como cero.</p>
        </div>
        <div className="equipment-metrics">
          <div><span>Radios reportadas</span><strong>{reportedRadios.toLocaleString('es-SV')}</strong><small>En {radioRows.length.toLocaleString('es-SV')} oportunidades ganadas con cantidad explícita</small></div>
          <div><span>Pendientes de firma</span><strong>{pendingSignature.length.toLocaleString('es-SV')}</strong><small>Leads abiertos con esa señal en comentarios del API</small></div>
        </div>
        <details className="equipment-details">
          <summary>Ver {radioRows.length.toLocaleString('es-SV')} oportunidades ganadas con radios reportadas</summary>
          {radioRows.length ? <TableWrap><thead><tr><th>Lead</th><th>Ejecutivo</th><th>Etapa API</th><th>Radios mencionadas</th></tr></thead><tbody>
            {radioRows.map((lead) => <tr key={lead.id}><td><strong>#{lead.id}</strong></td><td>{lead.asesor}</td><td>{lead.apiStageLabel || stageLabel(lead.etapa)}</td><td><strong>{lead.radiosEnComentario}</strong></td></tr>)}
          </tbody></TableWrap> : <EmptyState title="Sin cantidades explícitas" body="Los comentarios de los cierres ganados seleccionados no incluyen cantidades de radios reconocibles." />}
        </details>
        <details className="equipment-details">
          <summary>Ver {pendingSignature.length.toLocaleString('es-SV')} oportunidades pendientes de firma</summary>
          {pendingSignature.length ? <TableWrap><thead><tr><th>Lead</th><th>Ejecutivo</th><th>Etapa API</th></tr></thead><tbody>
            {pendingSignature.map((lead) => <tr key={lead.id}><td><strong>#{lead.id}</strong></td><td>{lead.asesor}</td><td>{lead.apiStageLabel || stageLabel(lead.etapa)}</td></tr>)}
          </tbody></TableWrap> : <EmptyState title="Sin pendientes de firma identificados" body="No hay leads abiertos con una mención explícita de firma pendiente en la selección actual." />}
        </details>
      </Card>
    </div>

    <div className="results-highlight"><CircleHelp size={16} /><span>La cantidad de radios es una extracción conservadora del texto de comentarios, no un campo estructurado de unidades vendidas. Los leads sin cantidad explícita no se suman ni se consideran cero.</span></div>
  </div>
}
