import { useEffect, useState } from 'react'

import { ApiError, fetchBookings, fetchClient } from '../api/client.ts'

interface State<T> {
  data?: T
  error?: ApiError | Error
  loading: boolean
}

/** Loads `load(signal)` whenever `key` changes; aborts the previous request. */
function useApi<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<State<T>>({ loading: true })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState({ loading: true })
    load(controller.signal)
      .then((data) => setState({ data, loading: false }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setState({ error, loading: false })
      })
    return () => controller.abort()
    // `load` is recreated every render; `key` captures its inputs.
  }, [key, reloadKey])

  return { ...state, reload: () => setReloadKey((k) => k + 1) }
}

export function useBookings(dateFrom: string, dateTo: string) {
  return useApi(`${dateFrom}/${dateTo}`, (signal) => fetchBookings(dateFrom, dateTo, signal))
}

export function useClient(clientId: string) {
  return useApi(clientId, (signal) => fetchClient(clientId, signal))
}
