import { useMemo, useState } from 'react'
import { AlarmClock, BarChart3, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Info, TrendingUp } from 'lucide-react'
import { KpiGrid } from '../components/KpiGrid.jsx'
import { LeadDetailModal } from '../components/LeadDetailModal.jsx'
import { FollowUpDate, LeadName, LeadTable } from '../components/LeadTable.jsx'
import { Badge, Card, CountryTag, DataTable } from '../components/ui.jsx'
import { buildForecast, classifyFollowUps, CLOSING_KEYWORDS, formatNumber, leadComments, lossBreakdown } from '../utils/analytics.js'

const BUCKETS = [
  { key: 'overdue', label: 'Seguimientos vencidos', hint: 'Fecha agendada < hoy', icon: AlarmClock, tone: 'bad' },
  { key: 'today', label: 'Atender hoy', hint: 'Prioridad alta · agendados para hoy', icon: CalendarClock, tone: 'warn' },
  { key: 'upcoming', label: 'Próximos seguimientos', hint: 'Desde mañana en adelante', icon: CalendarDays, tone: 'info' },
]
const HORIZONS = [7, 15, 30, 60]

export function FollowUpView({ leads, summary }) {
  const followUps = useMemo(() => classifyFollowUps(leads), [leads])
  const [bucket, setBucket] = useState(() => (followUps.overdue.length ? 'overdue' : 'today'))
  const [horizon, setHorizon] = useState(30)
  const [selectedLead, setSelectedLead] = useState(null)
  const [lossPage, setLossPage] = useState(1)
  const forecast = useMemo(() => buildForecast(leads, horizon), [leads, horizon])
  const losses = useMemo(() => lossBreakdown(leads), [leads])
  const lossPageSize = 10
  const lossPageCount = Math.max(1, Math.ceil(losses.leads.length / lossPageSize))
  const currentLossPage = Math.min(lossPage, lossPageCount)
  const lossPageLeads = losses.leads.slice((currentLossPage - 1) * lossPageSize, currentLossPage * lossPageSize)
  const active = BUCKETS.find((item) => item.key === bucket)

  return <div className="view-enter grid gap-4">
    <KpiGrid summary={summary} compact />

    <Card title="Gestión de seguimientos" subtitle={`Leads abiertos con próxima gestión agendada · ${formatNumber(followUps.unscheduled.length)} abiertos sin fecha agendada`}>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {BUCKETS.map((item) => {
          const Icon = item.icon
          const selected = item.key === bucket
          return <button key={item.key} type="button" onClick={() => setBucket(item.key)} aria-pressed={selected}
            className={`bucket-tile bucket-${item.tone} ${selected ? 'is-selected' : ''}`}>
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">{item.label}</span>
              <Icon size={16} />
            </span>
            <strong className="mt-1 block text-3xl font-semibold tracking-tight tabular-nums">{formatNumber(followUps[item.key].length)}</strong>
            <small className="text-[11px] opacity-80">{item.hint}</small>
          </button>
        })}
      </div>
      <LeadTable
        key={bucket}
        className="max-h-[30rem]"
        leads={followUps[bucket]}
        columns={['lead', 'asesor', 'etapa', 'fecha', 'comentario']}
        tone={active.tone === 'info' ? undefined : active.tone}
        empty={`No hay casos en “${active.label}”.`}
      />
    </Card>

    <Card
      title={<span className="flex items-center gap-2"><TrendingUp size={16} className="text-good" />Forecast · proyección de ventas</span>}
      subtitle="Solo casos donde el ejecutivo está seguro de cerrar"
      action={<div className="segmented" role="group" aria-label="Horizonte del forecast">
        {HORIZONS.map((days) => <button key={days} type="button" aria-pressed={horizon === days} onClick={() => setHorizon(days)}>{days} d</button>)}
      </div>}
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,2fr)]">
        <ForecastStat label="Casos en forecast" value={formatNumber(forecast.items.length)} />
        <ForecastStat label="Ejecutivos con forecast" value={formatNumber(new Set(forecast.items.map((item) => item.lead.asesor)).size)} />
        <div className="rounded-xl border border-line bg-subtle/60 p-3 text-xs text-muted">
          <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-ink"><Info size={13} />Criterio de inclusión</p>
          <ol className="ml-4 list-decimal space-y-0.5">
            <li>Etapa <b>Seguimiento</b> + comentario con palabras clave de cierre.</li>
            <li>Próxima fecha de seguimiento entre hoy y los próximos {horizon} días.</li>
          </ol>
          <div className="mt-2 flex flex-wrap gap-1">{CLOSING_KEYWORDS.map((keyword) => <Badge key={keyword.label}>{keyword.label}</Badge>)}</div>
        </div>
      </div>
      <DataTable
        headers={['Lead', 'Ejecutivo', 'Próx. seguimiento', 'Señal de cierre', 'Comentario', { label: 'Unidades', numeric: true }, 'Detalle']}
        empty={forecast.items.length ? null : 'Ningún caso cumple el criterio de forecast con los filtros actuales.'}
      >
        {forecast.items.map(({ lead, signal, units }) => <tr key={lead.id}>
          <td><button type="button" className="lead-detail-trigger" onClick={() => setSelectedLead(lead)} aria-label={`Abrir detalle de ${lead.clientName ?? `Lead ${lead.id}`}`}><LeadName lead={lead} /></button></td>
          <td><span className="flex items-center gap-2 whitespace-nowrap"><CountryTag country={lead.pais} />{lead.asesor}</span></td>
          <td><FollowUpDate lead={lead} /></td>
          <td>{signal ? <Badge tone="good">{signal.label}</Badge> : <Badge>Marcado por ejecutivo</Badge>}</td>
          <td><span className="line-clamp-2 max-w-[22rem] text-muted" title={signal?.comment}>{signal?.comment ?? '—'}</span></td>
          <td className="num font-semibold text-ink">{units ? formatNumber(units) : '—'}</td>
          <td><button type="button" className="lead-view-detail" onClick={() => setSelectedLead(lead)}>Ver detalle</button></td>
        </tr>)}
      </DataTable>
    </Card>

    <Card
      title={<span className="flex items-center gap-2"><BarChart3 size={16} className="text-bad" />¿Por qué se pierden los leads?</span>}
      subtitle={`${formatNumber(losses.total)} casos cerrados como perdidos · distribución de motivos con los filtros actuales`}
    >
      {losses.total ? <div className="grid gap-5">
        <div className="rounded-xl border border-bad/20 bg-bad-soft p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-bad">Motivo principal</span>
          <strong className="mt-1 block text-xl font-semibold tracking-tight text-ink">{losses.byReason[0].label}</strong>
          <p className="mt-1 text-xs text-muted">Es la causa que más está impactando los cierres perdidos.</p>
        </div>
        <section aria-label="Ranking de motivos de pérdida">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">Ranking de causas</h3>
              <p className="mt-0.5 text-xs text-muted">Las barras muestran qué proporción del total de pérdidas explica cada motivo.</p>
            </div>
            <span className="text-[11px] text-muted">Total: <b className="text-ink">{formatNumber(losses.total)}</b></span>
          </div>
          <div className="grid gap-2.5">
            {losses.byReason.map((item, index) => {
              const share = (item.count / losses.total) * 100
              return <div key={item.reason} className="grid grid-cols-[1.5rem_minmax(8rem,12rem)_minmax(8rem,1fr)_5rem] items-center gap-2 text-xs sm:gap-3">
                <span className="text-center font-semibold text-muted">{index + 1}</span>
                <span className="truncate font-medium text-ink" title={item.label}>{item.label}</span>
                <span className="block h-3 overflow-hidden rounded-full bg-track">
                  <i className="block h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-500" style={{ width: `${share}%` }} />
                </span>
                <span className="text-right tabular-nums text-muted"><b className="text-ink">{formatNumber(item.count)}</b> · {share.toFixed(1)}%</span>
              </div>
            })}
          </div>
        </section>
        <section aria-label="Detalle de casos de pérdida">
          <h3 className="mb-3 text-sm font-semibold text-ink">Detalle de casos</h3>
          <DataTable headers={['Lead', 'Ejecutivo', 'Motivo', 'Último detalle', 'Detalle']}>
            {lossPageLeads.map((lead) => <tr key={lead.id}>
              <td><button type="button" className="lead-detail-trigger" onClick={() => setSelectedLead(lead)} aria-label={`Abrir detalle de ${lead.clientName ?? lead.id}`}><LeadName lead={lead} /></button></td>
              <td><span className="flex items-center gap-2 whitespace-nowrap"><CountryTag country={lead.pais} />{lead.asesor}</span></td>
              <td><Badge tone="bad">{lead.motivo ? losses.byReason.find((item) => item.reason === lead.motivo)?.label ?? lead.motivo : 'Sin categoría informativa'}</Badge></td>
              <td><span className="line-clamp-2 max-w-[30rem] text-muted" title={leadComments(lead)[0]}>{leadComments(lead)[0] ?? '—'}</span></td>
              <td><button type="button" className="lead-view-detail" onClick={() => setSelectedLead(lead)}>Ver detalle</button></td>
            </tr>)}
          </DataTable>
          {lossPageCount > 1 && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <span className="text-xs text-muted">
              Mostrando {((currentLossPage - 1) * lossPageSize) + 1}-{Math.min(currentLossPage * lossPageSize, losses.leads.length)} de {formatNumber(losses.leads.length)} casos
            </span>
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-ghost !px-2.5" onClick={() => setLossPage((page) => Math.max(1, page - 1))} disabled={currentLossPage === 1} aria-label="Casos de pérdida anteriores">
                <ChevronLeft size={14} />Anterior
              </button>
              <span className="text-xs font-medium tabular-nums text-muted">Página {currentLossPage} de {lossPageCount}</span>
              <button type="button" className="btn btn-ghost !px-2.5" onClick={() => setLossPage((page) => Math.min(lossPageCount, page + 1))} disabled={currentLossPage === lossPageCount} aria-label="Siguientes casos de pérdida">
                Siguiente<ChevronRight size={14} />
              </button>
            </div>
          </div>}
        </section>
      </div> : <p className="py-6 text-sm text-muted">No hay casos de pérdida con los filtros actuales.</p>}
    </Card>

    {selectedLead && <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
  </div>
}

function ForecastStat({ label, value, accent }) {
  return <div className={`rounded-xl border p-3 ${accent ? 'border-good/30 bg-good-soft' : 'border-line bg-surface'}`}>
    <span className="text-xs font-medium text-muted">{label}</span>
    <strong className={`mt-1 block text-2xl font-semibold tracking-tight tabular-nums ${accent ? 'text-good' : 'text-ink'}`}>{value}</strong>
  </div>
}
