import { LEAD_STATES, LOSS_REASONS, STAGE_ORDER } from '../types/lead.js'
import { isOverdue, monthValue } from './dates.js'

export const OPEN_STATES = ['activo', 'en_espera', 'detenido']

export function resumenBase(leads, filters) {
  return leads.filter((lead) => {
    if (filters.filterEjecutivo && lead.asesor !== filters.filterEjecutivo) return false
    if (filters.filterPais && lead.pais !== filters.filterPais) return false
    if (filters.filterMes && monthValue(lead.proximaGestion ?? lead.fechaReunion) !== filters.filterMes) return false
    return true
  })
}

export function calculateMetrics(leads, now = new Date()) {
  const enProceso = leads.filter((lead) => OPEN_STATES.includes(lead.estado)).length
  const ganados = leads.filter((lead) => lead.estado === 'ganado').length
  const perdidos = leads.filter((lead) => lead.estado === 'perdido').length
  const invalidos = leads.filter((lead) => lead.estado === 'invalido').length
  const total = leads.length
  const reconciliationIssues = []
  const stateDifference = total - (enProceso + ganados + perdidos + invalidos)
  const lostWithoutReason = leads.filter((lead) => lead.estado === 'perdido' && !lead.motivo).length
  const reasonOutsideLost = leads.filter((lead) => lead.estado !== 'perdido' && lead.motivo).length
  const lostWithManualReason = leads.filter((lead) => lead.estado === 'perdido' && lead.motivo).length
  const reasonDifference = perdidos - lostWithManualReason

  if (stateDifference !== 0) {
    reconciliationIssues.push({
      code: 'state_partition',
      difference: stateDifference,
      message: `El total no cuadra con la partición de estados (diferencia: ${stateDifference}).`,
    })
  }
  if (reasonDifference !== 0 || reasonOutsideLost > 0) {
    reconciliationIssues.push({
      code: 'loss_reason',
      difference: reasonDifference,
      message: `${lostWithoutReason} lead(s) perdido(s) sin motivo y ${reasonOutsideLost} motivo(s) fuera de un lead perdido.`,
    })
  }

  return {
    total,
    enProceso,
    ganados,
    perdidos,
    invalidos,
    tasaCierre: total ? ganados / total : 0,
    vencidos: leads.filter((lead) => OPEN_STATES.includes(lead.estado) && isOverdue(lead.proximaGestion, now)).length,
    reconciliationIssues,
  }
}

export function parseLead(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`El registro ${index + 1} no es un objeto válido.`)
  }
  const id = value.id ?? value.identificador
  if (id === undefined || id === null || String(id).trim() === '') {
    throw new Error(`El registro ${index + 1} no contiene id o identificador.`)
  }
  if (!LEAD_STATES.includes(value.estado)) throw new Error(`El lead ${id} tiene un estado desconocido.`)
  const etapa = value.etapa
  const maxEtapa = value.maxEtapa ?? etapa
  if (!STAGE_ORDER.includes(etapa)) throw new Error(`El lead ${id} tiene una etapa desconocida.`)
  if (!STAGE_ORDER.includes(maxEtapa)) throw new Error(`El lead ${id} tiene una marca maxEtapa desconocida.`)
  if (value.motivo != null && !LOSS_REASONS.includes(value.motivo)) {
    throw new Error(`El lead ${id} contiene un motivo fuera del catálogo permitido.`)
  }
  for (const field of ['asesor', 'pais']) {
    if (value[field] != null && typeof value[field] !== 'string') {
      throw new Error(`El campo ${field} del lead ${id} debe ser texto.`)
    }
  }
  if (value.calificado != null && typeof value.calificado !== 'boolean') {
    throw new Error(`El campo calificado del lead ${id} debe ser booleano.`)
  }
  for (const field of ['calificacionConocida', 'maxEtapaConocida']) {
    if (value[field] != null && typeof value[field] !== 'boolean') {
      throw new Error(`El campo ${field} del lead ${id} debe ser booleano.`)
    }
  }

  const optionalBoolean = (field) => {
    const candidate = value[field]
    if (candidate == null) return undefined
    if (typeof candidate !== 'boolean') throw new Error(`El campo ${field} del lead ${id} debe ser booleano.`)
    return candidate
  }
  const optionalDate = (field) => {
    const candidate = value[field]
    if (candidate == null || candidate === '') return undefined
    if (typeof candidate !== 'string' && typeof candidate !== 'number') {
      throw new Error(`El campo ${field} del lead ${id} debe ser una fecha válida.`)
    }
    const date = new Date(candidate)
    if (Number.isNaN(date.getTime())) throw new Error(`El campo ${field} del lead ${id} contiene una fecha inválida.`)
    return date.toISOString()
  }

  return {
    id: String(id),
    asesor: typeof value.asesor === 'string' && value.asesor.trim() ? value.asesor.trim() : 'Sin asignar',
    pais: typeof value.pais === 'string' && value.pais.trim() ? value.pais.trim() : 'No disponible',
    estado: value.estado,
    etapa,
    maxEtapa,
    maxEtapaConocida: typeof value.maxEtapaConocida === 'boolean'
      ? value.maxEtapaConocida
      : value.maxEtapa != null,
    calificado: typeof value.calificado === 'boolean' ? value.calificado : false,
    calificacionConocida: typeof value.calificacionConocida === 'boolean'
      ? value.calificacionConocida
      : typeof value.calificado === 'boolean',
    motivo: value.motivo ?? undefined,
    proximaGestion: optionalDate('proximaGestion'),
    fechaReunion: optionalDate('fechaReunion'),
    fcFecha: optionalDate('fcFecha'),
    fcIncluir: optionalBoolean('fcIncluir'),
    fcExcluir: optionalBoolean('fcExcluir'),
    fcIntentar: optionalBoolean('fcIntentar'),
    producto: value.producto,
    raw: value.raw,
    apiStage: value.apiStage,
    apiStageLabel: value.apiStageLabel,
  }
}

export function extractLeadRows(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    for (const key of ['leads', 'reuniones', 'data', 'items', 'results']) {
      const nested = payload[key]
      if (Array.isArray(nested)) return nested
      if (nested && typeof nested === 'object') return extractLeadRows(nested)
    }
  }
  throw new Error('La API respondió con un formato inesperado: se esperaba una lista de leads.')
}

export function parseLeads(payload) {
  const leads = extractLeadRows(payload).map(parseLead)
  const ids = new Set()
  for (const lead of leads) {
    if (ids.has(lead.id)) throw new Error(`La API devolvió el identificador duplicado ${lead.id}.`)
    ids.add(lead.id)
  }
  return leads
}

function meetingState(row) {
  if (row.resultado_venta === 'perdida') return 'perdido'
  if (row.resultado_venta === 'cerrada') return 'ganado'
  if (row.status === 'cerrado') return 'invalido'
  if (row.status === 'no_agendado') return 'en_espera'
  if (row.status === 'stage_2_overdue') return 'detenido'
  if (row.status === 'en_proceso') return 'activo'
  throw new Error(`El lead ${row.id ?? '(sin id)'} tiene un estado de API no reconocido.`)
}

function meetingStage(row) {
  const stage = Number(row.opportunity_stage)
  if (stage === 1 || stage === 2 || stage === 3) return 'contacto_inicial'
  if (stage === 4) return 'propuesta_enviada'
  if (stage === 5) return 'propuesta_enviada'
  if (stage === 6) return 'contratacion'
  throw new Error(`El lead ${row.id ?? '(sin id)'} tiene una etapa API no reconocida.`)
}

function lossReason(category) {
  if (typeof category !== 'string' || !category.trim()) return undefined
  const normalized = String(category ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (/no respond|no contesta|no responde|sin contacto|no esta|no estaba/.test(normalized)) return 'no_respondio'
  if (/proveedor|tomaron otro/.test(normalized)) return 'proveedor'
  if (/precio|costo/.test(normalized)) return 'precio'
  if (/presupuesto|no tiene presupuesto/.test(normalized)) return 'presupuesto'
  if (/no interesa|no interes|no quiere|no desea|no interesado/.test(normalized)) return 'no_interesado'
  if (/ya no|no necesita|sin requerimiento|no hay requerimiento|no solicito/.test(normalized)) return 'ya_no_necesita'
  if (/incompat|no compatible/.test(normalized)) return 'incompatibilidad'
  if (/cobertura/.test(normalized)) return 'cobertura'
  if (/condicion comercial/.test(normalized)) return 'condiciones_comerciales'
  if (/plazo|contractual/.test(normalized)) return 'plazo_contractual'
  if (/decision interna/.test(normalized)) return 'decision_interna'
  if (/sin categoria|sin especificar/.test(normalized)) return undefined
  if (/no califica|no aplica|no valida|equivocado|numero extrano/.test(normalized)) return 'no_valida'
  if (/fraude|estafa/.test(normalized)) return 'fraude'
  if (/modalidad/.test(normalized)) return 'modalidad_no_compatible'
  return 'otro'
}

export function mapMeetingLead(row, index) {
  const estado = meetingState(row)
  const etapa = meetingStage(row)
  const country = row.pais ?? row.country
  const pais = country === 'GT' ? 'Guatemala' : country === 'SV' ? 'El Salvador' : country

  return parseLead({
    id: row.id,
    asesor: row.asesor ?? row.advisor_name,
    pais,
    estado,
    etapa,
    maxEtapa: etapa,
    maxEtapaConocida: false,
    calificado: typeof row.calificado === 'boolean' ? row.calificado : false,
    calificacionConocida: typeof row.calificado === 'boolean',
    motivo: estado === 'perdido' ? lossReason(row.categoria_cierre) : undefined,
    proximaGestion: row.proximaGestion ?? row.proxima_gestion ?? undefined,
    fechaReunion: row.start_time ?? undefined,
    apiStage: Number(row.opportunity_stage),
    apiStageLabel: row.opportunity_stage_label ?? '',
    producto: estado === 'ganado' ? row.rubro || undefined : undefined,
    raw: row,
  }, index)
}

export function stageLabel(stage) {
  return {
    contacto_inicial: 'Contacto inicial',
    propuesta_enviada: 'Propuesta enviada',
    documentacion: 'Documentación',
    contratacion: 'Contratación',
  }[stage] ?? stage
}

export function stateLabel(state) {
  return {
    activo: 'Activo',
    en_espera: 'En espera',
    detenido: 'Detenido',
    ganado: 'Ganado',
    perdido: 'Perdido',
    invalido: 'Inválido',
  }[state] ?? state
}

export function lossReasonLabel(reason) {
  return reason.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase())
}
