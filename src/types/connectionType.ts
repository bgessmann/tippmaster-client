import type { Socket } from "socket.io-client";

export interface User {
  id?: string
  name: string
  loginTime?: string | Date
}

export interface ConnectionConfig {
  serverUrl: string
  serverPort: number
  serverHttps: boolean
}
export interface ConnectionState {
  isConnected?: boolean
  isConnecting?: boolean
  connectionConfig: ConnectionConfig ,
  error?: string | null
  socket?: typeof Socket | null
  reconnectAttempts: number
  maxReconnectAttempts: number | undefined
}

export interface SendStatus {
  position: number;
  wpm: number;
  accuracy: number;
  errors: number;
  elapsedTime: number;
  timestamp: string;
}
// Socket.IO Error Interface

// Interfaces
export interface ExerciseState {
  isActive: boolean
  isPaused: boolean
  isCompleted: boolean
  startTime: number | null
  pauseTime: number | null
  totalPauseTime: number
}

export interface TypingStats {
  wpm: number
  accuracy: number
  errors: number
  corrections: number
  elapsedTime: number
  totalCharacters: number
  correctCharacters: number
}

export interface TypingResult {
  duration: number
  wpm: number
  accuracy: number
  errors: number
  corrections: number
  rawInput: string
  expectedText: string
  completedAt: string
}
