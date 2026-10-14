import { useMemo, useState } from 'react'
import { Check, Copy, Mail, RotateCcw } from 'lucide-react'
import { Card } from '../components/ui.jsx'
import { byAdvisor, followUpDate, formatNumber, formatPercent } from '../utils/analytics.js'
import { leadDisplayId } from '../utils/leads.js'

const shortDate = new Intl.DateTimeFormat('es-SV', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const longDate = new Intl.DateTimeFormat('es-SV', { dateStyle: 'full' })

const leadLine = (lead) => `• ${lead.asesor} — ${lead.clientName ?? `Lead ${leadDisplayId(lead)}`}${followUpDate(lead) ? ` (${shortDate.format(followUpDate(lead))})` : ''}${lead.comentarioGestion ? `: ${lead.comentarioGestion}` : ''}`

function EditableBlock({ title, tone, value, onChange }) {
  return <section className={`mail-block mail-${tone}`}>
    <h4>{title}</h4>
    <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={Math.min(10, Math.max(3, value.split('\n').length + 1))} spellCheck="false" />
  </section>
}

export function MailReport({ leads, followUps, forecast, horizon }) {
  const rows = useMemo(() => byAdvisor(leads).sort((a, b) => b.qualified - a.qualified || a.name.localeCompare(b.name)), [leads])
  const totals = rows.reduce((sum, row) => ({ qualified: sum.qualified + row.qualified, unqualified: sum.unqualified + row.unqualified, won: sum.won + row.won }), { qualified: 0, unqualified: 0, won: 0 })

  const defaults = useMemo(() => ({
    today: followUps.today.length
      ? followUps.today.map(leadLine).join('\n')
      : 'Sin seguimientos agendados para hoy.',
    upcoming: followUps.upcoming.length
      ? `${followUps.upcoming.length} seguimientos programados.\n${followUps.upcoming.slice(0, 8).map(leadLine).join('\n')}${followUps.upcoming.length > 8 ? `\n… y ${followUps.upcoming.length - 8} más.` : ''}`
      : 'Sin seguimientos próximos.',
    forecast: forecast.items.length
      ? `${forecast.items.length} casos · ${formatNumber(forecast.units)} unidades proyectadas (próximos ${horizon} días).\n${forecast.items.map(({ lead, units }) => `• ${lead.asesor} — ${lead.clientName ?? `Lead ${leadDisplayId(lead)}`}: ${units ? `${units} unidades` : 'unidades por confirmar'}`).join('\n')}`
      : `Sin casos en forecast para los próximos ${horizon} días.`,
  }), [followUps, forecast, horizon])

  const [edits, setEdits] = useState({})
  const [copied, setCopied] = useState(false)
  const value = (key) => edits[key] ?? defaults[key]
  const subject = `Resumen comercial de leads · ${longDate.format(new Date())}`

  const plainText = [
    subject,
    '',
    'RESUMEN POR EJECUTIVO',
    'Ejecutivo | Leads C | Leads NC | Radicados | % Conversión',
    ...rows.map((row) => `${row.name} | ${row.qualified} | ${row.unqualified} | ${row.won} | ${formatPercent(row.won, row.qualified)}`),
    `Total | ${totals.qualified} | ${totals.unqualified} | ${totals.won} | ${formatPercent(totals.won, totals.qualified)}`,
    '',
    'ATENDER HOY', value('today'),
    '',
    'PRÓXIMOS SEGUIMIENTOS', value('upcoming'),
    '',
    'FORECAST', value('forecast'),
  ].join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return <Card
    title={<span className="flex items-center gap-2"><Mail size={16} className="text-accent" />Reporte automático por correo</span>}
    subtitle="Vista previa del resumen diario. Los bloques de texto son editables antes de enviar."
    action={<div className="flex flex-wrap gap-2">
      {Object.keys(edits).length > 0 && <button type="button" className="btn btn-ghost" onClick={() => setEdits({})}><RotateCcw size={14} />Restablecer</button>}
      <button type="button" className="btn btn-ghost" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copiado' : 'Copiar texto'}</button>
      <a className="btn btn-primary" href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText.slice(0, 1800))}`}><Mail size={14} />Abrir en correo</a>
    </div>}
  >
    <div className="mail-frame">
      <div className="mail-meta">
        <span><b>De:</b> Dashboard de Leads</span>
        <span><b>Para:</b> Equipo comercial</span>
        <span><b>Asunto:</b> {subject}</span>
      </div>
      <div className="grid gap-5 p-5 sm:p-6">
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink">Resumen por ejecutivo</h4>
          <div className="table-scroll">
            <table className="data-table mail-table">
              <thead><tr><th>Ejecutivo</th><th className="num">Leads C</th><th className="num">Leads NC</th><th className="num">Radicados</th><th className="num">% Conversión</th></tr></thead>
              <tbody>
                {rows.map((row) => <tr key={row.name}>
                  <td className="font-medium text-ink">{row.name}</td>
                  <td className="num">{formatNumber(row.qualified)}</td>
                  <td className="num">{formatNumber(row.unqualified)}</td>
                  <td className="num">{formatNumber(row.won)}</td>
                  <td className="num">{formatPercent(row.won, row.qualified)}</td>
                </tr>)}
              </tbody>
              <tfoot><tr>
                <td>Total</td>
                <td className="num">{formatNumber(totals.qualified)}</td>
                <td className="num">{formatNumber(totals.unqualified)}</td>
                <td className="num">{formatNumber(totals.won)}</td>
                <td className="num">{formatPercent(totals.won, totals.qualified)}</td>
              </tr></tfoot>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">% Conversión = Radicados / Leads calificados.</p>
        </section>
        <div className="grid gap-4 lg:grid-cols-3">
          <EditableBlock title={`Atender hoy (${followUps.today.length})`} tone="warn" value={value('today')} onChange={(text) => setEdits((current) => ({ ...current, today: text }))} />
          <EditableBlock title={`Próximos seguimientos (${followUps.upcoming.length})`} tone="info" value={value('upcoming')} onChange={(text) => setEdits((current) => ({ ...current, upcoming: text }))} />
          <EditableBlock title={`Forecast (${formatNumber(forecast.units)} u.)`} tone="good" value={value('forecast')} onChange={(text) => setEdits((current) => ({ ...current, forecast: text }))} />
        </div>
      </div>
    </div>
  </Card>
}
