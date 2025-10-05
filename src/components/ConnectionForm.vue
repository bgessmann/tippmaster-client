<template>
  <q-card class="connection-card">
    <q-card-section>
      <div class="text-h6">Connect to Server</div>
    </q-card-section>

    <q-card-section>
      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-input
          v-model="serverUrl"
          label="Server URL"
          placeholder="http://192.168.0.10:3000"
          hint="Enter the server IP address or hostname with port"
          :rules="[validateUrl]"
          outlined
          :loading="connectionState.isConnecting"
          :disable="connectionState.isConnecting"
        />

        <div class="row q-gutter-sm">
          <q-btn
            type="submit"
            color="primary"
            :loading="connectionState.isConnecting"
            :disable="!serverUrl || connectionState.isConnected"
          >
            <template v-if="connectionState.isConnected">Connected</template>
            <template v-else-if="connectionState.isConnecting">Connecting...</template>
            <template v-else>Connect</template>
          </q-btn>

          <q-btn
            v-if="connectionState.isConnected"
            color="negative"
            outline
            @click="disconnect"
            :disable="connectionState.isConnecting"
          >
            Disconnect
          </q-btn>
        </div>

        <q-banner
          v-if="connectionState.error"
          class="text-white bg-red"
          rounded
        >
          <template v-slot:avatar>
            <q-icon name="error" />
          </template>
          {{ connectionState.error }}
        </q-banner>

        <q-banner
          v-if="connectionState.isConnected"
          class="text-white bg-green"
          rounded
        >
          <template v-slot:avatar>
            <q-icon name="check_circle" />
          </template>
          Connected to {{ connectionState.serverUrl }}
        </q-banner>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { socketService } from '../services/socket.service'

// Reactive refs
const serverUrl = ref('http://localhost:3000')

// Get connection state from socket service
const { connectionState } = socketService

// Load saved server URL from localStorage
onMounted(() => {
  const savedUrl = localStorage.getItem('tippmaster-server-url')
  if (savedUrl) {
    serverUrl.value = savedUrl
  }
})

/**
 * Validate server URL format
 */
function validateUrl(value: string): boolean | string {
  if (!value) {
    return 'Server URL is required'
  }

  // Basic URL validation
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'URL must use http:// or https://'
    }

    // Check for port number
    if (!url.port && !url.pathname.includes(':')) {
      return 'Please specify a port number (e.g., :3000)'
    }

    return true
  } catch (error) {
    return `Please enter a valid URL (e.g., http://192.168.0.10:3000)` + (error instanceof Error ? `: ${error.message}` : '')
  }
}

/**
 * Handle form submission - connect to server
 */
async function onSubmit(): Promise<void> {
  if (!serverUrl.value) return

  try {
    await socketService.connect(serverUrl.value)

    // Save successful connection URL
    localStorage.setItem('tippmaster-server-url', serverUrl.value)

    console.log('Successfully connected to server')
  } catch (error) {
    console.error('Failed to connect to server:', error)
  }
}

/**
 * Disconnect from server
 */
function disconnect(): void {
  socketService.disconnect()
}
</script>

<style scoped>
.connection-card {
  max-width: 500px;
  margin: 0 auto;
}
</style>
