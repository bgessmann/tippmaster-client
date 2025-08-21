<template>
  <div class="tippmaster-app">
    <!-- Header -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>
          TippMaster Client
        </q-toolbar-title>

        <div class="row items-center q-gutter-md">
          <!-- Connection Status -->
          <q-chip
            :color="connectionState.isConnected ? 'green' : 'red'"
            text-color="white"
            :icon="connectionState.isConnected ? 'wifi' : 'wifi_off'"
            size="sm"
          >
            {{ connectionState.isConnected ? 'Connected' : 'Disconnected' }}
          </q-chip>

          <!-- User Status -->
          <q-chip
            v-if="userSession"
            color="blue"
            text-color="white"
            icon="person"
            size="sm"
          >
            {{ userSession.name }}
          </q-chip>
        </div>
      </q-toolbar>
    </q-header>

    <!-- Main Content -->
    <q-page-container>
      <q-page class="flex flex-center" padding>
        <div class="full-width">

          <!-- Step 1: Server Connection -->
          <div v-if="currentStep === 'connection'" class="step-container">
            <div class="step-header">
              <h4>Step 1: Connect to Server</h4>
              <p class="text-grey-6">Enter the server URL to establish connection</p>
            </div>

            <ConnectionForm />

            <div class="step-actions">
              <q-btn
                v-if="connectionState.isConnected"
                color="primary"
                @click="nextStep"
                icon="arrow_forward"
              >
                Next: Login
              </q-btn>
            </div>
          </div>

          <!-- Step 2: Student Login -->
          <div v-if="currentStep === 'login'" class="step-container">
            <div class="step-header">
              <h4>Step 2: Student Login</h4>
              <p class="text-grey-6">Enter your student information</p>
            </div>

            <LoginForm />

            <div class="step-actions">
              <q-btn
                color="grey"
                outline
                @click="previousStep"
                icon="arrow_back"
              >
                Back
              </q-btn>

              <q-btn
                v-if="userSession"
                color="primary"
                @click="nextStep"
                icon="arrow_forward"
              >
                Next: Exercise
              </q-btn>
            </div>
          </div>

          <!-- Step 3: Typing Exercise -->
          <div v-if="currentStep === 'exercise'" class="step-container">
            <div class="step-header">
              <h4>Step 3: Typing Exercise</h4>
              <p class="text-grey-6">Complete the typing exercise</p>
            </div>

            <TypingInterface
              :is-logged-in="!!userSession"
              :allow-copy-paste="exerciseConfig.allowCopyPaste"
              :allow-corrections="exerciseConfig.allowCorrections"
            />

            <div class="step-actions">
              <q-btn
                color="grey"
                outline
                @click="previousStep"
                icon="arrow_back"
              >
                Back
              </q-btn>

              <q-btn
                color="primary"
                @click="restartProcess"
                icon="refresh"
                outline
              >
                Start Over
              </q-btn>
            </div>
          </div>

        </div>
      </q-page>
    </q-page-container>

    <!-- Footer -->
    <q-footer class="bg-grey-8 text-white">
      <q-toolbar>
        <q-toolbar-title class="text-center text-caption">
          TippMaster Client v1.0.0 - Real-time Typing Exercise System
        </q-toolbar-title>
      </q-toolbar>
    </q-footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive,  onMounted, onUnmounted } from 'vue'
import { socketService } from '../services/socket.service'
import ConnectionForm from './ConnectionForm.vue'
import LoginForm from './LoginForm.vue'
import TypingInterface from './TypingInterface.vue'
import type { UserSession } from './LoginForm.vue'

// Current step in the process
type AppStep = 'connection' | 'login' | 'exercise'
const currentStep = ref<AppStep>('connection')

// User session data
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const userSession = ref<UserSession | null>(null)

// Exercise configuration
const exerciseConfig = reactive({
  allowCopyPaste: true,
  allowCorrections: true
})

// Get connection state from socket service
const { connectionState } = socketService

// Setup and cleanup
onMounted(() => {
  setupSocketListeners()
  loadUserSession()
  determineInitialStep()
})

onUnmounted(() => {
  cleanupSocketListeners()
})

/**
 * Load user session from localStorage
 */
function loadUserSession(): void {
  try {
    const savedSession = localStorage.getItem('tippmaster-user-session')
    if (savedSession) {
      userSession.value = JSON.parse(savedSession)
    }
  } catch (error) {
    console.error('Error loading user session:', error)
  }
}

/**
 * Determine initial step based on current state
 */
function determineInitialStep(): void {
  if (connectionState.isConnected && userSession.value) {
    currentStep.value = 'exercise'
  } else if (connectionState.isConnected) {
    currentStep.value = 'login'
  } else {
    currentStep.value = 'connection'
  }
}

/**
 * Navigate to next step
 */
function nextStep(): void {
  switch (currentStep.value) {
    case 'connection':
      if (connectionState.isConnected) {
        currentStep.value = 'login'
      }
      break
    case 'login':
      if (userSession.value) {
        currentStep.value = 'exercise'
      }
      break
    case 'exercise':
      // Stay on exercise step
      break
  }
}

/**
 * Navigate to previous step
 */
function previousStep(): void {
  switch (currentStep.value) {
    case 'exercise':
      currentStep.value = 'login'
      break
    case 'login':
      currentStep.value = 'connection'
      break
    case 'connection':
      // Stay on connection step
      break
  }
}

/**
 * Restart the entire process
 */
function restartProcess(): void {
  // Disconnect from server
  socketService.disconnect()

  // Clear user session
  userSession.value = null
  localStorage.removeItem('tippmaster-user-session')

  // Reset to first step
  currentStep.value = 'connection'
}

/**
 * Setup socket event listeners
 */
function setupSocketListeners(): void {
  // Listen for login success
  socketService.on('login_response', (data: unknown) => {
    try {
      const response = data as { success: boolean }
      if (response.success) {
        loadUserSession()
        if (currentStep.value === 'login') {
          nextStep()
        }
      }
    } catch (error) {
      console.error('Error handling login response:', error)
    }
  })

  // Listen for exercise configuration updates
  socketService.on('exercise_config', (data: unknown) => {
    try {
      const config = data as {
        allowCopyPaste?: boolean
        allowCorrections?: boolean
      }

      if (config.allowCopyPaste !== undefined) {
        exerciseConfig.allowCopyPaste = config.allowCopyPaste
      }

      if (config.allowCorrections !== undefined) {
        exerciseConfig.allowCorrections = config.allowCorrections
      }

      console.log('Exercise config updated:', exerciseConfig)
    } catch (error) {
      console.error('Error handling exercise config:', error)
    }
  })

  // Listen for connection changes
  socketService.on('connect', () => {
    console.log('Connected to server')
  })

  socketService.on('disconnect', () => {
    console.log('Disconnected from server')
    // If user was logged in and gets disconnected, go back to connection step
    if (currentStep.value !== 'connection') {
      currentStep.value = 'connection'
    }
  })

  // Listen for session expiration
  socketService.on('session_expired', () => {
    userSession.value = null
    localStorage.removeItem('tippmaster-user-session')
    currentStep.value = 'login'
  })
}

/**
 * Cleanup socket event listeners
 */
function cleanupSocketListeners(): void {
  socketService.off('login_response')
  socketService.off('exercise_config')
  socketService.off('connect')
  socketService.off('disconnect')
  socketService.off('session_expired')
}
</script>

<style scoped>
.tippmaster-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.step-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.step-header {
  text-align: center;
  margin-bottom: 30px;
}

.step-header h4 {
  margin: 0 0 10px 0;
  color: #1976d2;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.step-actions .q-btn {
  min-width: 120px;
}

/* Responsive design */
@media (max-width: 600px) {
  .step-container {
    padding: 10px;
  }

  .step-actions {
    flex-direction: column;
    gap: 10px;
  }

  .step-actions .q-btn {
    width: 100%;
  }
}
</style>
