<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {useUserStore} from "src/stores/userStore";

const userStore = useUserStore()

// Reactive refs
const serverUrl = ref('')

// Load saved server URL from localStorage
onMounted(async () => {

  const savedUrl = localStorage.getItem('tippmaster-server-url')
  if (savedUrl) {
    serverUrl.value = savedUrl
    await userStore.connect(savedUrl)
  }
})

/**
 * Server-URL Format validieren
 */
function validateUrl(value: string): boolean | string {
  if (!value) {
    return 'Server-URL ist erforderlich'
  }

  // Grundlegende URL-Validierung
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'URL muss http:// oder https:// verwenden'
    }

    // Auf Port-Nummer prüfen
    if (!url.port && !url.pathname.includes(':')) {
      return 'Bitte geben Sie eine Port-Nummer an (z.B. :3000)'
    }

    return true
  } catch (error) {
    return `Bitte geben Sie eine gültige URL ein (z.B. http://192.168.0.10:3000)` + (error instanceof Error ? `: ${error.message}` : '')
  }
}

/**
 * Formular-Übermittlung behandeln - mit Server verbinden
 */
async function onSubmit(): Promise<void> {
  if (!serverUrl.value) return

  try {
    await userStore.connect(serverUrl.value)

    // Erfolgreiche Verbindungs-URL speichern
    localStorage.setItem('tippmaster-server-url', serverUrl.value)

    console.log('Erfolgreich mit Server verbunden')
  } catch (error) {
    console.error('Verbindung zum Server fehlgeschlagen:', error)
  }
}

/**
 * Verbindung zum Server trennen
 */
function disconnect(): void {
  userStore.disconnect()
}
</script>

<template>
  <q-card class="connection-card">
    <q-card-section>
      <div class="text-h6">Mit Server verbinden</div>
    </q-card-section>

    <q-card-section>
      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-input
          v-model="serverUrl"
          label="Server-URL"
          placeholder="http://192.168.0.10:3000"
          hint="Geben Sie die Server-IP-Adresse oder den Hostnamen mit Port ein"
          :rules="[validateUrl]"
          outlined
          :loading="userStore.connectionState.isConnecting"
          :disable="userStore.connectionState.isConnecting"
        />

        <div class="row q-gutter-sm">
          <q-btn
            type="submit"
            color="primary"
            :loading="userStore.connectionState.isConnecting"
            :disable="!serverUrl || userStore.connectionState.isConnected"
          >
            <template v-if="userStore.connectionState.isConnected">Verbunden</template>
            <template v-else-if="userStore.connectionState.isConnecting">Verbinde...</template>
            <template v-else>Verbinden</template>
          </q-btn>

          <q-btn
            v-if="userStore.connectionState.isConnected"
            color="negative"
            outline
            @click="disconnect"
            :disable="userStore.connectionState.isConnecting"
          >
            Trennen
          </q-btn>
        </div>

        <q-banner
          v-if="userStore.connectionState.error"
          class="text-white bg-red"
          rounded
        >
          <template v-slot:avatar>
            <q-icon name="error" />
          </template>
          {{ userStore.connectionState.error }}
        </q-banner>

        <q-banner
          v-if="userStore.connectionState.isConnected"
          class="text-white bg-green"
          rounded
        >
          <template v-slot:avatar>
            <q-icon name="check_circle" />
          </template>
          Verbunden mit {{ userStore.connectionState.serverUrl }}
        </q-banner>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.connection-card {
  max-width: 500px;
  margin: 0 auto;
}
</style>
