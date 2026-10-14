import { useEffect } from 'react'
import { TrendingUp, X } from 'lucide-react'
import { buildForecast, formatNumber, formatPercent, stageDistribution, summarize } from '../utils/analytics.js'
import { Funnel, Meter } from './charts.jsx'
import { LeadTable } from './LeadTable.jsx'
import { CountryTag } from './ui.jsx'

export function AdvisorDrawer({ name, leads, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const own = leads.filter((lead) => lead.asesor === name)
  const summary = summarize(own)
  const stages = stageDistribution(own)
  const maxStage = Math.max(1, ...stages.map((stage) => stage.count))
  const forecast = buildForecast(own)
  const country = own[0]?.pais

  return <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={`Detalle de ${name}`}>
    <button type="button" className="drawer-backdrop absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} aria-label="Cerrar detalle" />
    <aside className="drawer-panel relative flex h-full w-full max-w-3xl flex-col overflow-hidden bg-canvas shadow-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-line bg-surface px-6 py-5">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Detalle del ejecutivo</span>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">{name} {country && <CountryTag country={country} />}</h2>
          <p className="mt-1 text-xs text-muted">{formatNumber(summary.total)} leads · {formatNumber(summary.won)} radicados · {formatNumber(summary.units)} unidades · conversión {formatPercent(summary.won, summary.total)}</p>
        </div>
        <button type="button" className="btn btn-ghost !p-2" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
      </header>

      <div className="grid flex-1 content-start gap-4 overflow-y-auto p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card">
            <h3 className="mb-3 text-sm font-semibold text-ink">Embudo de conversión</h3>
            <Funnel compact stages={[
              { label: 'Total leads', value: summary.total },
              { label: 'Calificados', value: summary.qualified },
              { label: 'Radicados', value: summary.won },
            ]} />
          </section>
          <section className="card">
            <h3 className="mb-3 text-sm font-semibold text-ink">Detalle por etapa</h3>
            <div className="grid gap-2.5">
              {stages.map((stage) => <div key={stage.stage} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 text-xs">
                <span className="grid h-5 w-5 place-items-center rounded-md bg-subtle text-[10px] font-semibold text-muted">{stage.stage}</span>
                <span className="grid gap-1"><span className="text-ink">{stage.label}</span><Meter value={stage.count} max={maxStage} color="#2a78d6" /></span>
                <span className="text-right tabular-nums text-muted"><b className="text-ink">{stage.count}</b> · {stage.open} abiertos</span>
              </div>)}
            </div>
          </section>
        </div>

        <section className="card">
          <header className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><TrendingUp size={15} className="text-good" />Forecast actual</h3>
            <span className="text-xs text-muted"><b className="text-ink">{forecast.items.length}</b> casos · <b className="text-ink">{formatNumber(forecast.units)}</b> unidades proyectadas</span>
          </header>
          <LeadTable leads={forecast.items.map((item) => item.lead)} columns={['lead', 'fecha', 'comentario', 'unidades']} empty="Sin casos que cumplan el criterio de forecast (próximos 30 días)." />
        </section>

        <section className="card">
          <h3 className="mb-3 text-sm font-semibold text-ink">Seguimientos por lead</h3>
          <LeadTable className="max-h-[28rem]" leads={[...own].sort((a, b) => b.apiStage - a.apiStage)} columns={['lead', 'etapa', 'estado', 'fecha', 'comentario']} />
        </section>
      </div>
    </aside>
  </div>
}
