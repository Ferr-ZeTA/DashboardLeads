import { Filter, RotateCcw } from 'lucide-react'
import { useFilters } from '../hooks/useFilters.js'
import { monthValue } from '../utils/dates.js'

export function FilterBar({ leads }) {
  const filters = useFilters()
  const asesores = [...new Set(leads.map((lead) => lead.asesor))].sort()
  const paises = [...new Set(leads.map((lead) => lead.pais))].sort()
  const months = [...new Set(leads.map((lead) => monthValue(lead.proximaGestion)).filter(Boolean))].sort().reverse()

  return (
    <div className="filter-bar">
      <div className="filter-title"><Filter size={16} /><span>Filtros globales</span></div>
      <label className="filter-control"><span>Ejecutivo</span><select value={filters.filterEjecutivo} onChange={(event) => filters.setFilterEjecutivo(event.target.value)}><option value="">Todos</option>{asesores.map((asesor) => <option key={asesor} value={asesor}>{asesor}</option>)}</select></label>
      <label className="filter-control"><span>País</span><select value={filters.filterPais} onChange={(event) => filters.setFilterPais(event.target.value)}><option value="">Todos</option>{paises.map((pais) => <option key={pais} value={pais}>{pais}</option>)}</select></label>
      <label className="filter-control"><span>Mes de próxima gestión</span><select value={filters.filterMes} onChange={(event) => filters.setFilterMes(event.target.value)}><option value="">Todos los meses</option>{months.map((month) => <option key={month} value={month}>{new Intl.DateTimeFormat('es-SV', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))}</option>)}</select></label>
      <button className="clear-filters" onClick={filters.clearFilters} title="Limpiar filtros"><RotateCcw size={15} /><span>Limpiar</span></button>
    </div>
  )
}
