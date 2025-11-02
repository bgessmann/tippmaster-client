<script setup lang="ts">
import { useExamenStore } from 'stores/examenStore'


const examenStore = useExamenStore()



</script>

<template>
  <div v-if="examenStore.currentExam" class="exam-container">
    <!-- Header -->
    <q-toolbar class="bg-primary text-white">
      <q-toolbar-title>
        {{ examenStore.currentExam.title }}
      </q-toolbar-title>

      <q-chip color="white" text-color="primary" icon="timer">
        {{ formatTime(examenStore.timeRemaining) }}
      </q-chip>
    </q-toolbar>

    <!-- Progress -->
    <q-linear-progress
      :value="examenStore.progressPercentage / 100"
      color="primary"
      size="8px"
      class="q-mb-md"
    />

    <!-- Question -->
    <q-card v-if="examenStore.currentQuestion" class="q-ma-md">
      <q-card-section>
        <div class="text-h6">
          Frage {{ examenStore.currentQuestionIndex + 1 }} von {{ examenStore.currentExam.questions.length }}
        </div>

        <p class="q-mt-md">{{ examenStore.currentQuestion.question }}</p>

        <!-- Multiple Choice -->
        <div v-if="examenStore.currentQuestion.type === 'multiple_choice'">
          <q-option-group
            v-model="selectedAnswer"
            :options="examenStore.currentQuestion.options?.map(opt => ({ label: opt, value: opt })) || []"
            color="primary"
            type="radio"
          />
        </div>

        <!-- Boolean -->
        <div v-else-if="examenStore.currentQuestion.type === 'boolean'">
          <q-btn-group>
            <q-btn
              @click="handleAnswerSubmit(true)"
              color="positive"
              label="Wahr"
            />
            <q-btn
              @click="handleAnswerSubmit(false)"
              color="negative"
              label="Falsch"
            />
          </q-btn-group>
        </div>

        <!-- Text Input -->
        <div v-else-if="examenStore.currentQuestion.type === 'text'">
          <q-input
            v-model="textAnswer"
            outlined
            placeholder="Ihre Antwort..."
            @keyup.enter="handleAnswerSubmit(textAnswer)"
          />
        </div>
      </q-card-section>

      <q-card-actions align="between">
        <q-btn
          @click="examenStore.previousQuestion"
          :disable="examenStore.currentQuestionIndex === 0"
          color="primary"
          outline
          label="Zurück"
        />

        <q-btn
          @click="examenStore.nextQuestion"
          :disable="examenStore.currentQuestionIndex === examenStore.currentExam.questions.length - 1"
          color="primary"
          label="Weiter"
        />
      </q-card-actions>
    </q-card>

    <!-- Finish Button -->
    <div class="text-center q-pa-md">
      <q-btn
        @click="examenStore.finishExam"
        color="positive"
        size="lg"
        label="Prüfung beenden"
        :disable="!examenStore.examProgress?.answers.length"
      />
    </div>
  </div>

  <!-- Waiting State -->
  <div v-else class="text-center q-pa-xl">
    <q-spinner size="3em" color="primary" />
    <p>Warte auf Prüfungsdaten...</p>
  </div>
</template>
