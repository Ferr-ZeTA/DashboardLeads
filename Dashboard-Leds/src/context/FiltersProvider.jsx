import { useMemo, useState } from 'react'
import { FiltersContext } from './filtersContext.js'

export function FiltersProvider({ children }) {
  const [filterEjecutivo, setFilterEjecutivo] = useState('')
  const [filterPais, setFilterPais] = useState('')
  const [filterMes, setFilterMes] = useState('')
  const value = useMemo(() => ({
    filterEjecutivo,
    filterPais,
    filterMes,
    setFilterEjecutivo,
    setFilterPais,
    setFilterMes,
    clearFilters: () => {
      setFilterEjecutivo('')
      setFilterPais('')
      setFilterMes('')
    },
  }), [filterEjecutivo, filterPais, filterMes])

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}
