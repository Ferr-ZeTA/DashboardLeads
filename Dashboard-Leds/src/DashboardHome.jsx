import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Check, ChevronDown, FlaskConical, ListChecks, RefreshCw, RotateCcw, SlidersHorizontal, Users } from 'lucide-react'
import intelfonLogo from './assets/Intelfon_-_Red.png'
import { ErrorBanner, LoadingState } from './components/ui.jsx'
import { FiltersProvider } from './context/FiltersProvider.jsx'
import { useFilters } from './hooks/useFilters.js'
import { useLeads } from './hooks/useLeads.js'
import { applyFilters, FILTER_DEFS, formatNumber, summarize } from './utils/analytics.js'
import { generateDemoLeads } from './utils/demoData.js'
import { AnalyticsView } from './views/AnalyticsView.jsx'
import { FollowUpView } from './views/FollowUpView.jsx'

const TABS = [
  { key: 'analytics', label: 'Vista 1: Dashboard General', short: 'Dashboard general', icon: BarChart3 },
  { key: 'followups', label: 'Vista 2: Seguimientos y Forecast', short: 'Seguimientos y forecast', icon: ListChecks },
]
const timeFormat = new Intl.DateTimeFormat('es-SV', { hour: '2-digit', minute: '2-digit' })
const isDemoUrl = () => new URLSearchParams(window.location.search).has('demo')

function MultiSelect({ def, leads, filters }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const display = def.display ?? String

  // Opciones y conteos según los demás filtros activos (no el propio).
  const counts = useMemo(() => {
    const map = new Map()
    for (const lead of applyFilters(leads, filters, def.key)) {
      const value = def.value(lead)
      if (value === undefined || value === null || value === '') continue
      map.set(value, (map.get(value) ?? 0) + 1)
    }
    return map
  }, [def, leads, filters])
  const options = useMemo(() => {
    const all = new Set(leads.map(def.value).filter((value) => value !== undefined && value !== null && value !== ''))
    return [...all].sort(def.sort ?? ((a, b) => String(display(a)).localeCompare(String(display(b)))))
  }, [def, leads, display])

  const selection = filters[def.key]
  const selected = selection == null ? options : selection
  const selectedCount = options.filter((value) => selected.includes(value)).length
  const active = selection != null
  const summary = !active || selectedCount === options.length
    ? 'Todos'
    : selectedCount === 0 ? 'Ninguno'
      : selectedCount === 1 ? display(options.find((value) => selected.includes(value)))
        : `${selectedCount} seleccionados`

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const update = (next) => filters.setFilter(def.key, next && next.length === options.length ? null : next)
  const toggle = (value) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    update(options.filter((option) => next.has(option)))
  }

  return <div ref={rootRef} className="relative min-w-0">
    <button type="button" className={`filter-trigger ${active ? 'is-active' : ''}`} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((wasOpen) => !wasOpen)}>
      <span className="filter-trigger-label">{def.label}</span>
      <strong className="truncate">{summary}</strong>
      <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="filter-popover" role="listbox" aria-multiselectable="true" aria-label={def.label}>
      <div className="filter-popover-actions">
        <button type="button" onClick={() => update(null)}>Todos</button>
        <button type="button" onClick={() => update([])}>Ninguno</button>
      </div>
      <div className="filter-option-list">
        {options.map((option) => {
          const checked = selected.includes(option)
          return <label key={option} className="filter-option">
            <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(option)} />
            <span className={`filter-check ${checked ? 'is-checked' : ''}`}>{checked && <Check size={11} strokeWidth={3} />}</span>
            <span className="min-w-0 flex-1 truncate">{display(option)}</span>
            <small className="tabular-nums text-muted">{formatNumber(counts.get(option) ?? 0)}</small>
          </label>
        })}
        {!options.length && <p className="px-2 py-3 text-xs text-muted">Sin opciones disponibles.</p>}
      </div>
    </div>}
  </div>
}

function FilterBar({ leads, filters, filteredCount }) {
  const activeCount = FILTER_DEFS.filter((def) => filters[def.key] != null).length
  return <div className="filter-bar">
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
      <span className="hidden items-center gap-1.5 pr-1 text-xs font-semibold text-muted lg:flex"><SlidersHorizontal size={14} />Filtros</span>
      <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:flex-1 lg:grid-cols-5">
        {FILTER_DEFS.map((def) => <MultiSelect key={def.key} def={def} leads={leads} filters={filters} />)}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="whitespace-nowrap text-xs text-muted"><b className="tabular-nums text-ink">{formatNumber(filteredCount)}</b> de {formatNumber(leads.length)} leads</span>
        <button type="button" className="btn btn-ghost" onClick={filters.clearFilters} disabled={!activeCount}>
          <RotateCcw size={14} />Limpiar{activeCount ? ` (${activeCount})` : ''}
        </button>
      </div>
    </div>
  </div>
}

function DashboardContent() {
  const [demo, setDemo] = useState(isDemoUrl)
  const [tab, setTab] = useState('analytics')
  const api = useLeads({ enabled: !demo })
  const demoLeads = useMemo(() => (demo ? generateDemoLeads() : []), [demo])
  const leads = demo ? demoLeads : api.leads
  const loading = !demo && api.loading
  const error = demo ? '' : api.error
  const filters = useFilters()

  const filtered = useMemo(() => applyFilters(leads, filters), [leads, filters])
  const summary = useMemo(() => summarize(filtered), [filtered])

  const enableDemo = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('demo', '1')
    window.history.replaceState(null, '', url)
    setDemo(true)
  }
  const disableDemo = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('demo')
    window.history.replaceState(null, '', url)
    filters.clearFilters()
    setDemo(false)
  }

  return <div className="min-h-screen bg-canvas text-ink">
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img src={intelfonLogo} alt="Intelfon RED" className="h-8 w-auto" />
          <span className="hidden h-6 w-px bg-line sm:block" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">Dashboard de Leads</h1>
            <p className="truncate text-xs text-muted">Analítica comercial · Guatemala y El Salvador</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {demo
            ? <button type="button" className="badge badge-warn" onClick={disableDemo} title="Volver a los datos de la API"><FlaskConical size={12} />Datos de ejemplo · salir</button>
            : <span className={`badge ${error ? 'badge-bad' : loading ? 'badge-neutral' : 'badge-good'}`}>
              <i className="status-dot" />{error ? 'API sin conexión' : loading ? 'Sincronizando…' : 'API conectada'}
            </span>}
          {!demo && api.lastUpdated && <span className="hidden text-muted sm:inline">Actualizado {timeFormat.format(api.lastUpdated)}</span>}
          {!demo && <button type="button" className="btn btn-ghost" onClick={api.reload} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Actualizar
          </button>}
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 sm:px-6" role="tablist" aria-label="Vistas del dashboard">
        {TABS.map((item) => {
          const Icon = item.icon
          return <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className="tab" onClick={() => setTab(item.key)}>
            <Icon size={15} /><span className="hidden sm:inline">{item.label}</span><span className="sm:hidden">{item.short}</span>
          </button>
        })}
      </nav>
    </header>

    {leads.length > 0 && <FilterBar leads={leads} filters={filters} filteredCount={filtered.length} />}

    <main className="mx-auto grid max-w-[1440px] gap-4 px-4 py-5 sm:px-6">
      {error && <ErrorBanner message={error} onRetry={api.reload} onDemo={enableDemo} />}
      {loading && !leads.length && <LoadingState />}
      {leads.length > 0 && (tab === 'analytics'
        ? <AnalyticsView key="analytics" leads={filtered} summary={summary} />
        : <FollowUpView key="followups" leads={filtered} summary={summary} />)}
      {!loading && !error && !leads.length && <div className="card grid place-items-center gap-1 py-12 text-center text-sm text-muted">
        <Users size={22} /><strong className="text-ink">La API no devolvió leads.</strong><span>Revisa la conexión e inténtalo de nuevo.</span>
      </div>}
      <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-xs text-muted">
        <span>© 2026 RED · Dashboard de Leads</span>
        <span>{demo ? 'Modo demostración · datos ficticios' : 'Actualización automática cada 5 minutos'}</span>
      </footer>
    </main>
  </div>
}

export default function DashboardHome() {
  return <FiltersProvider><DashboardContent /></FiltersProvider>
}
