import {Socket} from "socket.io-client";

export interface User {
  name: string
  loginTime?: string
}

export interface ConnectionState {
  isConnected: boolean
  isConnecting: boolean
  serverUrl: string | null
  error: string | null
  socket: Socket | null
  reconnectAttempts: number
  maxReconnectAttempts: number
}
