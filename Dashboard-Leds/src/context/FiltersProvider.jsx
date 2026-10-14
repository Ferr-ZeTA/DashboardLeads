import { useMemo, useState } from 'react'
import { FiltersContext } from './filtersContext.js'

const EMPTY_FILTERS = {
  filterMes: null,
  filterPais: null,
  filterEjecutivo: null,
  filterTipoLead: null,
  filterCalificacion: null,
}

export function FiltersProvider({ children }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const value = useMemo(() => ({
    ...filters,
    setFilter: (key, selection) => setFilters((current) => ({ ...current, [key]: selection })),
    clearFilters: () => setFilters(EMPTY_FILTERS),
  }), [filters])

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}
