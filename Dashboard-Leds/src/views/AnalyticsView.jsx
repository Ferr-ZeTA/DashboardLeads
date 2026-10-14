import { Fragment, useMemo, useState } from 'react'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { AdvisorDrawer } from '../components/AdvisorDrawer.jsx'
import { Funnel, Legend, Meter, MonthlyComboChart, PairedBars } from '../components/charts.jsx'
import { KpiGrid } from '../components/KpiGrid.jsx'
import { Badge, Card, CountryTag, DataTable, EmptyState } from '../components/ui.jsx'
import { byAdvisor, byCountry, byCountryMonth, byMonth, COUNTRY_CODE, FUNNEL_COLORS, formatNumber, formatPercent, monthLabel } from '../utils/analytics.js'

const SERIES = [
  { key: 'total', label: 'Total leads', color: '#2a78d6' },
  { key: 'won', label: 'Radicados', color: '#1baf7a' },
  { key: 'units', label: 'Unidades', color: '#eb6834' },
]

function ConversionPill({ won, total }) {
  const value = total ? won / total : 0
  return <Badge tone={value >= 0.1 ? 'good' : value > 0 ? 'warn' : 'neutral'}>{formatPercent(won, total)}</Badge>
}

function ClosingRuleNote() {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn-soft px-2.5 py-1 text-[11px] font-medium text-warn" title="Regla actual: Radicado = Cierre con éxito. Pendiente de validar con el área comercial.">
    <AlertTriangle size={12} /> Radicados = Cierre con éxito · pendiente de cuadrar
  </span>
}

function RegionalComparison({ countries }) {
  const metrics = [
    { key: 'total', label: 'Leads' },
    { key: 'qualified', label: 'Calificados' },
    { key: 'won', label: 'Radicados' },
    { key: 'units', label: 'Unidades' },
  ]
  return <div className="grid gap-4">
    <div className="grid grid-cols-2 gap-3">
      {countries.map((row) => <div key={row.country} className="rounded-xl border border-line bg-subtle/60 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted"><CountryTag country={row.country} />{row.country}</div>
        <strong className="mt-2 block text-2xl font-semibold tracking-tight text-ink tabular-nums">{formatPercent(row.won, row.total)}</strong>
        <small className="text-xs text-muted">conversión · {row.won ? row.avgUnits.toFixed(1) : '—'} u/cierre</small>
      </div>)}
    </div>
    <div className="grid gap-3">
      {metrics.map((metric) => {
        const max = Math.max(1, ...countries.map((row) => row[metric.key]))
        return <div key={metric.key} className="grid gap-1.5">
          <span className="text-xs font-medium text-ink">{metric.label}</span>
          {countries.map((row) => <div key={row.country} className="grid grid-cols-[2rem_1fr_3.5rem] items-center gap-2 text-xs">
            <span className="text-muted">{COUNTRY_CODE[row.country]}</span>
            <Meter value={row[metric.key]} max={max} color={row.country === 'Guatemala' ? '#2a78d6' : '#eda100'} />
            <span className="text-right tabular-nums text-ink">{formatNumber(row[metric.key])}</span>
          </div>)}
        </div>
      })}
    </div>
  </div>
}

export function AnalyticsView({ leads, summary }) {
  const [selectedAdvisor, setSelectedAdvisor] = useState(null)
  const months = useMemo(() => byMonth(leads), [leads])
  const advisors = useMemo(() => byAdvisor(leads), [leads])
  const countries = useMemo(() => byCountry(leads), [leads])
  const countryMonths = useMemo(() => byCountryMonth(leads), [leads])
  const ranking = useMemo(() => [...advisors].sort((a, b) => b.units - a.units || b.won - a.won || b.total - a.total), [advisors])
  const topRadicados = useMemo(() => [...advisors].sort((a, b) => b.won - a.won || b.total - a.total).slice(0, 10), [advisors])
  const funnelDetail = useMemo(() => [...advisors].sort((a, b) => b.total - a.total), [advisors])

  return <div className="view-enter grid gap-4">
    <KpiGrid summary={summary} />

    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2" title="Leads y unidades por mes" subtitle="Agrupado por fecha de creación del lead. Pasa el cursor sobre un mes para ver el detalle." action={<Legend items={SERIES} />}>
        {months.length ? <MonthlyComboChart rows={months} series={SERIES} /> : <EmptyState title="Sin meses con datos" body="Ajusta los filtros para ver la evolución mensual." />}
      </Card>
      <Card title="Comparativa regional" subtitle="Guatemala vs. El Salvador">
        <RegionalComparison countries={countries} />
      </Card>
    </div>

    <div className="grid gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-3" title="Top asesores" subtitle="Ranking por unidades vendidas. Haz clic en un ejecutivo para ver su embudo, forecast y seguimientos.">
        <DataTable
          headers={['#', 'Ejecutivo', { label: 'Leads', numeric: true }, { label: 'Radicados', numeric: true }, { label: 'Unidades', numeric: true }, { label: 'Conversión', numeric: true }, '']}
          empty={ranking.length ? null : 'No hay asesores en la selección.'}
        >
          {ranking.slice(0, 10).map((row, index) => <tr key={row.name} className="cursor-pointer" onClick={() => setSelectedAdvisor(row.name)}>
            <td className="w-8 text-muted tabular-nums">{index + 1}</td>
            <td><span className="flex items-center gap-2 font-medium text-ink"><CountryTag country={row.country} />{row.name}</span></td>
            <td className="num">{formatNumber(row.total)}</td>
            <td className="num">{formatNumber(row.won)}</td>
            <td className="num font-semibold text-ink">{formatNumber(row.units)}</td>
            <td className="num"><ConversionPill won={row.won} total={row.total} /></td>
            <td className="w-6 text-muted"><ChevronRight size={15} /></td>
          </tr>)}
        </DataTable>
      </Card>
      <Card className="xl:col-span-2" title="Top radicados" subtitle="Total leads vs. leads radicados por ejecutivo" action={<Legend items={[SERIES[0], SERIES[1]]} />}>
        {topRadicados.length
          ? <PairedBars rows={topRadicados} primary={SERIES[0]} secondary={SERIES[1]} onSelect={setSelectedAdvisor} selected={selectedAdvisor} />
          : <EmptyState title="Sin datos" />}
      </Card>
    </div>

    <Card title="Embudo de conversión" subtitle="Total leads ➔ Calificados ➔ Radicados" action={<ClosingRuleNote />}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="self-center">
          <Funnel stages={[
            { label: 'Total leads', value: summary.total },
            { label: 'Calificados', value: summary.qualified },
            { label: 'Radicados', value: summary.won },
          ]} />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Leads asignados por etapa y ejecutivo</h3>
          <DataTable
            className="max-h-80"
            headers={['Ejecutivo', { label: 'Total', numeric: true }, { label: 'Calificados', numeric: true }, { label: 'Radicados', numeric: true }, { label: 'Conv.', numeric: true }]}
            empty={funnelDetail.length ? null : 'Sin datos.'}
          >
            {funnelDetail.map((row) => <tr key={row.name} className="cursor-pointer" onClick={() => setSelectedAdvisor(row.name)}>
              <td className="font-medium text-ink">{row.name}</td>
              {['total', 'qualified', 'won'].map((key, index) => <td key={key} className="num">
                <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: FUNNEL_COLORS[index] }} />{formatNumber(row[key])}</span>
              </td>)}
              <td className="num"><ConversionPill won={row.won} total={row.total} /></td>
            </tr>)}
          </DataTable>
        </div>
      </div>
    </Card>

    <Card title="Resumen del embudo por país y mes" subtitle="Desglose mensual de las etapas del embudo para GT y SV">
      <DataTable
        headers={['Mes', { label: 'Total leads', numeric: true }, { label: 'Calificados', numeric: true }, { label: 'No calificados', numeric: true }, { label: 'Radicados', numeric: true }, { label: 'Conversión', numeric: true }, { label: 'Unid. prom.', numeric: true }, { label: 'Unidades', numeric: true }]}
        empty={countryMonths.length ? null : 'No hay datos mensuales por país.'}
      >
        {countryMonths.map((group) => <Fragment key={group.country}>
          <tr className="group-row">
            <td colSpan={8}><span className="flex items-center gap-2"><CountryTag country={group.country} /><b>{group.country}</b><span className="text-muted">· {formatNumber(group.total.total)} leads · {formatNumber(group.total.won)} radicados · {formatPercent(group.total.won, group.total.total)}</span></span></td>
          </tr>
          {group.months.map((row) => <tr key={row.month}>
            <td>{monthLabel(row.month, 'long')}</td>
            <td className="num">{formatNumber(row.total)}</td>
            <td className="num">{formatNumber(row.qualified)}</td>
            <td className="num">{formatNumber(row.unqualified)}</td>
            <td className="num">{formatNumber(row.won)}</td>
            <td className="num"><ConversionPill won={row.won} total={row.total} /></td>
            <td className="num">{row.won ? row.avgUnits.toFixed(1) : '—'}</td>
            <td className="num">{formatNumber(row.units)}</td>
          </tr>)}
        </Fragment>)}
      </DataTable>
    </Card>

    {selectedAdvisor && <AdvisorDrawer name={selectedAdvisor} leads={leads} onClose={() => setSelectedAdvisor(null)} />}
  </div>
}
