import { useState } from 'react'
import { Activity, AlertCircle, BarChart3, Bell, CalendarDays, CircleHelp, LayoutDashboard, Menu, RefreshCw, TrendingUp, X } from 'lucide-react'
import intelfonLogo from '../assets/Intelfon_-_Red.png'
import { FilterBar } from './FilterBar.jsx'
import { ErrorBanner, LoadingState } from './ui.jsx'
import { useLeads } from '../hooks/useLeads.js'
import { useMetrics } from '../hooks/useMetrics.js'
import { ForecastView } from '../views/ForecastView.jsx'
import { PipelineView } from '../views/PipelineView.jsx'
import { ResultadosView } from '../views/ResultadosView.jsx'
import { ResumenView } from '../views/ResumenView.jsx'
import { FiltersProvider } from '../context/FiltersProvider.jsx'
import { formatDate } from '../utils/dates.js'

const tabs = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
  { id: 'resultados', label: 'Resultados', icon: BarChart3 },
  { id: 'forecast', label: 'Forecast', icon: CalendarDays },
]

function DashboardContent() {
  const { leads, loading, error, lastUpdated, reload } = useLeads()
  const { base, metrics } = useMetrics(leads)
  const [activeTab, setActiveTab] = useState('resumen')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia('(min-width: 641px)').matches)
  const overdue = metrics.vencidos

  return <div className={`dashboard-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
    <aside id="dashboard-sidebar" className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-hidden={!sidebarOpen} inert={!sidebarOpen}>
      <div className="brand"><img className="brand-logo" src={intelfonLogo} alt="Intelfon RED" /><div><strong>RED</strong></div><button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar navegación"><X size={19} /></button></div>
      <div className="sidebar-caption">MENÚ PRINCIPAL</div>
      <nav className="side-nav" aria-label="Navegación principal">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={`side-link ${activeTab === id ? 'active' : ''}`} onClick={() => { setActiveTab(id); if (window.matchMedia('(max-width: 640px)').matches) setSidebarOpen(false) }}><Icon size={18} /><span>{label}</span>{id === 'directorio' && <small>{base.length}</small>}</button>)}</nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-help"><span className="help-icon"><CircleHelp size={17} /></span><div><strong>¿Necesitas ayuda?</strong><span>Contacta al administrador</span></div></div>
    </aside>
    {sidebarOpen && <button className="mobile-backdrop" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />}
    <main className="main-panel">
      <header className="topbar"><button className="sidebar-toggle" onClick={() => setSidebarOpen((open) => !open)} aria-label={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'} aria-expanded={sidebarOpen} aria-controls="dashboard-sidebar"><Menu size={21} /></button><div className="breadcrumb">Dashboard <span>/</span> <strong>{tabs.find((tab) => tab.id === activeTab)?.label}</strong></div><div className="topbar-actions"><span className={`sync-status ${error ? 'sync-error' : ''}`}><i /> {error ? 'API no disponible' : loading ? 'Sincronizando' : 'Datos conectados'}</span><button className="icon-button notification-button" aria-label={overdue ? `${overdue} gestiones vencidas` : 'Notificaciones'}><Bell size={18} />{overdue > 0 && <i />}</button></div></header>
      <div className="page-content">
        <div className="page-title-row"><div><div className="eyebrow"><Activity size={14} /> CENTRO DE OPERACIONES</div><h1>Dashboard de Leads <span>RED</span></h1><p>Monitorea el desempeño comercial y gestiona tus oportunidades.</p></div><div className="title-actions">{lastUpdated && <span className="last-updated">Actualizado {formatDate(lastUpdated.toISOString())}</span>}<button className="button button-primary" onClick={() => void reload()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Actualizar</button></div></div>
        <FilterBar leads={leads} />
        {error && <ErrorBanner message={error} onRetry={() => void reload()} />}
        {loading && !leads.length ? <LoadingState /> : <div className={loading ? 'content-refreshing' : ''}>
          {activeTab === 'resumen' && <ResumenView leads={base} metrics={metrics} />}
          {activeTab === 'pipeline' && <PipelineView leads={base} />}
          {activeTab === 'resultados' && <ResultadosView leads={base} metrics={metrics} />}
          {activeTab === 'forecast' && <ForecastView leads={base} />}
          {loading && <span className="refreshing-label"><RefreshCw size={12} className="spin" /> Actualizando datos</span>}
        </div>}
        {!error && !loading && !leads.length && <div className="data-empty-note"><AlertCircle size={15} />La API respondió sin leads. Revisa el endpoint y el formato de datos.</div>}
        <footer className="page-footer"><span>© 2026 RED · Dashboard comercial</span><span><i /> Actualización en tiempo real al consultar</span></footer>
      </div>
    </main>
  </div>
}

export default function DashboardLayout() {
  return <FiltersProvider><DashboardContent /></FiltersProvider>
}
