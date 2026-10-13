import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CircleAlert, CircleDollarSign, Search, UserPlus, X } from 'lucide-react'
import { Card, EmptyState, SectionHeading, TableWrap } from '../components/ui.jsx'
import { formatDate } from '../utils/dates.js'
import { OPEN_STATES, stageLabel } from '../utils/leads.js'

const STORAGE_KEY = 'red-dashboard-forecast-overrides-v1'

function readOverrides() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('El formato guardado no es un objeto.')
    }
    for (const value of Object.values(parsed)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Un override guardado tiene un formato inválido.')
      }
      if (value.included !== undefined && typeof value.included !== 'boolean') {
        throw new Error('Una inclusión guardada no es válida.')
      }
      if (value.estimatedCloseDate !== undefined
        && (typeof value.estimatedCloseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.estimatedCloseDate))) {
        throw new Error('Una fecha estimada guardada no es válida.')
      }
    }
    return { overrides: parsed, error: '' }
  } catch {
    return {
      overrides: {},
      error: 'No se pudieron leer las inclusiones y fechas manuales guardadas en este navegador.',
    }
  }
}

function hasConflictingOutcome(lead) {
  return ['perdida', 'cerrada'].includes(lead.raw?.resultado_venta)
}

function isAutomaticCandidate(lead) {
  return OPEN_STATES.includes(lead.estado)
    && !hasConflictingOutcome(lead)
    && (lead.pendienteFirma || lead.apiStage === 6)
}

function formatReason(lead, override) {
  if (override?.included === true && !isAutomaticCandidate(lead)) return 'Inclusión manual'
  if (override?.included === false) return 'Excluido manualmente'
  if (lead.pendienteFirma) return 'Firma pendiente reportada'
  return 'Etapa API: cierre'
}

function estimatedDate(override) {
  return typeof override?.estimatedCloseDate === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(override.estimatedCloseDate)
      ? override.estimatedCloseDate
      : ''
}

function leadComments(lead) {
  return [
    { label: 'Próxima gestión', date: lead.proximaGestion, text: lead.comentarioGestion },
    { label: 'Reunión', date: lead.fechaReunion, text: lead.comentarioReunion },
  ]
}

function commentPreview(lead, limit = 115) {
  const comment = leadComments(lead).find(({ text }) => text)?.text
  if (!comment) return 'Sin comentario reportado'
  const characters = [...comment]
  return characters.length > limit ? `${characters.slice(0, limit).join('')}…` : comment
}

function customerId(lead) {
  return lead.clientId || `#${lead.id}`
}

export function ForecastView({ leads }) {
  const [storedState, setStoredState] = useState(readOverrides)
  const [query, setQuery] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const overrides = storedState.overrides

  useEffect(() => {
    if (!selectedLead) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedLead(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedLead])

  const openLeads = useMemo(() => leads.filter((lead) => OPEN_STATES.includes(lead.estado)), [leads])
  const conflicts = openLeads.filter(hasConflictingOutcome).length
  const forecast = openLeads.filter((lead) => {
    const override = overrides[lead.id]
    if (hasConflictingOutcome(lead) || override?.included === false) return false
    return override?.included === true || isAutomaticCandidate(lead)
  }).sort((a, b) => {
    const aDate = estimatedDate(overrides[a.id]) || '9999-12-31'
    const bDate = estimatedDate(overrides[b.id]) || '9999-12-31'
    return aDate.localeCompare(bDate) || a.id.localeCompare(b.id)
  })

  const matchingLeads = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es')
    if (!term) return []
    return openLeads
      .filter((lead) => !hasConflictingOutcome(lead))
      .filter((lead) => [lead.id, lead.clientId, lead.clientName, lead.asesor, lead.pais, lead.apiStageLabel, lead.comentarioGestion, lead.comentarioReunion]
        .some((value) => String(value ?? '').toLocaleLowerCase('es').includes(term)))
      .slice(0, 12)
  }, [openLeads, query])

  function updateLead(leadId, patch) {
    const previous = overrides[leadId] ?? {}
    const nextOverride = { ...previous, ...patch }
    const nextOverrides = { ...overrides }
    if (Object.values(nextOverride).every((value) => value === undefined)) {
      delete nextOverrides[leadId]
    } else {
      nextOverrides[leadId] = nextOverride
    }
    let error = ''
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextOverrides))
    } catch {
      error = 'No se pudieron guardar los cambios manuales del forecast en este navegador.'
    }
    setStoredState({ overrides: nextOverrides, error })
  }

  function toggleInclusion(lead) {
    const override = overrides[lead.id]
    const isIncluded = override?.included === true || (override?.included !== false && isAutomaticCandidate(lead))
    updateLead(lead.id, { included: !isIncluded })
  }

  return <div className="view-stack">
    <SectionHeading title="Forecast de cierres" subtitle="Solo muestra oportunidades con señal cercana a cierre ganado o leads que agregues manualmente." />
    {storedState.error && <div className="reconciliation-alert" role="alert"><CircleAlert size={18} /><div><strong>Problema con los datos manuales</strong><p>{storedState.error}</p></div></div>}
    <Card>
      <div className="forecast-intro"><div className="forecast-icon"><CalendarClock size={21} /></div><div><strong>{forecast.length.toLocaleString('es-SV')} {forecast.length === 1 ? 'oportunidad próxima a cierre' : 'oportunidades próximas a cierre'}</strong><p>La cantidad de equipos se toma del dato explícito de Prospektia o de una cantidad mencionada en comentarios.</p></div><CircleDollarSign className="forecast-decoration" size={32} /></div>
      <div className="forecast-data-note"><CircleAlert size={16} /><span>Prospektia no devuelve fecha estimada de cierre: ingrésala manualmente. La fecha de próxima gestión y la fecha de reunión se muestran aparte y nunca se usan como fecha de cierre. Sin cantidad explícita se muestra “Sin dato”.</span></div>
      {conflicts > 0 && <p className="forecast-conflicts">{conflicts.toLocaleString('es-SV')} registros abiertos tienen resultado de venta cerrado y están excluidos para evitar inflar el forecast.</p>}

      <TableWrap className="forecast-table"><thead><tr><th>Lead</th><th>ID</th><th>Equipos</th><th>Fecha estimada de cierre</th><th>Próxima gestión (API)</th><th>Seguimiento reportado</th><th>Comentario</th><th>Acción</th></tr></thead><tbody>{forecast.length ? forecast.map((lead) => {
        const override = overrides[lead.id]
        const manuallyIncluded = override?.included === true && !isAutomaticCandidate(lead)
        return <tr key={lead.id}>
          <td className="forecast-table-lead"><strong>{lead.clientName || 'Sin nombre en API'}</strong><small>{lead.asesor} · {lead.apiStageLabel || stageLabel(lead.etapa)}</small><span className={`forecast-tag ${manuallyIncluded ? 'forecast-tag-manual' : ''}`}>{formatReason(lead, override)}</span></td>
          <td>{customerId(lead)}</td>
          <td className="forecast-quantity">{lead.cantidadEquipos ?? 'Sin dato'}</td>
          <td><label className="forecast-table-date"><span>{estimatedDate(override) ? formatDate(`${estimatedDate(override)}T12:00:00`) : 'Sin estimar'}</span><input className="forecast-date-input" type="date" aria-label={`Fecha estimada de cierre para lead ${lead.id}`} value={estimatedDate(override)} onChange={(event) => updateLead(lead.id, { estimatedCloseDate: event.target.value || undefined })} /></label></td>
          <td>{formatDate(lead.proximaGestion)}</td>
          <td>{formatDate(lead.fechaSeguimiento)}</td>
          <td className="forecast-table-comment"><span>{commentPreview(lead)}</span><button className="forecast-comment-button" disabled={!lead.comentarioGestion && !lead.comentarioReunion} onClick={() => setSelectedLead(lead)}>Ver comentario completo</button></td>
          <td><button className="forecast-action forecast-action-exclude" onClick={() => toggleInclusion(lead)}>Excluir</button></td>
        </tr>
      }) : <tr><td colSpan="8"><EmptyState title="Sin candidatos próximos a cierre" body="No hay leads con una señal explícita de cierre en Prospektia. Puedes buscar y agregar manualmente una oportunidad que el equipo confirme como próxima a ganar." /></td></tr>}</tbody></TableWrap>
    </Card>

    <Card className="forecast-manager">
      <SectionHeading title="Administrar oportunidades manualmente" subtitle="Busca un lead abierto, inclúyelo o exclúyelo y, si aplica, registra su fecha estimada de cierre." />
      <label className="forecast-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por ID, ejecutivo, etapa o comentario…" aria-label="Buscar lead para forecast" /></label>
      <p className="forecast-manager-note"><UserPlus size={14} />La inclusión manual se guarda en este navegador y refleja una decisión comercial; valida que el lead esté realmente próximo a cerrarse como ganado.</p>
      {query.trim() && (matchingLeads.length ? <TableWrap><thead><tr><th>Lead</th><th>ID</th><th>Equipos</th><th>Etapa / estado</th><th>Fecha estimada</th><th>Forecast</th><th>Acción</th></tr></thead><tbody>{matchingLeads.map((lead) => {
        const override = overrides[lead.id]
        const included = override?.included === true || (override?.included !== false && isAutomaticCandidate(lead))
        return <tr key={lead.id}>
          <td><strong>{lead.clientName || 'Sin nombre en API'}</strong><small className="forecast-manager-subtitle">{lead.asesor}</small></td>
          <td>{customerId(lead)}</td>
          <td className="forecast-quantity">{lead.cantidadEquipos ?? 'Sin dato'}</td>
          <td>{lead.apiStageLabel || stageLabel(lead.etapa)}</td>
          <td><label className="forecast-table-date"><span>{estimatedDate(override) ? formatDate(`${estimatedDate(override)}T12:00:00`) : 'Sin estimar'}</span><input className="forecast-date-input" type="date" aria-label={`Fecha estimada de cierre para lead ${lead.id}`} value={estimatedDate(override)} onChange={(event) => updateLead(lead.id, { estimatedCloseDate: event.target.value || undefined })} /></label></td>
          <td>{included ? <span className="forecast-tag">Incluido</span> : <span className="forecast-tag forecast-tag-muted">Fuera del forecast</span>}</td>
          <td><button className={`forecast-action ${included ? 'forecast-action-exclude' : 'forecast-action-include'}`} onClick={() => toggleInclusion(lead)}>{included ? 'Excluir' : 'Incluir'}</button></td>
        </tr>
      })}</tbody></TableWrap> : query.trim() ? <EmptyState title="No se encontraron oportunidades abiertas" body="Revisa el término de búsqueda. Leads cerrados o con resultado contradictorio no se pueden agregar al forecast." /> : <p className="forecast-search-hint">Escribe al menos un ID, nombre de ejecutivo, etapa o palabra del comentario para administrar un lead.</p>)}
    </Card>
    {selectedLead && <div className="forecast-dialog-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setSelectedLead(null) }}>
      <section className="forecast-comment-dialog" role="dialog" aria-modal="true" aria-labelledby="forecast-comment-title" onKeyDown={(event) => { if (event.key === 'Escape') setSelectedLead(null) }}>
        <header><div><h2 id="forecast-comment-title">Comentarios de {selectedLead.clientName || customerId(selectedLead)}</h2><p>{customerId(selectedLead)} · {selectedLead.asesor}</p></div><button autoFocus className="forecast-dialog-close" onClick={() => setSelectedLead(null)} aria-label="Cerrar comentarios"><X size={18} /></button></header>
        {leadComments(selectedLead).map(({ label, date, text }) => <article key={label}><h3>{label}<small>{formatDate(date)}</small></h3><p>{text || 'Sin comentario reportado.'}</p></article>)}
      </section>
    </div>}
  </div>
}
