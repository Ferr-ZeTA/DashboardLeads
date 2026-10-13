import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Check, ChevronDown, Filter, RefreshCw, RotateCcw, Users } from 'lucide-react'
import intelfonLogo from './assets/Intelfon_-_Red.png'
import { ErrorBanner, LoadingState } from './components/ui.jsx'
import { FiltersProvider } from './context/FiltersProvider.jsx'
import { useFilters } from './hooks/useFilters.js'
import { useLeads } from './hooks/useLeads.js'
import { calculateMetrics, resumenBase, stateLabel } from './utils/leads.js'
import { monthValue } from './utils/dates.js'

const numberFormat = new Intl.NumberFormat('es-SV')
const percentFormat = (numerator, denominator) => `${(denominator ? numerator / denominator * 100 : 0).toFixed(1)}%`
const monthName = (value) => value === 'sin-fecha'
  ? 'Sin fecha'
  : new Intl.DateTimeFormat('es-SV', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(`${value}-01T00:00:00Z`))

const filterOptions = [
  { key: 'filterMes', label: 'Mes', setter: 'setFilterMes', value: (lead) => monthValue(lead.fechaCreacion), display: monthName },
  { key: 'filterPais', label: 'País', setter: 'setFilterPais', value: (lead) => lead.pais },
  { key: 'filterEjecutivo', label: 'Asesor', setter: 'setFilterEjecutivo', value: (lead) => lead.asesor },
  { key: 'filterTipoLead', label: 'Tipo de lead', setter: 'setFilterTipoLead', value: (lead) => lead.tipoLead, display: (value) => value === 'calificado' ? 'Calificado' : 'No calificado' },
  { key: 'filterEstado', label: 'Status cierre', setter: 'setFilterEstado', value: (lead) => lead.estado, display: stateLabel },
]

function MultiSelect({ config, leads, filters }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const options = useMemo(() => [...new Set(leads.map(config.value).filter((value) => value !== undefined && value !== null && value !== ''))]
    .sort((left, right) => String(left).localeCompare(String(right))), [config, leads])
  const selection = filters[config.key]
  const selected = selection == null ? options : selection
  const selectedCount = selected.filter((value) => options.includes(value)).length
  const summary = selectedCount === options.length
    ? 'Todos'
    : selectedCount === 0
      ? 'Ninguno'
      : selectedCount === 1
        ? (config.display ?? String)(selected.find((value) => options.includes(value)))
        : `${selectedCount} seleccionados`

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event) => {
        if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
        if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
        document.removeEventListener('pointerdown', closeOnOutsideClick)
        document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const update = (next) => filters[config.setter](next)
  const toggle = (value) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    update([...next])
  }

  return <details ref={rootRef} className={`header-filter ${open ? 'filter-open' : ''}`} open={open}>
    <summary onClick={(event) => { event.preventDefault(); setOpen((wasOpen) => !wasOpen) }}>
      <span className="header-filter-label">{config.label}</span>
      <strong>{summary}</strong>
      <ChevronDown size={14} />
    </summary>
    {open && <div className="filter-popover" onClick={(event) => event.stopPropagation()}>
      <div className="filter-popover-actions"><button type="button" onClick={() => update(null)}>Todos</button><button type="button" onClick={() => update([])}>Ninguno</button></div>
      <div className="filter-option-list">{options.map((option) => {
        const checked = selected.includes(option)
        const count = leads.filter((lead) => config.value(lead) === option
          && filterOptions.every((other) => {
            if (other.key === config.key) return true
            const otherSelection = filters[other.key]
            return otherSelection == null || otherSelection.includes(other.value(lead))
          })).length
        return <label key={option} className="filter-option">
          <input type="checkbox" checked={checked} onChange={() => toggle(option)} />
          <span className="filter-option-check">{checked && <Check size={12} />}</span>
          <span className="filter-option-name">{(config.display ?? String)(option)}</span>
          <small>{numberFormat.format(count)}</small>
        </label>
      })}</div>
    </div>}
  </details>
}

function FilterPanel({ leads }) {
  const filters = useFilters()
  const anyActive = filterOptions.some(({ key }) => filters[key] !== null)

  return <section className="filter-panel">
    <div className="filter-panel-title"><span><Filter size={16} /></span><div><strong>Filtros</strong><small>La selección actualiza todos los indicadores y gráficos</small></div></div>
    <div className="filter-controls">
      {filterOptions.map((config) => <MultiSelect key={config.key} config={config} leads={leads} filters={filters} />)}
      <button className="reset-filters" type="button" onClick={filters.clearFilters} disabled={!anyActive}><RotateCcw size={14} />Limpiar filtros</button>
    </div>
  </section>
}

function Kpi({ label, value, subtitle, tone }) {
  return <article className={`dashboard-kpi ${tone}`}>
    <span className="kpi-label">{label}</span>
    <strong className="kpi-value">{value}</strong>
    <small>{subtitle}</small>
  </article>
}

function Panel({ title, subtitle, className = '', children }) {
  return <section className={`dashboard-panel ${className}`}>
    <header className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></header>
    {children}
  </section>
}

function buildReport(leads) {
  const monthGroups = new Map()
  const countryGroups = new Map()
  const advisorGroups = new Map()
  const monthCountryGroups = new Map()

  const createStats = () => ({ total: 0, qualified: 0, unqualified: 0, won: 0, equipment: 0, wonEquipment: 0, winsWithEquipment: 0 })
  for (const lead of leads) {
    const month = monthValue(lead.fechaCreacion) || 'sin-fecha'
    const equipment = Number.isInteger(lead.cantidadEquipos) ? lead.cantidadEquipos : 0
    const monthStats = monthGroups.get(month) ?? createStats()
    monthStats.total += 1
    monthStats.won += lead.estado === 'ganado' ? 1 : 0
    monthStats.equipment += equipment
    monthGroups.set(month, monthStats)

    const countryStats = countryGroups.get(lead.pais) ?? createStats()
    countryStats.total += 1
    countryStats.qualified += lead.tipoLead === 'calificado' ? 1 : 0
    countryStats.unqualified += lead.tipoLead === 'no_calificado' ? 1 : 0
    countryStats.won += lead.estado === 'ganado' ? 1 : 0
    countryStats.equipment += equipment
    if (lead.estado === 'ganado' && equipment) {
      countryStats.wonEquipment += equipment
      countryStats.winsWithEquipment += 1
    }
    countryGroups.set(lead.pais, countryStats)

    const advisorKey = `${lead.pais}::${lead.asesor}`
    const advisorStats = advisorGroups.get(advisorKey) ?? { ...createStats(), country: lead.pais, name: lead.asesor }
    advisorStats.total += 1
    advisorStats.qualified += lead.tipoLead === 'calificado' ? 1 : 0
    advisorStats.unqualified += lead.tipoLead === 'no_calificado' ? 1 : 0
    advisorStats.won += lead.estado === 'ganado' ? 1 : 0
    if (lead.estado === 'ganado' && equipment) {
      advisorStats.wonEquipment += equipment
      advisorStats.winsWithEquipment += 1
    }
    advisorGroups.set(advisorKey, advisorStats)

    const monthCountryKey = `${lead.pais}::${month}`
    const monthCountryStats = monthCountryGroups.get(monthCountryKey) ?? { ...createStats(), country: lead.pais, month }
    monthCountryStats.total += 1
    monthCountryStats.qualified += lead.tipoLead === 'calificado' ? 1 : 0
    monthCountryStats.unqualified += lead.tipoLead === 'no_calificado' ? 1 : 0
    monthCountryStats.won += lead.estado === 'ganado' ? 1 : 0
    if (lead.estado === 'ganado' && equipment) {
      monthCountryStats.wonEquipment += equipment
      monthCountryStats.winsWithEquipment += 1
    }
    monthCountryGroups.set(monthCountryKey, monthCountryStats)
  }

  return {
    months: [...monthGroups.entries()].sort(([left], [right]) => left.localeCompare(right)),
    countries: [...countryGroups.entries()].sort(([left], [right]) => left.localeCompare(right)),
    advisors: [...advisorGroups.values()].sort((left, right) => right.total - left.total || left.name.localeCompare(right.name)),
    monthCountry: [...monthCountryGroups.values()].sort((left, right) => left.country.localeCompare(right.country) || left.month.localeCompare(right.month)),
  }
}

function MonthChart({ rows }) {
  const max = Math.max(1, ...rows.map(([, stats]) => Math.max(stats.total, stats.won, stats.equipment)))
  return <div className="month-chart">
    {rows.map(([month, stats]) => <div className="month-chart-column" key={month} title={`${monthName(month)} · ${stats.total} leads · ${stats.won} radicados · ${stats.equipment} equipos reportados`}>
      <div className="month-chart-bars">
        <span className="month-bar leads-bar" style={{ height: `${stats.total / max * 100}%` }} />
        <span className="month-bar won-bar" style={{ height: `${stats.won / max * 100}%` }} />
        <span className="month-bar equipment-bar" style={{ height: `${stats.equipment / max * 100}%` }} />
      </div>
      <strong>{numberFormat.format(stats.total)}</strong><small>{numberFormat.format(stats.won)} rad.</small><span className="month-chart-label">{monthName(month)}</span>
    </div>)}
  </div>
}

function LeadTypeChart({ leads }) {
  const qualified = leads.filter((lead) => lead.tipoLead === 'calificado').length
  const unqualified = leads.filter((lead) => lead.tipoLead === 'no_calificado').length
  const total = qualified + unqualified
  const percentage = total ? qualified / total * 100 : 0
  return <div className="type-chart-layout">
    <div className="type-donut" style={{ '--qualified-angle': `${percentage * 3.6}deg` }} role="img" aria-label={`${qualified} calificados y ${unqualified} no calificados`}>
      <div><strong>{numberFormat.format(total)}</strong><span>clasificados</span></div>
    </div>
    <div className="type-chart-legend">
      <div><i className="qualified-dot" /><span>Calificados</span><strong>{numberFormat.format(qualified)}</strong></div>
      <div><i className="unqualified-dot" /><span>No calificados</span><strong>{numberFormat.format(unqualified)}</strong></div>
      <small>Clasificación según <code>tipo_lead</code> del API.</small>
    </div>
  </div>
}

function AdvisorChart({ advisors }) {
  const shown = advisors.slice(0, 8)
  const max = Math.max(1, ...shown.map((advisor) => advisor.total))
  return <div className="advisor-chart">{shown.map((advisor) => <div className="advisor-chart-row" key={`${advisor.country}-${advisor.name}`}>
    <span className="advisor-name" title={`${advisor.name} · ${advisor.country}`}>{advisor.name}<small>{advisor.country}</small></span>
    <span className="advisor-bars"><i className="advisor-total-bar" style={{ width: `${advisor.total / max * 100}%` }} /><i className="advisor-won-bar" style={{ width: `${advisor.won / max * 100}%` }} /></span>
    <strong>{numberFormat.format(advisor.total)}</strong>
  </div>)}</div>
}

function CountryChart({ countries }) {
  const total = countries.reduce((sum, [, stats]) => sum + stats.total, 0)
  return <div className="country-chart">
    {countries.map(([country, stats]) => <div className="country-chart-row" key={country}>
      <div className="country-chart-title"><strong>{country}</strong><span>{numberFormat.format(stats.total)} leads · {percentFormat(stats.total, total)}</span></div>
      <div className="country-chart-track"><i style={{ width: `${total ? stats.total / total * 100 : 0}%` }} /></div>
      <small>{numberFormat.format(stats.qualified)} calificados · {numberFormat.format(stats.won)} radicados</small>
    </div>)}
    {!countries.length && <p className="empty-chart">Sin datos de país para la selección.</p>}
  </div>
}

function FunnelPanel({ groups }) {
  const months = [...new Set(groups.map((row) => row.month))]
  const countries = [...new Set(groups.map((row) => row.country))]
  const monthStats = new Map(groups.map((row) => [`${row.country}::${row.month}`, row]))
  return <Panel title="Embudo de conversión por mes y país" subtitle="Volumen de leads, calificación y radicados según la fecha de creación disponible en el API." className="wide-panel">
    <div className="funnel-legend"><span><i className="funnel-legend-leads" /> Leads</span><span><i className="funnel-legend-qualified" /> Calificados</span><span><i className="funnel-legend-won" /> Radicados</span><small>La escala de cada embudo es proporcional al total de leads de su mes.</small></div>
    <div className="funnel-country-list">
      {countries.map((country) => <article className="funnel-country" key={country}>
        <header className="funnel-country-heading"><span className={`country-flag country-flag-${country === 'Guatemala' || country === 'GT' ? 'gt' : country === 'El Salvador' || country === 'SV' ? 'sv' : 'other'}`}>{country === 'Guatemala' ? 'GT' : country === 'El Salvador' ? 'SV' : country}</span><small>{country === 'GT' || country === 'Guatemala' ? 'Guatemala' : country === 'SV' || country === 'El Salvador' ? 'El Salvador' : country}</small></header>
        <div className="funnel-months">
          {months.map((month) => {
            const stats = monthStats.get(`${country}::${month}`)
            if (!stats) return <div className="funnel-month-empty" key={month}><strong>{monthName(month)}</strong><span>Sin registros</span></div>
            const qualifiedWidth = stats.total ? Math.max(stats.qualified ? 8 : 0, stats.qualified / stats.total * 100) : 0
            const wonWidth = stats.total ? Math.max(stats.won ? 7 : 0, stats.won / stats.total * 100) : 0
            return <article className="funnel-month-card" key={month}>
              <div className="funnel-month-top"><strong>{monthName(month)}</strong><span className="funnel-conversion">{percentFormat(stats.won, stats.total)}<small>conversión</small></span></div>
              <div className="funnel-month-summary"><span>{numberFormat.format(stats.total)} leads</span><span>{numberFormat.format(stats.won)} radicados</span></div>
              <div className="funnel-steps">
                <div className="funnel-step">
                  <div className="funnel-step-caption"><span>Leads</span><strong>{numberFormat.format(stats.total)}</strong></div>
                  <div className="funnel-step-shape funnel-step-leads" style={{ '--step-width': '100%' }}>{numberFormat.format(stats.total)}</div>
                </div>
                <span className="funnel-step-connector" aria-hidden="true" />
                <div className="funnel-step">
                  <div className="funnel-step-caption"><span>Calificados</span><strong>{numberFormat.format(stats.qualified)}</strong></div>
                  <div className={`funnel-step-shape funnel-step-qualified ${stats.qualified ? '' : 'is-empty'}`} style={{ '--step-width': `${qualifiedWidth}%` }}>{numberFormat.format(stats.qualified)}</div>
                </div>
                <span className="funnel-step-connector" aria-hidden="true" />
                <div className="funnel-step">
                  <div className="funnel-step-caption"><span>Radicados</span><strong>{numberFormat.format(stats.won)}</strong></div>
                  <div className={`funnel-step-shape funnel-step-won ${stats.won ? '' : 'is-empty'}`} style={{ '--step-width': `${wonWidth}%` }}>{numberFormat.format(stats.won)}</div>
                </div>
              </div>
              <footer className="funnel-month-footer">
                {stats.winsWithEquipment
                  ? <span>{(stats.wonEquipment / stats.winsWithEquipment).toFixed(1)} equipos reportados por radicado con dato</span>
                  : <span>Sin cantidades en radicados</span>}
              </footer>
            </article>
          })}
        </div>
      </article>)}
      {!groups.length && <p className="empty-chart">No hay datos suficientes para construir el embudo.</p>}
    </div>
  </Panel>
}

function MetricTable({ title, subtitle, headers, rows, rowKey, renderRow, emptyMessage }) {
  return <Panel title={title} subtitle={subtitle} className="table-panel">
    <div className="dashboard-table-scroll"><table className="report-table">
      <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={rowKey(row)}>{renderRow(row)}</tr>)}
        {!rows.length && <tr><td className="table-empty" colSpan={headers.length}>{emptyMessage}</td></tr>}
      </tbody>
    </table></div>
  </Panel>
}

function DashboardContent() {
  const { leads, loading, error, lastUpdated, reload } = useLeads()
  const filters = useFilters()
  const filtered = useMemo(() => resumenBase(leads, filters), [leads, filters])
  const metrics = useMemo(() => calculateMetrics(filtered), [filtered])
  const report = useMemo(() => buildReport(filtered), [filtered])

  const wonLeads = filtered.filter((lead) => lead.estado === 'ganado')
  const wonWithEquipment = wonLeads.filter((lead) => Number.isInteger(lead.cantidadEquipos))
  const equipmentInWonLeads = wonWithEquipment.reduce((sum, lead) => sum + lead.cantidadEquipos, 0)
  const averageEquipment = wonWithEquipment.length ? equipmentInWonLeads / wonWithEquipment.length : null
  const qualified = filtered.filter((lead) => lead.tipoLead === 'calificado').length
  const unqualified = filtered.filter((lead) => lead.tipoLead === 'no_calificado').length

  return <main className="dashboard-page">
    <header className="dashboard-header">
      <div className="dashboard-brand"><img src={intelfonLogo} alt="RED" /><div><span className="brand-eyebrow"><Activity size={13} /> CENTRO COMERCIAL</span><h1>Dashboard de Leads <span>RED</span></h1><p>Desempeño comercial de todos los equipos, en una sola vista.</p></div></div>
      <div className="dashboard-header-actions"><span className={`api-status ${error ? 'api-status-error' : ''}`}><i />{error ? 'API no disponible' : loading ? 'Sincronizando' : 'API conectada'}</span><span className="last-updated">{lastUpdated ? `Actualizado ${new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' }).format(lastUpdated)}` : 'Esperando datos'}</span><button className="refresh-button" type="button" onClick={() => void reload()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Actualizar</button></div>
    </header>

    <div className="dashboard-content">
      <FilterPanel leads={leads} />
      {error && <ErrorBanner message={error} onRetry={() => void reload()} />}
      {loading && !leads.length ? <LoadingState /> : <div className={loading ? 'dashboard-refreshing' : ''}>
        <section className="dashboard-kpis">
          <Kpi label="Total leads" value={numberFormat.format(metrics.total)} subtitle={`${numberFormat.format(qualified)} calificados · ${numberFormat.format(unqualified)} no calificados`} tone="blue" />
          <Kpi label="Leads radicados" value={numberFormat.format(metrics.ganados)} subtitle={`${percentFormat(metrics.ganados, metrics.total)} del total filtrado`} tone="green" />
          <Kpi label="Conversión de leads" value={percentFormat(metrics.ganados, metrics.total)} subtitle={`${numberFormat.format(metrics.ganados)} radicados / ${numberFormat.format(metrics.total)} leads`} tone="cyan" />
          <Kpi label="Equipos reportados / radicado" value={averageEquipment === null ? '—' : averageEquipment.toFixed(1)} subtitle={averageEquipment === null ? 'El API no reporta cantidades en los radicados filtrados' : `Promedio de ${numberFormat.format(equipmentInWonLeads)} equipos en ${numberFormat.format(wonWithEquipment.length)} radicados con dato`} tone="purple" />
          <Kpi label="Equipos reportados en radicados" value={numberFormat.format(equipmentInWonLeads)} subtitle="Dato de propuesta/etapa del API; no implica venta confirmada" tone="rose" />
        </section>

        <section className="dashboard-charts">
          <Panel title="Leads por mes" subtitle="Se agrupa por fecha de creación; equipos reportados se muestran como una serie aparte.">
            <div className="chart-legend"><span><i className="legend-leads" /> Leads</span><span><i className="legend-radicados" /> Radicados</span><span><i className="legend-equipment" /> Equipos reportados</span></div>
            {report.months.length ? <MonthChart rows={report.months.slice(-12)} /> : <p className="empty-chart">El API no reporta fechas de creación en la selección actual.</p>}
          </Panel>
          <Panel title="Calificado vs. no calificado" subtitle="Distribución según el campo tipo_lead del API.">
            <LeadTypeChart leads={filtered} />
          </Panel>
          <Panel title="Top asesores" subtitle="Ejecutivos con más leads en los filtros seleccionados.">
            <div className="chart-legend"><span><i className="legend-leads" /> Total leads</span><span><i className="legend-radicados" /> Radicados</span></div>
            <AdvisorChart advisors={report.advisors} />
            {!report.advisors.length && <p className="empty-chart">No hay asesores para mostrar.</p>}
          </Panel>
          <Panel title="País (GT vs. SV)" subtitle="Leads, calificados y radicados por país.">
            <CountryChart countries={report.countries} />
          </Panel>
          <FunnelPanel groups={report.monthCountry} />
        </section>

        <section className="dashboard-tables">
          <MetricTable
            title="Resumen del embudo por mes y país"
            subtitle="Cantidades estructuradas disponibles en los leads radicados; vacíos no se consideran como cero vendido."
            headers={['País', 'Mes', 'Total leads', 'Calificados', 'No calificados', 'Radicados', 'Conversión', 'Prom. equipos reportados', 'Equipos reportados']}
            rows={report.monthCountry}
            rowKey={(row) => `${row.country}-${row.month}`}
            emptyMessage="No hay datos mensuales por país."
            renderRow={(row) => <><td><strong>{row.country}</strong></td><td>{monthName(row.month)}</td><td className="numeric">{numberFormat.format(row.total)}</td><td className="numeric">{numberFormat.format(row.qualified)}</td><td className="numeric">{numberFormat.format(row.unqualified)}</td><td className="numeric">{numberFormat.format(row.won)}</td><td className="numeric"><span className="conversion-pill">{percentFormat(row.won, row.total)}</span></td><td className="numeric">{row.winsWithEquipment ? (row.wonEquipment / row.winsWithEquipment).toFixed(1) : '—'}</td><td className="numeric">{numberFormat.format(row.wonEquipment)}</td></>
            }
          />
          <MetricTable
            title="Resumen por asesor y país"
            subtitle="Volumen asignado, clasificación y radicados por ejecutivo."
            headers={['País', 'Asesor', 'Total leads', 'Calificados', 'No calificados', 'Radicados', 'Conversión', 'Prom. equipos reportados', 'Equipos reportados']}
            rows={report.advisors}
            rowKey={(row) => `${row.country}-${row.name}`}
            emptyMessage="No hay asesores para mostrar."
            renderRow={(row) => <><td><strong>{row.country}</strong></td><td>{row.name}</td><td className="numeric">{numberFormat.format(row.total)}</td><td className="numeric">{numberFormat.format(row.qualified)}</td><td className="numeric">{numberFormat.format(row.unqualified)}</td><td className="numeric">{numberFormat.format(row.won)}</td><td className="numeric"><span className="conversion-pill">{percentFormat(row.won, row.total)}</span></td><td className="numeric">{row.winsWithEquipment ? (row.wonEquipment / row.winsWithEquipment).toFixed(1) : '—'}</td><td className="numeric">{numberFormat.format(row.wonEquipment)}</td></>
            }
          />
        </section>
      </div>}
      {!loading && !error && !leads.length && <div className="empty-dashboard"><Users size={21} /><strong>La API no devolvió leads.</strong><span>Revisa la conexión e inténtalo de nuevo.</span></div>}
      <footer className="dashboard-footer"><span>© 2026 RED · Dashboard de Leads</span><span><i />Actualización automática cada 5 minutos</span></footer>
    </div>
  </main>
}

export default function DashboardHome() {
  return <FiltersProvider><DashboardContent /></FiltersProvider>
}
