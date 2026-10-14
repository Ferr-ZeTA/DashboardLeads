import { useMemo, useState } from 'react'
import { AlarmClock, CalendarClock, CalendarDays, Info, TrendingUp } from 'lucide-react'
import { KpiGrid } from '../components/KpiGrid.jsx'
import { LeadDetailModal } from '../components/LeadDetailModal.jsx'
import { FollowUpDate, LeadName, LeadTable } from '../components/LeadTable.jsx'
import { Badge, Card, CountryTag, DataTable } from '../components/ui.jsx'
import { buildForecast, classifyFollowUps, CLOSING_KEYWORDS, formatNumber } from '../utils/analytics.js'

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
  const forecast = useMemo(() => buildForecast(leads, horizon), [leads, horizon])
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

    {selectedLead && <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
  </div>
}

function ForecastStat({ label, value, accent }) {
  return <div className={`rounded-xl border p-3 ${accent ? 'border-good/30 bg-good-soft' : 'border-line bg-surface'}`}>
    <span className="text-xs font-medium text-muted">{label}</span>
    <strong className={`mt-1 block text-2xl font-semibold tracking-tight tabular-nums ${accent ? 'text-good' : 'text-ink'}`}>{value}</strong>
  </div>
}
