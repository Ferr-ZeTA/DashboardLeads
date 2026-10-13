import { BarChart3, CircleHelp, Percent, Tag, Target, Trophy } from 'lucide-react'
import { Card, EmptyState, SectionHeading, TableWrap } from '../components/ui.jsx'
import { lossReasonLabel } from '../utils/leads.js'

function rubricName(product) {
  if (typeof product === 'string') return product.trim()
  if (product && typeof product === 'object') {
    for (const key of ['nombre', 'name', 'producto', 'equipo', 'descripcion']) {
      if (typeof product[key] === 'string' && product[key].trim()) return product[key].trim()
    }
  }
  return ''
}

function ResultKpi({ label, value, detail, icon: Icon, tone }) {
  return <Card className="result-kpi">
    <div className="result-kpi-heading"><span>{label}</span><i className={`result-kpi-icon ${tone}`}><Icon size={17} /></i></div>
    <strong>{value}</strong>
    <p>{detail}</p>
  </Card>
}

export function ResultadosView({ leads }) {
  const lost = leads.filter((lead) => lead.estado === 'perdido')
  const won = leads.filter((lead) => lead.estado === 'ganado')
  const closed = lost.length + won.length
  const reasonCounts = new Map()

  for (const lead of lost) {
    const reason = lead.motivo ?? 'sin_motivo'
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1)
  }

  const reasonRows = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])
  const maxReason = Math.max(1, ...reasonRows.map(([, count]) => count))
  const reviewCount = (reasonCounts.get('otro') ?? 0) + (reasonCounts.get('sin_motivo') ?? 0)
  const classifiedCount = lost.length - reviewCount

  const rubricCounts = new Map()
  let winsWithoutRubric = 0
  for (const lead of won) {
    const products = Array.isArray(lead.producto)
      ? lead.producto.map(rubricName).filter(Boolean)
      : [rubricName(lead.producto)].filter(Boolean)
    const uniqueRubrics = new Set(products)
    if (!uniqueRubrics.size) {
      winsWithoutRubric += 1
      continue
    }
    for (const rubric of uniqueRubrics) {
      rubricCounts.set(rubric, (rubricCounts.get(rubric) ?? 0) + 1)
    }
  }

  const rubrics = [...rubricCounts.entries()].sort((a, b) => b[1] - a[1])

  return <div className="view-stack results-view">
    <SectionHeading
      title="Resultados comerciales"
      subtitle="Consulta qué oportunidades se ganaron, cuáles se perdieron y qué rubros aparecen en los cierres."
    />

    <div className="results-purpose">
      <span className="results-purpose-icon"><BarChart3 size={18} /></span>
      <div>
        <strong>¿Para qué sirve esta vista?</strong>
        <p>Resume los cierres de los leads incluidos en los filtros globales. Úsala para detectar patrones de pérdida y revisar los rubros declarados en los ganados.</p>
      </div>
      <span className="results-filter-note">Respeta los filtros de ejecutivo, país y mes de reunión</span>
    </div>

    <div className="results-kpis">
      <ResultKpi label="Leads analizados" value={leads.length.toLocaleString('es-SV')} detail="Todos los leads de la selección actual" icon={BarChart3} tone="pink" />
      <ResultKpi label="Cierres registrados" value={closed.toLocaleString('es-SV')} detail={`${lost.length.toLocaleString('es-SV')} perdidos + ${won.length.toLocaleString('es-SV')} ganados`} icon={Target} tone="blue" />
      <ResultKpi label="Ganados" value={won.length.toLocaleString('es-SV')} detail="Leads con resultado de venta cerrada" icon={Trophy} tone="green" />
      <ResultKpi label="Conversión de cierres" value={`${closed ? (won.length / closed * 100).toFixed(1) : '0.0'}%`} detail="Ganados ÷ (ganados + perdidos)" icon={Percent} tone="amber" />
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
            </div>
          })}
        </div> : <EmptyState title="No hay leads perdidos" body="Los filtros actuales no contienen oportunidades perdidas." />}
        <p className="results-footnote">El porcentaje de cada categoría se calcula sobre los leads perdidos, no sobre todos los leads.</p>
      </Card>

      <Card className="results-panel">
        <SectionHeading
          title="¿Qué rubros aparecen en los ganados?"
          subtitle="Conteo de leads ganados asociados a cada rubro registrado."
        />
        <div className="results-explainer results-explainer-green">
          <Tag size={15} />
          <p>El rubro no equivale a una venta ni a unidades de equipo. La API no entrega un detalle estructurado de productos vendidos.</p>
        </div>
        <div className="results-panel-summary">
          <strong>{won.length.toLocaleString('es-SV')}</strong>
          <span>cierres ganados · {winsWithoutRubric.toLocaleString('es-SV')} sin rubro registrado</span>
        </div>
        {rubrics.length ? <TableWrap>
          <thead><tr><th>Rubro informado</th><th>Leads ganados</th></tr></thead>
          <tbody>{rubrics.map(([rubric, count]) => <tr key={rubric}>
            <td><span className="table-leading"><Tag size={15} />{rubric}</span></td>
            <td><strong>{count.toLocaleString('es-SV')}</strong></td>
          </tr>)}</tbody>
        </TableWrap> : <EmptyState title="Sin rubros disponibles" body="No se encontró un rubro registrado en los cierres ganados de esta selección." />}
      </Card>
    </div>

    <div className="results-highlight"><CircleHelp size={16} /><span>Esta vista describe los datos recibidos del API; no confirma por sí sola la causa comercial de una pérdida ni los productos realmente vendidos.</span></div>
  </div>
}
