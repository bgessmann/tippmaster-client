<script setup lang="ts">
import { ref,  onMounted, onUnmounted } from 'vue'
import {useUserStore} from "src/stores/userStore";
import {User} from "src/types/connectionType";

const userStore = useUserStore()
const connectionState = ref(userStore.connectionState)


// Reactive refs
const studentName = ref('')
const isLoggingIn = ref(false)
const isLoggedIn = ref(false)
const loginError = ref('')
const userSession = ref<User | null>(null)


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
  if (!studentName.value || !userStore.connectionState.isConnected) return

  isLoggingIn.value = true
  loginError.value = ''

  try {
    const loginData:User = {
      name: studentName.value.trim(),
      loginTime: new Date().toISOString()
    }

    // Send login event to server
    userStore.login(loginData)

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
    if (userStore.connectionState.isConnected && userSession.value) {
      userStore.logout()
    }
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
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

<style scoped>
.login-card {
  max-width: 500px;
  margin: 0 auto;
}
</style>
