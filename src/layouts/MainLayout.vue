<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from 'stores/userStore'

const userStore = useUserStore()

// Initialize the store when MainLayout mounts
onMounted(() => {
  userStore.init()
})
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
        />

        <q-toolbar-title>
          Quasar App
        </q-toolbar-title>

        <div>Quasar v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>


    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
