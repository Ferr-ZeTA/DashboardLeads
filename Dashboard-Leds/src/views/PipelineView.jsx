import { ArrowRight, CircleAlert, CircleHelp, MoveRight } from 'lucide-react'
import { Card, SectionHeading } from '../components/ui.jsx'
import { STAGE_ORDER } from '../types/lead.js'
import { stageLabel } from '../utils/leads.js'

const colors = ['#f43f5e', '#fb7185', '#34d399', '#10b981']

export function PipelineView({ leads }) {
  const openLeads = leads.filter((lead) => ['activo', 'en_espera', 'detenido'].includes(lead.estado))
  const knownQualification = openLeads.filter((lead) => lead.calificacionConocida)
  const qualified = knownQualification.filter((lead) => lead.calificado).length
  const stageTotal = STAGE_ORDER.filter((stage) => stage !== 'documentacion')
    .reduce((total, stage) => total + openLeads.filter((lead) => lead.etapa === stage).length, 0)
  return <div className="view-stack">
    <SectionHeading title="Pipeline comercial" subtitle="Distribución de oportunidades abiertas en cada etapa reportada por la API." />
    <div className="pipeline-note"><CircleHelp size={16} />La API no incluye calificación ni una etapa específica de documentación. Esos datos no se infieren.</div>
    {stageTotal !== openLeads.length && <div className="reconciliation-alert" role="alert"><CircleAlert size={18} /><div><strong>El pipeline no cuadra con los estados abiertos</strong><p>{stageTotal} leads asignados a etapas frente a {openLeads.length} abiertos.</p></div></div>}
    <div className="pipeline-grid">{STAGE_ORDER.map((stage, index) => {
      const inStage = openLeads.filter((lead) => lead.etapa === stage)
      const unavailable = stage === 'documentacion'
      const percent = openLeads.length ? Math.round(inStage.length / openLeads.length * 100) : 0
      return <Card key={stage} className={`pipeline-column ${unavailable ? 'stage-unavailable' : ''}`}><div className="stage-color" style={{ backgroundColor: colors[index] }} /><div className="pipeline-title"><span>{String(index + 1).padStart(2, '0')}</span><MoveRight size={16} /></div><h3>{stageLabel(stage)}</h3><div className="pipeline-count">{unavailable ? 'N/D' : inStage.length}</div><div className="pipeline-progress"><span style={{ width: `${percent}%`, backgroundColor: colors[index] }} /></div><div className="pipeline-caption">{unavailable ? 'No reportada por la API' : `${percent}% del pipeline abierto`}</div>{index < STAGE_ORDER.length - 1 && <ArrowRight className="pipeline-arrow" size={20} />}</Card>
    })}</div>
    <Card className="pipeline-foot"><div><strong>{openLeads.length}</strong><span>Oportunidades abiertas</span></div><div><strong>{knownQualification.length ? qualified : 'N/D'}</strong><span>{knownQualification.length ? `Calificadas · dato disponible en ${knownQualification.length} leads` : 'Calificación no incluida en la API'}</span></div></Card>
  </div>
}
