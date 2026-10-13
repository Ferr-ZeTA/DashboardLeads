import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, Card, EmptyState, SectionHeading, TableWrap } from '../components/ui.jsx'
import { formatDate, isOverdue } from '../utils/dates.js'
import { stageLabel } from '../utils/leads.js'

const PAGE_SIZE = 10

export function DirectorioView({ leads }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const searchableLeads = useMemo(() => leads.map((lead) => ({
    lead,
    searchText: [lead.id, lead.asesor, lead.pais, lead.estado, lead.etapa, lead.motivo ?? '', JSON.stringify(lead.raw ?? {})]
      .join(' ')
      .toLocaleLowerCase('es'),
  })), [leads])
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es')
    return searchableLeads.filter(({ searchText }) => !term || searchText.includes(term)).map(({ lead }) => lead)
  }, [searchableLeads, query])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return <div className="view-stack"><SectionHeading title="Directorio de leads" subtitle={`${filtered.length.toLocaleString('es-SV')} registros encontrados · detalle original de la API disponible por lead`} /><Card>
    <div className="directory-tools"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Buscar lead, ejecutivo, país o etapa…" aria-label="Buscar leads" />{query && <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={15} /></button>}</label><span className="directory-count">Mostrando {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}</span></div>
    {rows.length ? <TableWrap><thead><tr><th>Lead / detalle API</th><th>Ejecutivo</th><th>País</th><th>Estado</th><th>Etapa actual</th><th>Calificación</th><th>Próxima gestión</th><th>Fecha de reunión</th></tr></thead><tbody>{rows.map((lead) => {
      const overdue = ['activo', 'en_espera', 'detenido'].includes(lead.estado) && isOverdue(lead.proximaGestion)
      return <tr key={lead.id}><td><details className="lead-details"><summary><strong>#{lead.id}</strong><span>Ver registro completo</span></summary><dl>{Object.entries(lead.raw ?? {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></details></td><td>{lead.asesor}</td><td>{lead.pais}</td><td><Badge state={lead.estado} /></td><td>{lead.apiStageLabel || stageLabel(lead.etapa)}</td><td><span className={`qualification ${lead.calificado ? 'qualified' : ''}`}><i />{lead.calificacionConocida ? lead.calificado ? 'Calificado' : 'No calificado' : 'Sin dato en API'}</span></td><td><span className={overdue ? 'date-overdue' : ''}>{formatDate(lead.proximaGestion)}{overdue && <em>Vencida</em>}</span></td><td>{formatDate(lead.fechaReunion)}</td></tr>
    })}</tbody></TableWrap> : <EmptyState title="No se encontraron leads" body="Prueba con otro término de búsqueda o cambia los filtros globales." />}
    <div className="pagination"><span>Página {currentPage} de {pages}</span><div><button className="page-button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Página anterior"><ChevronLeft size={17} /></button><button className="page-button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} aria-label="Página siguiente"><ChevronRight size={17} /></button></div></div>
  </Card></div>
}
