<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from 'stores/userStore'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// Reactive variables
const isConnecting = ref(false)
const connectionError = ref('')

onMounted(async () => {
  try {
    isConnecting.value = true
    connectionError.value = ''

    // Parameter aus der URL extrahieren
    const serverIp = route.query.ip as string
    const loginName = route.query.name as string

    if (!serverIp) {
      // Kein Server-IP Parameter - zur normalen Verbindungsseite weiterleiten
      await router.push('/')
      return
    }

    // Server-URL zusammenbauen (Standard-Port 3000)
    const serverUrl = serverIp.includes('://')
      ? serverIp
      : `http://${serverIp}${serverIp.includes(':') ? '' : ':3000'}`

    console.log('Verbinde mit Server:', serverUrl)

    // Mit Server verbinden
    await userStore.connect(serverUrl)

    // Server-URL für zukünftige Verwendung speichern
    localStorage.setItem('tippmaster-server-url', serverUrl)

    // Wenn ein Login-Name übergeben wurde, diesen auch setzen
    if (loginName) {
      console.log('Setze Login-Name:', loginName)
      localStorage.setItem('tippmaster-username', loginName)

      // Optional: Direkt beim Server einloggen
      await userStore.login({ name: loginName })
    }

    // Zur Hauptseite weiterleiten
    await router.push('/')

  } catch (error) {
    console.error('Verbindungsfehler beim Jumpin:', error)
    connectionError.value = error instanceof Error ? error.message : 'Unbekannter Fehler'

    // Nach kurzer Verzögerung zur normalen Verbindungsseite
    setTimeout(  () => {
       // router.push('/').then()
    }, 3000)
  } finally {
    isConnecting.value = false
  }
})
</script>

<template>
  <div class="jumpin-container">
    <q-card class="jumpin-card">
      <q-card-section class="text-center">
        <div v-if="isConnecting">
          <q-spinner-dots size="50px" color="primary" />
          <div class="text-h6 q-mt-md">Verbinde mit Server...</div>
          <div class="text-caption q-mt-sm">
            IP: {{ route.query.ip }}<br>
            <span v-if="route.query.name">Name: {{ route.query.name }}</span>
          </div>
        </div>

        <div v-else-if="connectionError" class="text-negative">
          <q-icon name="error" size="50px" />
          <div class="text-h6 q-mt-md">Verbindungsfehler</div>
          <div class="text-body2 q-mt-sm">{{ connectionError }}</div>
          <div class="text-caption q-mt-md">
            Weiterleitung zur Hauptseite in wenigen Sekunden...
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped>
.jumpin-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.jumpin-card {
  max-width: 400px;
  width: 100%;
}
</style>
