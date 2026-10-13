import { useCallback, useEffect, useState } from 'react'
import { fetchLeads } from '../services/api.js'

export function useLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const reload = useCallback(async (signal) => {
    if (signal?.aborted) return
    setLoading(true)
    setError('')
    try {
      const nextLeads = await fetchLeads(signal)
      setLeads(nextLeads)
      setLastUpdated(new Date())
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError(cause instanceof Error ? cause.message : 'Error desconocido al cargar los leads.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => void reload(controller.signal))
    return () => controller.abort()
  }, [reload])

  return { leads, loading, error, lastUpdated, reload: () => reload() }
}
