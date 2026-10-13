import { CalendarClock, CircleDollarSign } from 'lucide-react'
import { Card, EmptyState, SectionHeading, TableWrap } from '../components/ui.jsx'
import { formatDate } from '../utils/dates.js'
import { stageLabel } from '../utils/leads.js'

export function ForecastView({ leads }) {
  const forecast = leads.filter((lead) => !lead.fcExcluir && (
    lead.fcIncluir === true ||
    lead.fcIntentar === true ||
    (lead.fcIncluir !== false && ['documentacion', 'contratacion'].includes(lead.etapa) && ['activo', 'en_espera', 'detenido'].includes(lead.estado))
  )).sort((a, b) => (a.fcFecha ?? a.proximaGestion ?? '9999-12-31').localeCompare(b.fcFecha ?? b.proximaGestion ?? '9999-12-31'))

  return <div className="view-stack"><SectionHeading title="Forecast de cierres" subtitle="Próximos cierres según overrides de forecast o etapas avanzadas disponibles." /><Card>
    <div className="forecast-intro"><div className="forecast-icon"><CalendarClock size={21} /></div><div><strong>{forecast.length} oportunidades en forecast</strong><p>El endpoint no incluye fecha estimada de cierre ni marca de intento; la reunión no se interpreta como forecast.</p></div><CircleDollarSign className="forecast-decoration" size={32} /></div>
    {forecast.length ? <TableWrap><thead><tr><th>Lead</th><th>Ejecutivo</th><th>Etapa</th><th>Fecha estimada de cierre</th><th>Origen</th></tr></thead><tbody>{forecast.map((lead) => <tr key={lead.id}><td><strong>#{lead.id}</strong></td><td>{lead.asesor}</td><td>{stageLabel(lead.etapa)}</td><td>{formatDate(lead.fcFecha)}</td><td><span className="forecast-tag">{lead.fcIncluir ? 'Incluido manualmente' : lead.fcIntentar ? 'Intentar' : 'Etapa avanzada'}</span></td></tr>)}</tbody></TableWrap> : <EmptyState title="Sin oportunidades en forecast" body="La API no aporta oportunidades abiertas en documentación/contratación ni campos de inclusión manual." />}
  </Card></div>
}
