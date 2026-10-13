import { AlertTriangle, BarChart3, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Percent, Tag, Target, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Card, EmptyState, SectionHeading, TableWrap } from '../components/ui.jsx'
import { leadDisplayId, lossReasonLabel, stageLabel } from '../utils/leads.js'

const LOSS_REASON_PAGE_SIZE = 7

function ResultKpi({ label, value, detail, icon: Icon, tone }) {
  return <Card className="result-kpi">
    <div className="result-kpi-heading"><span>{label}</span><i className={`result-kpi-icon ${tone}`}><Icon size={17} /></i></div>
    <strong>{value}</strong>
    <p>{detail}</p>
  </Card>
}

function LossReasonLeads({ rawReason, leads }) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(leads.length / LOSS_REASON_PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const visibleLeads = leads.slice((currentPage - 1) * LOSS_REASON_PAGE_SIZE, currentPage * LOSS_REASON_PAGE_SIZE)

  return <details className="other-reason-group">
    <summary><span>{rawReason}</span><strong>{leads.length.toLocaleString('es-SV')} {leads.length === 1 ? 'lead' : 'leads'}</strong></summary>
    <div className="other-reason-leads">
      <div className="other-reason-table-scroll">
        <table className="other-reason-table">
          <thead><tr><th>Lead</th><th>ID del lead</th><th>Ejecutivo</th></tr></thead>
          <tbody>{visibleLeads.map((lead) => <tr key={lead.id}>
            <td><strong>{lead.clientName || 'Sin nombre en API'}</strong></td>
            <td><span className="other-reason-lead-id">{leadDisplayId(lead)}</span></td>
            <td>{lead.asesor || 'Sin asignar'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {pages > 1 && <div className="pagination other-reason-pagination">
        <span>Mostrando {(currentPage - 1) * LOSS_REASON_PAGE_SIZE + 1}–{Math.min(currentPage * LOSS_REASON_PAGE_SIZE, leads.length)} de {leads.length} leads · Página {currentPage} de {pages}</span>
        <div>
          <button className="page-button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label={`Página anterior de ${rawReason}`}><ChevronLeft size={16} /></button>
          <button className="page-button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} aria-label={`Página siguiente de ${rawReason}`}><ChevronRight size={16} /></button>
        </div>
      </div>}
    </div>
  </details>
}

export function ResultadosView({ leads, metrics }) {
  const lost = leads.filter((lead) => lead.estado === 'perdido')
  const won = leads.filter((lead) => lead.estado === 'ganado')
  const unitRows = won.filter((lead) => Number.isInteger(lead.radiosVendidosReportadas) && lead.radiosVendidosReportadas > 0)
  const wonUnits = unitRows.reduce((sum, lead) => sum + lead.radiosVendidosReportadas, 0)
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
    const closureReason = lead.raw?.stage_feedback_json?.['6']?.razon_cierre
    const structuredReason = lead.raw?.stage_feedback_json?.['6']?.motivo_no_contacto
    const rawReason = [structuredReason, closureReason].find((value) => typeof value === 'string' && value.trim())?.trim()
      || 'Sin motivo de cierre informado'
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
      subtitle="Cierres, motivos originales de pérdida y radios mencionadas en comentarios de leads ganados."
    />

    <div className="results-purpose">
      <span className="results-purpose-icon"><BarChart3 size={18} /></span>
      <div>
        <strong>¿Para qué sirve esta vista?</strong>
        <p>Resume los cierres incluidos en los filtros. Las unidades ganadas salen de radios mencionadas en comentarios; Forecast muestra aparte la cantidad de equipos propuesta o reportada por lead.</p>
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
          subtitle="Motivos extraídos de los campos de cierre que entrega Prospektia."
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
                <summary><span>Ver valores originales</span><strong>{count.toLocaleString('es-SV')} cierres por revisar</strong></summary>
                <div className="other-reasons-list">
                  {otherReasonRows.map(([rawReason, categoryLeads]) => <LossReasonLeads key={rawReason} rawReason={rawReason} leads={categoryLeads} />)}
                </div>
              </details>}
            </div>
          })}
        </div> : <EmptyState title="No hay leads perdidos" body="Los filtros actuales no contienen oportunidades perdidas." />}
        <p className="results-footnote">El porcentaje de cada categoría se calcula sobre los leads perdidos; el texto no se altera en el detalle desplegable.</p>
      </Card>

      <Card className="results-panel">
        <SectionHeading
          title="Radios reportadas en leads ganados"
          subtitle="Menciones explícitas en comentarios; Prospektia no entrega un total estructurado de radios vendidas."
        />
        <div className="results-explainer results-explainer-green">
          <Tag size={15} />
          <p>Esta cifra suma menciones explícitas de radios en los comentarios recibidos, no confirma ventas ni debe cuadrarse con las cantidades estructuradas de propuesta. Esas fuentes y etapas describen datos distintos.</p>
        </div>
        <details className="equipment-details equipment-unit-details">
          <summary className="equipment-summary-button"><span><strong>Radios reportadas</strong><small>{unitRows.length.toLocaleString('es-SV')} leads ganados con una cantidad explícita en comentarios · pulsa para ver el detalle</small></span><strong className="equipment-summary-value">{wonUnits.toLocaleString('es-SV')}</strong><ChevronDown size={17} /></summary>
          {unitRows.length ? <TableWrap><thead><tr><th>Cliente</th><th>ID de lead</th><th>Ejecutivo</th><th>Etapa API</th><th>Unidades</th></tr></thead><tbody>
            {unitRows.map((lead) => <tr key={lead.id}><td><strong>{lead.clientName || 'Sin nombre en API'}</strong></td><td>{leadDisplayId(lead)}</td><td>{lead.asesor}</td><td>{lead.apiStageLabel || stageLabel(lead.etapa)}</td><td><strong>{lead.radiosVendidosReportadas}</strong></td></tr>)}
          </tbody></TableWrap> : <EmptyState title="Sin cantidades explícitas" body="Los comentarios de los leads ganados seleccionados no incluyen cantidades explícitas de radios." />}
        </details>
      </Card>
    </div>

    <div className="results-highlight"><CircleHelp size={16} /><span>“Radios reportadas” suma menciones explícitas en comentarios de leads ganados, sin confirmar ventas. La cantidad estructurada de propuesta en Forecast es otra fuente y no se suma a este total. Los motivos se leen de la información de cierre de Prospektia, no de categoria_cierre (que puede contener rubros o productos).</span></div>
  </div>
}
