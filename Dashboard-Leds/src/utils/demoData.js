import { mapMeetingLead } from './leads.js'

// Datos ficticios con la misma forma que /api/metrics/reuniones para explorar el
// prototipo sin credenciales. Se generan con una semilla fija para que sean estables.
const ADVISORS = {
  GT: ['Andrea Morales', 'Diego Castillo', 'Valeria Ruiz', 'Javier Pineda', 'Sofía Herrera'],
  SV: ['Carlos Méndez', 'Gabriela Rivas', 'Luis Alvarado', 'Mariela Cruz', 'Rodrigo Flores'],
}
const CHANNELS = ['Página Web', 'PBX', 'Redes Sociales', 'Mailing', 'Lead Manual', 'Voicebot']
const COMPANIES = ['Logística', 'Seguridad', 'Constructora', 'Transporte', 'Agroindustria', 'Hotel', 'Minera', 'Distribuidora', 'Clínica', 'Retail']
const FOLLOW_UP_NOTES = [
  'A la espera de papelería del cliente',
  'Pienso cerrar el próximo viernes',
  'Cliente enviará información de facturación',
  'Pendiente de firma de contrato',
  'Propuesta aprobada por gerencia, falta orden de compra',
  'Cliente evaluando otras opciones',
  'Llamar para confirmar interés',
  'No contesta, reintentar',
  'Solicitó ajuste de precio',
  'Revisar cobertura en zona norte',
]

function seededRandom(seed) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

export function generateDemoLeads(now = new Date()) {
  const random = seededRandom(20261014)
  const pick = (items) => items[Math.floor(random() * items.length)]
  const day = 86400000
  const rows = []

  for (let index = 0; index < 320; index++) {
    const country = random() < 0.55 ? 'GT' : 'SV'
    const createdAt = new Date(now.getTime() - Math.floor(random() * 180) * day)
    const qualified = random() < 0.62
    const stage = qualified ? 1 + Math.floor(random() * 6) : 1 + Math.floor(random() * 3)
    const won = stage === 6 && random() < 0.7
    const lost = !won && random() < (qualified ? 0.18 : 0.45)
    const status = won || lost ? 'cerrado' : random() < 0.08 ? 'stage_2_overdue' : 'en_proceso'
    const units = 2 + Math.floor(random() * (random() < 0.15 ? 60 : 18))
    const followUp = new Date(now.getTime() + Math.round((random() * 30) - 9) * day)
    followUp.setHours(8 + Math.floor(random() * 9), random() < 0.5 ? 0 : 30, 0, 0)
    const note = stage >= 5 ? pick(FOLLOW_UP_NOTES) : pick(FOLLOW_UP_NOTES.slice(5))

    const feedback = {}
    for (let current = 1; current <= stage; current++) feedback[current] = {}
    if (stage >= 4) feedback[4].cantidad_equipos = units
    if (status !== 'cerrado') {
      feedback[stage].proxima_gestion = { fecha_hora: followUp.toISOString(), notas: note, created_at: createdAt.toISOString() }
    }
    if (lost) feedback[6] = { ...feedback[6], razon_cierre: `${pick(['Precio', 'Proveedor', 'No responde', 'Presupuesto'])}: sin avance` }

    rows.push({
      id: 10000 + index,
      advisor_name: pick(ADVISORS[country]),
      pais: country,
      status,
      resultado_venta: won ? 'cerrada' : lost ? 'perdida' : null,
      opportunity_stage: stage,
      tipo_lead: qualified ? 'calificado' : 'no_calificado',
      created_at: createdAt.toISOString(),
      canal: pick(CHANNELS),
      client_id: `CL-${String(4000 + index)}`,
      client_name: `${pick(COMPANIES)} ${String.fromCharCode(65 + Math.floor(random() * 26))}${String.fromCharCode(65 + Math.floor(random() * 26))}`,
      stage_feedback_json: feedback,
    })
  }
  return rows.map(mapMeetingLead)
}
