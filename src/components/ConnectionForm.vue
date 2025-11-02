<script setup lang="ts">
import { onMounted } from 'vue'
import {useUserStore} from "src/stores/userStore";

const userStore = useUserStore()


// Load saved server URL from localStorage
onMounted(async () => {
  // Test

})



function validatePort(value: string): boolean | string {
  if (!value) {
    return 'Port ist erforderlich'
  }
  if (value.toString().trim().length < 1) {
    return 'Port muss mindestens 1 Zeichen lang sein'
  }
  if (value.toString().trim().length > 5) {
    return 'Port darf maximal 5 Zeichen lang sein'
  }
  if (isNaN(Number(value))) {
    return 'Port muss eine Zahl sein'
  }
  if (Number(value) < 1 || Number(value) > 65535) {
    return 'Port muss zwischen 1 und 65535 liegen'
  }
  return true
}

/**
 * Server-URL Format validieren
 */
function validateUrl(value: string): boolean | string {
  if (!value) {
    return 'Server-URL ist erforderlich'
  }

  // Grundlegende URL-Validierung
  try {
    return true
  } catch (error) {
    return `Bitte geben Sie eine gültigen Hostnamen ein (z.B. 192.168.0.10)` + (error instanceof Error ? `: ${error.message}` : '')
  }
}

/**
 * Formular-Übermittlung behandeln - mit Server verbinden
 */
async function onSubmit(): Promise<void> {
  if (!userStore.connectionState.connectionConfig.serverUrl) return

  try {
    await userStore.connect()

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
      <q-form @submit="onSubmit" class="q-gutter-md ">
        <q-input
          v-model="userStore.connectionState.connectionConfig.serverUrl"
          label="Server-URL"
          placeholder="192.168.0.10"
          hint="Geben Sie die Server-IP-Adresse oder den Hostnamen ein"
          :rules="[validateUrl]"
          outlined
          :loading="userStore.connectionState.isConnecting"
          :disable="userStore.connectionState.isConnecting"
        />
        <q-input
          v-model="userStore.connectionState.connectionConfig.serverPort"
          label="Server-URL"
          placeholder="3000"
          hint="Geben Sie den Port ein"
          :rules="[validatePort]"
          outlined
          :loading="userStore.connectionState.isConnecting"
          :disable="userStore.connectionState.isConnecting"
        />

        <div class="row q-gutter-sm">
          <q-btn
            type="submit"
            color="primary"
            :loading="userStore.connectionState.isConnecting"
            :disable="!userStore.connectionState.connectionConfig.serverUrl || userStore.connectionState.isConnected"
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
          Verbunden mit {{ userStore.connectionState.connectionConfig.serverUrl }}
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
