<script setup lang="ts">
import {  reactive } from 'vue'
import ConnectionForm from './ConnectionForm.vue'
import LoginForm from './LoginForm.vue'
import TypingInterface from './TypingInterface.vue'


import {useUserStore} from "stores/userStore";
import {storeToRefs} from "pinia";



const userStore = useUserStore()

const connection = storeToRefs(userStore)



// Exercise configuration
const exerciseConfig = reactive({
  allowCopyPaste: true,
  allowCorrections: true
})




</script>

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
          <div @click="userStore.disconnect()" class="cursor-pointer">
            <q-chip
              :color="connection.connectionState.value.isConnected ? 'green' : 'red'"
              text-color="white"
              :icon="connection.connectionState.value.isConnected ? 'wifi' : 'wifi_off'"
              size="sm"
            >
              {{ connection.connectionState.value.isConnected ? 'Connected' : 'Disconnected' }}
            </q-chip>

          </div>

          <div @click="userStore.logout()" class="cursor-pointer">
            <!-- User Status -->
            <q-chip
              v-if="connection.isReady.value === true"
              color="blue"
              text-color="white"
              icon="person"
              size="sm"
              @click="userStore.logout()"
            >
              {{ connection.user.value?.name }}
            </q-chip>
          </div>

        </div>
      </q-toolbar>
    </q-header>

    <!-- Main Content -->
    <q-page-container>
      <q-page class="flex flex-center" padding>
        <div class="full-width">

          <!-- Step 1: Server Connection -->
          <div v-if="userStore.canConnect" class="step-container">
            <div class="step-header">
              <h4>Step 1: Connect to Server</h4>
              <p class="text-grey-6">Enter the server URL to establish connection</p>
            </div>

            <ConnectionForm  />


          </div>

          <!-- Step 2: Student Login -->
          <div v-if="userStore.needsLogin" class="step-container">
            <div class="step-header">
              <h4>Step 2: Student Login</h4>
              <p class="text-grey-6">Enter your student information</p>
            </div>

            <LoginForm />


          </div>

          <!-- Step 3: Typing Exercise -->
          <div v-if="userStore.isReady" class="step-container">
            <div class="step-header">
              <h4>Step 3: Typing Exercise</h4>
              <p class="text-grey-6">Complete the typing exercise</p>
            </div>

            <exemen-loader-component></exemen-loader-component>
            <TypingInterface
              :is-logged-in="!!connection.isReady"
              :allow-copy-paste="exerciseConfig.allowCopyPaste"
              :allow-corrections="exerciseConfig.allowCorrections"
            />

            <div class="step-actions">
              <q-btn
                color="grey"
                outline

                icon="arrow_back"
              >
                Back
              </q-btn>

              <q-btn
                color="primary"
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
