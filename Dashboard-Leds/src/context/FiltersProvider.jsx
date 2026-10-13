import { useMemo, useState } from 'react'
import { FiltersContext } from './filtersContext.js'

export function FiltersProvider({ children }) {
  const [filterEjecutivo, setFilterEjecutivo] = useState(null)
  const [filterPais, setFilterPais] = useState(null)
  const [filterMes, setFilterMes] = useState(null)
  const [filterTipoLead, setFilterTipoLead] = useState(null)
  const [filterEstado, setFilterEstado] = useState(null)
  const value = useMemo(() => ({
    filterEjecutivo,
    filterPais,
    filterMes,
    filterTipoLead,
    filterEstado,
    setFilterEjecutivo,
    setFilterPais,
    setFilterMes,
    setFilterTipoLead,
    setFilterEstado,
    clearFilters: () => {
      setFilterEjecutivo(null)
      setFilterPais(null)
      setFilterMes(null)
      setFilterTipoLead(null)
      setFilterEstado(null)
    },
  }), [filterEjecutivo, filterPais, filterMes, filterTipoLead, filterEstado])

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}
