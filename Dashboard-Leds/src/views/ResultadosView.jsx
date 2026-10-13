import { Award, Tag } from 'lucide-react'
import { Card, EmptyState, SectionHeading, TableWrap } from '../components/ui.jsx'
import { lossReasonLabel } from '../utils/leads.js'

function productName(product) {
  if (typeof product === 'string') return product.replace(/^\s*\d+\s+/, '')
  if (product && typeof product === 'object') {
    for (const key of ['nombre', 'name', 'producto', 'equipo', 'descripcion']) {
      if (typeof product[key] === 'string' && product[key]) return product[key]
    }
  }
  return 'Rubro no especificado'
}

function productQuantity(product) {
  if (product && typeof product === 'object' && typeof product.cantidad === 'number') {
    return product.cantidad
  }
  if (typeof product === 'string') {
    const quantity = product.match(/^\s*(\d+)\s+/)
    if (quantity) return Number(quantity[1])
  }
  return 1
}

export function ResultadosView({ leads }) {
  const lost = leads.filter((lead) => lead.estado === 'perdido')
  const reasons = new Map()
  lost.forEach((lead) => {
    const reason = lead.motivo ?? 'sin_motivo'
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
  })
  const reasonRows = [...reasons.entries()].sort((a, b) => b[1] - a[1])
  const sold = leads.filter((lead) => lead.estado === 'ganado')
  const productCounts = new Map()
  sold.forEach((lead) => {
    const products = Array.isArray(lead.producto) ? lead.producto : lead.producto == null ? [] : [lead.producto]
    products.forEach((product) => {
      const name = productName(product)
      const quantity = productQuantity(product)
      productCounts.set(name, (productCounts.get(name) ?? 0) + quantity)
    })
  })
  const products = [...productCounts.entries()].sort((a, b) => b[1] - a[1])
  const maxReason = Math.max(1, ...reasonRows.map(([, count]) => count))

  return <div className="view-stack"><SectionHeading title="Resultados" subtitle="Categorías de cierre normalizadas y rubros declarados para leads ganados." />
    <div className="results-grid">
      <Card><SectionHeading title="Categorías de pérdida" subtitle={`${lost.length} leads perdidos · clasificación inferida de texto libre del API`} />{reasonRows.length ? <div className="reason-list">{reasonRows.map(([reason, count]) => <div className="reason-row" key={reason}><div className="reason-label"><span>{reason === 'sin_motivo' ? 'Sin motivo registrado' : lossReasonLabel(reason)}</span><strong>{count}</strong></div><div className="reason-track"><span style={{ width: `${count / maxReason * 100}%` }} /></div></div>)}</div> : <EmptyState title="Sin pérdidas" body="No hay leads perdidos dentro de los filtros aplicados." />}</Card>
      <Card><SectionHeading title="Rubros reportados" subtitle={`${sold.length} cierres ganados · el API no entrega equipos estructurados en los cierres revisados`} />{products.length ? <TableWrap><thead><tr><th>Rubro</th><th>Leads asociados</th></tr></thead><tbody>{products.map(([name, count]) => <tr key={name}><td><span className="table-leading"><Tag size={16} />{name}</span></td><td><strong>{count}</strong></td></tr>)}</tbody></TableWrap> : <EmptyState title="Sin rubros registrados" body="Los cierres ganados no incluyen rubros para este periodo." />}</Card>
    </div>
    <div className="results-highlight"><Award size={17} /><span>Todos los indicadores reflejan los leads de la selección global actual.</span></div>
  </div>
}
