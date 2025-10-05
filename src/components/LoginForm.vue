<template>
  <q-card class="login-card">
    <q-card-section>
      <div class="text-h6">Student Login</div>
      <div class="text-caption text-grey-6">Enter your details to start the exam</div>
    </q-card-section>

    <q-card-section>
      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-input
          v-model="studentName"
          label="Student Name *"
          placeholder="Enter your full name"
          hint="Required field"
          :rules="[validateName]"
          outlined
          :disable="isLoggedIn || isLoggingIn"
          autofocus
        />

        <q-input
          v-model="seatNumber"
          label="Seat Number"
          placeholder="e.g., A1, B5, 12"
          hint="Optional - if assigned by teacher"
          outlined
          :disable="isLoggedIn || isLoggingIn"
        />

        <q-input
          v-model="classId"
          label="Class ID"
          placeholder="e.g., Math101, ENG202"
          hint="Optional - class or course identifier"
          outlined
          :disable="isLoggedIn || isLoggingIn"
        />

        <div class="row q-gutter-sm">
          <q-btn
            type="submit"
            color="primary"
            :loading="isLoggingIn"
            :disable="!studentName || isLoggedIn || !connectionState.isConnected"
          >
            <template v-if="isLoggedIn">Logged In</template>
            <template v-else-if="isLoggingIn">Logging In...</template>
            <template v-else>Login</template>
          </q-btn>

          <q-btn
            v-if="isLoggedIn"
            color="negative"
            outline
            @click="logout"
            :disable="isLoggingIn"
          >
            Logout
          </q-btn>
        </div>

        <q-banner
          v-if="loginError"
          class="text-white bg-red"
          rounded
        >
          <template v-slot:avatar>
            <q-icon name="error" />
          </template>
          {{ loginError }}
        </q-banner>

        <q-banner
          v-if="isLoggedIn && userSession"
          class="text-white bg-green"
          rounded
        >
          <template v-slot:avatar>
            <q-icon name="check_circle" />
          </template>
          Welcome, {{ userSession.name }}!
          <div v-if="userSession.seatNumber" class="text-caption">
            Seat: {{ userSession.seatNumber }}
          </div>
          <div v-if="userSession.classId" class="text-caption">
            Class: {{ userSession.classId }}
          </div>
        </q-banner>

        <q-banner
          v-if="!connectionState.isConnected"
          class="text-white bg-orange"
          rounded
        >
          <template v-slot:avatar>
            <q-icon name="warning" />
          </template>
          Please connect to server first
        </q-banner>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref,  onMounted, onUnmounted } from 'vue'
import { socketService } from '../services/socket.service'

// User session interface
export interface UserSession {
  name: string
  seatNumber?: string
  classId?: string
  loginTime: string
  sessionId?: string
}

// Reactive refs
const studentName = ref('')
const seatNumber = ref('')
const classId = ref('')
const isLoggingIn = ref(false)
const isLoggedIn = ref(false)
const loginError = ref('')
const userSession = ref<UserSession | null>(null)

// Get connection state from socket service
const { connectionState } = socketService

// Load saved session data
onMounted(() => {
  loadSession()
  setupSocketListeners()
})

// Cleanup socket listeners
onUnmounted(() => {
  cleanupSocketListeners()
})

/**
 * Validate student name
 */
function validateName(value: string): boolean | string {
  if (!value || value.trim().length === 0) {
    return 'Student name is required'
  }

  if (value.trim().length < 2) {
    return 'Name must be at least 2 characters long'
  }

  if (value.trim().length > 100) {
    return 'Name must be less than 100 characters'
  }

  return true
}

/**
 * Handle form submission - login
 */
 function onSubmit(): void {
  if (!studentName.value || !connectionState.isConnected) return

  isLoggingIn.value = true
  loginError.value = ''

  try {
    const loginData = {
      name: studentName.value.trim(),
      seatNumber: seatNumber.value.trim() || undefined,
      classId: classId.value.trim() || undefined,
      timestamp: new Date().toISOString()
    }

    // Send login event to server
    socketService.emit('login', loginData)

    // Wait for response (handled by socket listener)

  } catch (error) {
    isLoggingIn.value = false
    loginError.value = error instanceof Error ? error.message : 'Login failed'
    console.error('Login error:', error)
  }
}

/**
 * Handle logout
 */
function logout(): void {
  try {
    if (connectionState.isConnected && userSession.value) {
      socketService.emit('student_logout', {
        sessionId: userSession.value.sessionId,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    clearSession()
  }
}

/**
 * Setup socket event listeners
 */
function setupSocketListeners(): void {
  socketService.on('login_response', handleLoginResponse)
  socketService.on('login_error', handleLoginError)
  socketService.on('session_expired', handleSessionExpired)
}

/**
 * Cleanup socket event listeners
 */
function cleanupSocketListeners(): void {
  socketService.off('login_response', handleLoginResponse)
  socketService.off('login_error', handleLoginError)
  socketService.off('session_expired', handleSessionExpired)
}

/**
 * Handle successful login response from server
 */
function handleLoginResponse(data: unknown): void {
  try {
    const response = data as {
      success: boolean
      sessionId: string
      message?: string
    }

    if (response.success) {
      const session: UserSession = {
        name: studentName.value.trim(),
        seatNumber: seatNumber.value.trim() || '',
        classId: classId.value.trim() || '',
        loginTime: new Date().toISOString(),
        sessionId: response.sessionId
      }

      userSession.value = session
      isLoggedIn.value = true
      isLoggingIn.value = false

      // Save session to localStorage
      localStorage.setItem('tippmaster-user-session', JSON.stringify(session))

      console.log('Login successful:', session)
    } else {
      handleLoginError(response.message || 'Login failed')
    }
  } catch (error) {
    handleLoginError('Invalid response from server' + (error instanceof Error ? `: ${error.message}` : ''))
    console.error(
      'Invalid response from server:',
      data,
      error instanceof Error ? error.message : ''
    )
  }
}

/**
 * Handle login error from server
 */
function handleLoginError(data: unknown): void {
  isLoggingIn.value = false
  loginError.value = typeof data === 'string' ? data : 'Login failed'
  console.error('Login error:', data)
}

/**
 * Handle session expiration
 */
function handleSessionExpired(): void {
  loginError.value = 'Your session has expired. Please login again.'
  clearSession()
}

/**
 * Load session from localStorage
 */
function loadSession(): void {
  try {
    const savedSession = localStorage.getItem('tippmaster-user-session')
    if (savedSession) {
      const session: UserSession = JSON.parse(savedSession)
      userSession.value = session
      isLoggedIn.value = true

      // Pre-fill form fields
      studentName.value = session.name
      seatNumber.value = session.seatNumber || ''
      classId.value = session.classId || ''
    }
  } catch (error) {
    console.error('Error loading session:', error)
    clearSession()
  }
}

/**
 * Clear session data
 */
function clearSession(): void {
  userSession.value = null
  isLoggedIn.value = false
  isLoggingIn.value = false
  localStorage.removeItem('tippmaster-user-session')
}
</script>

<style scoped>
.login-card {
  max-width: 500px;
  margin: 0 auto;
}
</style>
