import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io } from 'socket.io-client'
import type {  Socket } from 'socket.io-client'
import type { ConnectionState, User} from 'types/type.ts'

export const useUserStore = defineStore('user', () => {
  console.log('[UserStore] 📦 Store wird initialisiert...')

  // User State
  const user = ref<User | null>(null)
  const isLoggedIn = ref(false)
  const loginError = ref<string | null>(null)

  // Connection State
  const connectionState = ref<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    serverUrl: null,
    error: null,
    socket: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  })

  // Computed
  const canConnect = computed(() => !connectionState.value.isConnecting && !connectionState.value.isConnected)
  const needsLogin = computed(() => connectionState.value.isConnected && !isLoggedIn.value)
  const isReady = computed(() => connectionState.value.isConnected && isLoggedIn.value)

  // Load saved data from localStorage
  function loadSavedData() {
    console.log('[UserStore] 💾 Lade gespeicherte Daten aus localStorage...')

    const savedUrl = localStorage.getItem('tippmaster-server-url')
    if (savedUrl) {
      connectionState.value.serverUrl = savedUrl
      console.log('[UserStore] ✅ Gespeicherte Server-URL gefunden:', savedUrl)
    } else {
      console.log('[UserStore] ❌ Keine gespeicherte Server-URL gefunden')
    }

    const savedUser = localStorage.getItem('tippmaster-user')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        user.value = {
          ...parsedUser,
          loginTime: parsedUser.loginTime ? new Date(parsedUser.loginTime) : undefined
        }
        console.log('[UserStore] ✅ Gespeicherte Benutzerdaten gefunden:', user.value?.name)
      } catch (error) {
        console.error('[UserStore] ❌ Fehler beim Parsen der Benutzerdaten:', error)
        localStorage.removeItem('tippmaster-user')
        console.log('[UserStore] 🗑️ Fehlerhafte Benutzerdaten entfernt')
      }
    } else {
      console.log('[UserStore] ❌ Keine gespeicherten Benutzerdaten gefunden')
    }
  }

  // Save user data to localStorage
  function saveUserData() {
    console.log('[UserStore] 💾 Speichere Benutzerdaten...')
    if (user.value) {
      localStorage.setItem('tippmaster-user', JSON.stringify(user.value))
      console.log('[UserStore] ✅ Benutzerdaten gespeichert für:', user.value.name)
    } else {
      localStorage.removeItem('tippmaster-user')
      console.log('[UserStore] 🗑️ Benutzerdaten aus localStorage entfernt')
    }
  }

  // Connect to server
  async function connect(serverUrl: string): Promise<void> {
    console.log('[UserStore] 🔗 Verbindungsaufbau gestartet...')
    console.log('[UserStore] 📡 Target URL:', serverUrl)

    if (connectionState.value.isConnecting) {
      console.warn('[UserStore] ⚠️ Verbindung bereits im Gange - überspringe')
      return
    }

    if (connectionState.value.isConnected) {
      console.warn('[UserStore] ⚠️ Bereits verbunden - trenne zuerst')
      disconnect()
    }

    connectionState.value.isConnecting = true
    connectionState.value.error = null
    connectionState.value.reconnectAttempts = 0

    console.log('[UserStore] ⏳ Status: Verbindung wird hergestellt...')

    try {
      // Validate URL
      console.log('[UserStore] 🔍 Validiere URL...')
      const url = new URL(serverUrl)
      console.log('[UserStore] 📋 URL Details:', {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname
      })

      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('URL muss http:// oder https:// verwenden')
      }
      console.log('[UserStore] ✅ URL-Validierung erfolgreich')

      // Create socket connection
      console.log('[UserStore] 🔌 Erstelle Socket-Verbindung...')
      const socket = io(serverUrl, {
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: connectionState.value.maxReconnectAttempts,
        reconnectionDelay: 2000,
        transports: ['websocket', 'polling']
      })

      console.log('[UserStore] 📊 Socket-Konfiguration:', {
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: connectionState.value.maxReconnectAttempts,
        reconnectionDelay: 2000,
        transports: ['websocket', 'polling']
      })

      // Setup socket event listeners
      console.log('[UserStore] 👂 Richte Socket Event-Listener ein...')
      setupSocketListeners(socket)

      // Wait for connection
      console.log('[UserStore] ⏳ Warte auf Verbindungsbestätigung...')
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('[UserStore] ⏰ Verbindungs-Timeout erreicht (15s)')
          reject(new Error('Verbindungs-Timeout erreicht'))
        }, 15000)

        socket.on('connect', () => {
          console.log('[UserStore] ✅ Socket connect Event erhalten')
          clearTimeout(timeout)
          resolve()
        })

        socket.on('connect_error', (error) => {
          console.error('[UserStore] ❌ Socket connect_error Event:', error)
          clearTimeout(timeout)
          reject(new Error(`Verbindungsfehler: ${error.message}`))
        })
      })

      connectionState.value.socket = socket
      connectionState.value.serverUrl = serverUrl
      connectionState.value.isConnected = true

      // Save successful connection
      localStorage.setItem('tippmaster-server-url', serverUrl)
      console.log('[UserStore] 💾 Erfolgreiche Verbindung gespeichert')

      console.log('[UserStore] 🎉 Verbindung erfolgreich hergestellt!')
      console.log('[UserStore] 📈 Verbindungsstatus:', {
        isConnected: connectionState.value.isConnected,
        isConnecting: connectionState.value.isConnecting,
        serverUrl: connectionState.value.serverUrl
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Verbindungsfehler'
      connectionState.value.error = errorMessage
      console.error('[UserStore] 💥 Verbindungsfehler aufgetreten:', {
        error: errorMessage,
        originalError: error,
        serverUrl: serverUrl
      })
      throw error
    } finally {
      connectionState.value.isConnecting = false
      console.log('[UserStore] 🏁 Verbindungsversuch abgeschlossen')
    }
  }

  // Setup socket event listeners
  function setupSocketListeners(socket: Socket) {
    console.log('[UserStore] 🎧 Richte Socket Event-Listener ein...')

    socket.on('connect', () => {
      connectionState.value.isConnected = true
      connectionState.value.error = null
      connectionState.value.reconnectAttempts = 0
      console.log('[UserStore] ✅ Socket EVENT: connect')
      console.log('[UserStore] 🆔 Socket ID:', socket.id)
      console.log('[UserStore] 🔄 Status aktualisiert - Verbunden!')
    })

    socket.on('disconnect', (reason) => {
      connectionState.value.isConnected = false
      isLoggedIn.value = false
      console.log('[UserStore] ❌ Socket EVENT: disconnect')
      console.log('[UserStore] 📋 Disconnect Reason:', reason)
      console.log('[UserStore] 🔄 Status aktualisiert - Getrennt!')
      console.log('[UserStore] 👤 Benutzer automatisch abgemeldet')
    })

    socket.on('connect_error', (error) => {
      connectionState.value.error = `Verbindungsfehler: ${error.message}`
      console.error('[UserStore] ❌ Socket EVENT: connect_error')
      console.error('[UserStore] 💥 Fehlerdetails:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      })
    })

    socket.on('reconnect_attempt', (attemptNumber) => {
      connectionState.value.reconnectAttempts = attemptNumber
      console.log('[UserStore] 🔄 Socket EVENT: reconnect_attempt')
      console.log('[UserStore] 🔢 Versuch Nummer:', attemptNumber)
      console.log('[UserStore] 📊 Versuche:', `${attemptNumber}/${connectionState.value.maxReconnectAttempts}`)
    })

    socket.on('reconnect', (attemptNumber) => {
      console.log('[UserStore] ✅ Socket EVENT: reconnect')
      console.log('[UserStore] 🎉 Wiederverbindung erfolgreich nach', attemptNumber, 'Versuchen')
    })

    socket.on('reconnect_failed', () => {
      connectionState.value.error = 'Wiederverbindung fehlgeschlagen'
      console.error('[UserStore] ❌ Socket EVENT: reconnect_failed')
      console.error('[UserStore] 💥 Alle Wiederverbindungsversuche fehlgeschlagen')
      console.error('[UserStore] 🔢 Versucht:', connectionState.value.maxReconnectAttempts, 'mal')
    })

    // Login response
    socket.on('login_response', (response: { success: boolean, message?: string, user?: any }) => {
      console.log('[UserStore] 📨 Socket EVENT: login_response')
      console.log('[UserStore] 📋 Login Response:', response)

      if (response.success) {
        isLoggedIn.value = true
        loginError.value = null
        console.log('[UserStore] ✅ Login erfolgreich!')

        if (response.user) {
          user.value = { ...user.value, ...response.user }
          saveUserData()
          console.log('[UserStore] 👤 Benutzerdaten vom Server aktualisiert:', response.user)
        }
      } else {
        loginError.value = response.message || 'Login fehlgeschlagen'
        console.error('[UserStore] ❌ Login fehlgeschlagen!')
        console.error('[UserStore] 💬 Server-Nachricht:', response.message)
      }
    })

    // Handle server commands
    socket.on('server_command', (command: any) => {
      console.log('[UserStore] 📨 Socket EVENT: server_command')
      console.log('[UserStore] ⚡ Server-Befehl empfangen:', command)
      // Hier können Sie weitere Server-Befehle verarbeiten
    })

    console.log('[UserStore] ✅ Alle Socket Event-Listener eingerichtet')
  }

  // Login user
  async function login(userData: Omit<User, 'loginTime'>): Promise<void> {
    console.log('[UserStore] 👤 Login-Prozess gestartet...')
    console.log('[UserStore] 📋 Benutzerdaten:', {
      name: userData.name,
      seatNumber: userData.seatNumber || 'nicht angegeben',
      classId: userData.classId || 'nicht angegeben'
    })

    if (!connectionState.value.isConnected || !connectionState.value.socket) {
      const error = 'Keine Verbindung zum Server'
      console.error('[UserStore] ❌ Login fehlgeschlagen:', error)
      throw new Error(error)
    }

    loginError.value = null

    const loginData = {
      ...userData,
      loginTime: new Date()
    }

    console.log('[UserStore] ⏰ Login-Zeit gesetzt:', loginData.loginTime)

    user.value = loginData
    saveUserData()

    const loginPayload = {
      name: userData.name,
      seatNumber: userData.seatNumber,
      classId: userData.classId,
      timestamp: loginData.loginTime
    }

    console.log('[UserStore] 📤 Sende Login-Event an Server...')
    console.log('[UserStore] 📋 Login-Payload:', loginPayload)

    // Send login event to server
    connectionState.value.socket.emit('user_login', loginPayload)

    // Wait for server response (with timeout)
    console.log('[UserStore] ⏳ Warte auf Server-Antwort...')
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[UserStore] ⏰ Login-Timeout erreicht (10s)')
        reject(new Error('Login-Timeout erreicht'))
      }, 10000)

      const handleLoginResponse = (response: { success: boolean, message?: string }) => {
        console.log('[UserStore] 📨 Login-Response erhalten:', response)
        clearTimeout(timeout)

        if (response.success) {
          console.log('[UserStore] ✅ Login-Response: Erfolgreich!')
          resolve()
        } else {
          console.error('[UserStore] ❌ Login-Response: Fehlgeschlagen!')
          console.error('[UserStore] 💬 Fehlermeldung:', response.message)
          reject(new Error(response.message || 'Login fehlgeschlagen'))
        }
      }

      connectionState.value.socket?.once('login_response', handleLoginResponse)
    })
  }

  // Logout user
  function logout(): void {
    console.log('[UserStore] 👋 Logout-Prozess gestartet...')

    if (connectionState.value.socket && isLoggedIn.value) {
      const logoutPayload = {
        name: user.value?.name,
        timestamp: new Date()
      }
      console.log('[UserStore] 📤 Sende Logout-Event an Server...')
      console.log('[UserStore] 📋 Logout-Payload:', logoutPayload)
      connectionState.value.socket.emit('user_logout', logoutPayload)
    } else {
      console.log('[UserStore] ⚠️ Kein Socket oder nicht eingeloggt - nur lokaler Logout')
    }

    isLoggedIn.value = false
    loginError.value = null
    const userName = user.value?.name
    user.value = null
    localStorage.removeItem('tippmaster-user')

    console.log('[UserStore] ✅ Benutzer abgemeldet:', userName)
    console.log('[UserStore] 🗑️ Lokale Benutzerdaten gelöscht')
  }

  // Disconnect from server
  function disconnect(): void {
    console.log('[UserStore] 🔌 Disconnect-Prozess gestartet...')

    if (connectionState.value.socket) {
      console.log('[UserStore] 📤 Trenne Socket-Verbindung...')
      console.log('[UserStore] 🆔 Socket ID:', connectionState.value.socket.id)
      connectionState.value.socket.disconnect()
      connectionState.value.socket = null
      console.log('[UserStore] ✅ Socket getrennt und nullgesetzt')
    } else {
      console.log('[UserStore] ⚠️ Kein Socket zu trennen')
    }

    const oldServerUrl = connectionState.value.serverUrl
    connectionState.value.isConnected = false
    connectionState.value.error = null
    connectionState.value.serverUrl = null
    isLoggedIn.value = false
    loginError.value = null

    console.log('[UserStore] 🔄 Verbindungsstatus zurückgesetzt')
    console.log('[UserStore] ✅ Verbindung getrennt von:', oldServerUrl)
  }

  // Send message to server
  function sendMessage(event: string, data: any): void {
    console.log('[UserStore] 📤 Sende Nachricht an Server...')
    console.log('[UserStore] 📋 Event:', event)
    console.log('[UserStore] 📋 Data:', data)

    if (connectionState.value.socket && connectionState.value.isConnected) {
      connectionState.value.socket.emit(event, data)
      console.log('[UserStore] ✅ Nachricht gesendet')
    } else {
      console.warn('[UserStore] ⚠️ Nachricht nicht gesendet - keine Verbindung!')
      console.warn('[UserStore] 📊 Status:', {
        hasSocket: !!connectionState.value.socket,
        isConnected: connectionState.value.isConnected
      })
    }
  }

  // Listen to server events
  function onServerEvent(event: string, callback: (data: any) => void): void {
    console.log('[UserStore] 👂 Registriere Event-Listener:', event)

    if (connectionState.value.socket) {
      connectionState.value.socket.on(event, (data: any) => {
        console.log('[UserStore] 📨 Event empfangen:', event)
        console.log('[UserStore] 📋 Event Data:', data)
        callback(data)
      })
      console.log('[UserStore] ✅ Event-Listener registriert')
    } else {
      console.warn('[UserStore] ⚠️ Kann Event-Listener nicht registrieren - kein Socket!')
    }
  }

  // Remove server event listener
  function offServerEvent(event: string, callback?: (data: any) => void): void {
    console.log('[UserStore] 🚫 Entferne Event-Listener:', event)

    if (connectionState.value.socket) {
      connectionState.value.socket.off(event, callback)
      console.log('[UserStore] ✅ Event-Listener entfernt')
    } else {
      console.warn('[UserStore] ⚠️ Kann Event-Listener nicht entfernen - kein Socket!')
    }
  }

  // Initialize store
  function init(): void {
    console.log('[UserStore] 🚀 Store-Initialisierung...')
    loadSavedData()
    console.log('[UserStore] ✅ Store initialisiert')
    console.log('[UserStore] 📊 Initialer Status:', {
      hasUser: !!user.value,
      userName: user.value?.name,
      savedServerUrl: connectionState.value.serverUrl,
      isConnected: connectionState.value.isConnected,
      isLoggedIn: isLoggedIn.value
    })
  }

  // Reset store
  function reset(): void {
    console.log('[UserStore] 🔄 Store-Reset gestartet...')
    disconnect()
    logout()
    localStorage.removeItem('tippmaster-server-url')
    localStorage.removeItem('tippmaster-user')
    console.log('[UserStore] ✅ Store komplett zurückgesetzt')
    console.log('[UserStore] 🗑️ Alle localStorage-Daten gelöscht')
  }

  return {
    // State
    user,
    isLoggedIn,
    loginError,
    connectionState: computed(() => connectionState.value),

    // Computed
    canConnect,
    needsLogin,
    isReady,

    // Actions
    init,
    reset,
    connect,
    disconnect,
    login,
    logout,
    sendMessage,
    onServerEvent,
    offServerEvent
  }
})
