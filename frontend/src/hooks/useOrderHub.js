import { useEffect, useRef } from 'react'
import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr'
import { tokenStorage } from '../lib/apiClient'
import { useAuth } from './index'

/**
 * Subscribes to live order events.
 *
 * The server decides which groups a connection joins from the JWT, so a customer only ever
 * receives their own orders and staff receive everything. Handlers are kept in a ref so a
 * parent re-render never tears down and rebuilds the websocket.
 */
export function useOrderHub({ onOrderPlaced, onOrderStatusChanged, enabled = true } = {}) {
  const { isAuthenticated } = useAuth()
  const handlers = useRef({ onOrderPlaced, onOrderStatusChanged })

  handlers.current = { onOrderPlaced, onOrderStatusChanged }

  useEffect(() => {
    if (!enabled || !isAuthenticated) return undefined

    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/orders', {
        // A websocket handshake cannot carry an Authorization header, so the token goes
        // in the query string; the API accepts it for /hubs routes only.
        accessTokenFactory: () => tokenStorage.read()?.accessToken ?? '',
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('OrderPlaced', (order) => handlers.current.onOrderPlaced?.(order))
    connection.on('OrderStatusChanged', (order) => handlers.current.onOrderStatusChanged?.(order))

    connection.start().catch(() => {
      // A dropped realtime feed degrades to normal refetching rather than breaking the
      // page, so there is nothing useful to show the user here.
    })

    return () => {
      connection.stop().catch(() => {})
    }
  }, [enabled, isAuthenticated])
}
