import { useMemo } from 'react'
import { useFilters } from './useFilters.js'
import { calculateMetrics, resumenBase } from '../utils/leads.js'

export function useMetrics(leads) {
  const filters = useFilters()
  const base = useMemo(() => resumenBase(leads, filters), [leads, filters])
  const metrics = useMemo(() => calculateMetrics(base), [base])
  return { base, metrics }
}
