<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {useUserStore} from "stores/userStore"
import type {ExerciseState, TypingResult, TypingStats} from "src/types/connectionType";

const userStore = useUserStore()


// Props
interface Props {
  isLoggedIn: boolean
  allowCopyPaste?: boolean
  allowCorrections?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  allowCopyPaste: true,
  allowCorrections: true
})


// Reactive data
const textToType = ref('')
const userInput = ref('')
const currentPosition = ref(0)
const isSubmitting = ref(false)
const statusMessage = ref('')
const statusMessageClass = ref('')
const statusMessageIcon = ref('')

// Refs
const textDisplayRef = ref<HTMLElement>()
const inputRef = ref<{ focus: () => void } | null>(null)

// Exercise state
const exerciseState = reactive<ExerciseState>({
  isActive: false,
  isPaused: false,
  isCompleted: false,
  startTime: null,
  pauseTime: null,
  totalPauseTime: 0
})

// Typing statistics
const stats = reactive<TypingStats>({
  wpm: 0,
  accuracy: 100,
  errors: 0,
  corrections: 0,
  elapsedTime: 0,
  totalCharacters: 0,
  correctCharacters: 0
})

// Computed properties
const showCursor = computed(() =>
  exerciseState.isActive && !exerciseState.isPaused && !exerciseState.isCompleted
)

// Timer for updating stats
let statsTimer: number | null = null

// Setup and cleanup
onMounted(() => {
  setupSocketListeners()
  loadExerciseText()
})

onUnmounted(() => {
  void cleanupSocketListeners()
  if (statsTimer) {
    clearInterval(statsTimer)
  }
})

// Watch for input changes
watch(() => userInput.value, (newValue) => {
  if (exerciseState.isActive && !exerciseState.isPaused) {
    updatePosition(newValue)
    calculateStats()
    sendProgressUpdate()
  }
})

/**
 * Get CSS class for character based on typing status
 */
function getCharClass(index: number): string {
  if (index < currentPosition.value) {
    // Character has been typed
    const userChar = userInput.value[index]
    const expectedChar = textToType.value[index]
    return userChar === expectedChar ? 'char-correct' : 'char-incorrect'
  } else if (index === currentPosition.value) {
    // Current character to be typed
    return 'char-current'
  } else {
    // Character not yet typed
    return 'char-pending'
  }
}

/**
 * Handle input changes
 */
function onInput(): void {
  if (!exerciseState.isActive || exerciseState.isPaused) return

  // Start exercise if not started
  if (!exerciseState.startTime) {
    startTimer()
  }
}

/**
 * Handle keydown events
 */
function onKeyDown(event: KeyboardEvent): void {
  // Handle correction prevention if disabled
  if (!props.allowCorrections && event.key === 'Backspace') {
    event.preventDefault()
    showMessage('Corrections are disabled', 'text-white bg-orange', 'block')
    return
  }

  // Handle special keys
  if (event.key === 'Tab') {
    event.preventDefault()
  }
}

/**
 * Handle paste events
 */
function onPaste(event: ClipboardEvent): void {
  if (!props.allowCopyPaste) {
    event.preventDefault()
    showMessage('Copy/paste is disabled', 'text-white bg-orange', 'block')
  }
}

/**
 * Update current position based on user input
 */
function updatePosition(input: string): void {
  let position = 0
  let errors = 0
  let corrections = 0

  for (let i = 0; i < Math.min(input.length, textToType.value.length); i++) {
    if (input[i] === textToType.value[i]) {
      position = i + 1
    } else {
      errors++
      break
    }
  }

  // Count corrections (when user backspaces)
  if (input.length < currentPosition.value) {
    corrections++
  }

  currentPosition.value = position
  stats.errors = errors
  stats.corrections += corrections

  // Check if exercise is completed
  if (position === textToType.value.length && input.length === textToType.value.length) {
    completeExercise()
  }
}

/**
 * Calculate typing statistics
 */
function calculateStats(): void {
  if (!exerciseState.startTime) return

  const now = Date.now()
  const activeTime = now - exerciseState.startTime - exerciseState.totalPauseTime
  stats.elapsedTime = Math.floor(activeTime / 1000)

  if (stats.elapsedTime > 0) {
    // Calculate WPM (words per minute)
    const minutes = stats.elapsedTime / 60
    const wordsTyped = currentPosition.value / 5 // Standard: 5 characters = 1 word
    stats.wpm = Math.round(wordsTyped / minutes) || 0

    // Calculate accuracy
    if (userInput.value.length > 0) {
      const correctChars = currentPosition.value
      stats.accuracy = Math.round((correctChars / userInput.value.length) * 100) || 0
    }

    stats.totalCharacters = userInput.value.length
    stats.correctCharacters = currentPosition.value
  }
}

/**
 * Start the typing exercise
 */
async function startExercise(): Promise<void> {
  if (!textToType.value) {
    showMessage('No text loaded for exercise', 'text-white bg-red', 'error')
    return
  }

  exerciseState.isActive = true
  exerciseState.isPaused = false
  exerciseState.isCompleted = false
  exerciseState.startTime = Date.now()
  exerciseState.totalPauseTime = 0

  // Reset stats
  Object.assign(stats, {
    wpm: 0,
    accuracy: 100,
    errors: 0,
    corrections: 0,
    elapsedTime: 0,
    totalCharacters: 0,
    correctCharacters: 0
  })

  // Reset input
  userInput.value = ''
  currentPosition.value = 0

  // Start stats timer
  startStatsTimer()

  // Focus input
  await nextTick(() => {
    inputRef.value?.focus()
  })

  showMessage('Exercise started!', 'text-white bg-green', 'check_circle')
}

/**
 * Pause the exercise
 */
function pauseExercise(): void {
  exerciseState.isPaused = true
  exerciseState.pauseTime = Date.now()
  stopStatsTimer()
  showMessage('Exercise paused', 'text-white bg-orange', 'pause')
}

/**
 * Resume the exercise
 */
async function resumeExercise(): Promise<void> {
  if (exerciseState.pauseTime) {
    exerciseState.totalPauseTime += Date.now() - exerciseState.pauseTime
    exerciseState.pauseTime = null
  }

  exerciseState.isPaused = false
  startStatsTimer()

  // Focus input
  await nextTick(() => {
    inputRef.value?.focus()
  })

  showMessage('Exercise resumed', 'text-white bg-green', 'play_arrow')
}

/**
 * Complete the exercise
 */
function completeExercise(): void {
  exerciseState.isActive = false
  exerciseState.isCompleted = true
  stopStatsTimer()

  // Final stats calculation
  calculateStats()

  showMessage('Exercise completed!', 'text-white bg-green', 'check_circle')
}

/**
 * Reset the exercise
 */
function resetExercise(): void {
  exerciseState.isActive = false
  exerciseState.isPaused = false
  exerciseState.isCompleted = false
  exerciseState.startTime = null
  exerciseState.pauseTime = null
  exerciseState.totalPauseTime = 0

  userInput.value = ''
  currentPosition.value = 0

  Object.assign(stats, {
    wpm: 0,
    accuracy: 100,
    errors: 0,
    corrections: 0,
    elapsedTime: 0,
    totalCharacters: 0,
    correctCharacters: 0
  })

  stopStatsTimer()
  statusMessage.value = ''
}

/**
 * Submit results to server
 */
function submitResults(): void {
  if (!exerciseState.isCompleted) return

  isSubmitting.value = true

  try {
    const results: TypingResult = {
      duration: stats.elapsedTime,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      errors: stats.errors,
      corrections: stats.corrections,
      rawInput: userInput.value,
      expectedText: textToType.value,
      completedAt: new Date().toISOString()
    }

    userStore.sendMessage('submit_results', results)
    showMessage('Results submitted successfully!', 'text-white bg-green', 'check_circle')

  } catch (error) {
    showMessage('Failed to submit results', 'text-white bg-red', 'error')
    console.error('Submit results error:', error)
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Start stats update timer
 */
function startStatsTimer(): void {
  stopStatsTimer()
  statsTimer = window.setInterval(() => {
    if (exerciseState.isActive && !exerciseState.isPaused) {
      calculateStats()
    }
  }, 1000)
}

/**
 * Stop stats update timer
 */
function stopStatsTimer(): void {
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }
}

/**
 * Start the internal timer
 */
function startTimer(): void {
  if (!exerciseState.startTime) {
    exerciseState.startTime = Date.now()
  }
}

/**
 * Send progress update to server
 */
function sendProgressUpdate(): void {
  try {
    if (userStore.connectionState.isConnected) {
      userStore.sendMessage('typing_progress', {
        position: currentPosition.value,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        errors: stats.errors,
        elapsedTime: stats.elapsedTime,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error sending progress update:', error)
  }
}

/**
 * Setup socket listeners
 */
// Wrapper function to handle async resume
const handleExerciseResumeWrapper = () => void handleExerciseResume()

function setupSocketListeners(): void {
  userStore.onServerEvent('exercise_text', handleExerciseText)
  userStore.onServerEvent('exercise_pause', handleExercisePause)
  userStore.onServerEvent('exercise_resume', handleExerciseResumeWrapper)
  userStore.onServerEvent('exercise_config', handleExerciseConfig)
}

/**
 * Cleanup socket listeners
 */
function cleanupSocketListeners(): void {
  userStore.offServerEvent('exercise_text', handleExerciseText)
  userStore.offServerEvent('exercise_pause', handleExercisePause)
  userStore.offServerEvent('exercise_resume', handleExerciseResumeWrapper)
  userStore.offServerEvent('exercise_config', handleExerciseConfig)
}

/**
 * Handle exercise text from server
 */
function handleExerciseText(data: unknown): void {
  try {
    const textData = data as { text: string }
    textToType.value = textData.text
    resetExercise()
    showMessage('New exercise text loaded', 'text-white bg-blue', 'description')
  } catch (error) {
    console.error('Error handling exercise text:', error)
  }
}

/**
 * Handle exercise pause command from server
 */
function handleExercisePause(): void {
  if (exerciseState.isActive && !exerciseState.isPaused) {
    pauseExercise()
  }
}

/**
 * Handle exercise resume command from server
 */
async function handleExerciseResume(): Promise<void> {
  if (exerciseState.isPaused) {
    await resumeExercise()
  }
}

/**
 * Handle exercise configuration from server
 */
function handleExerciseConfig(data: unknown): void {
  try {
    const config = data as {
      allowCopyPaste?: boolean
      allowCorrections?: boolean
    }

    // Update props (would need to be implemented with defineExpose)
    console.log('Exercise config updated:', config)

  } catch (error) {
    console.error('Error handling exercise config:', error)
  }
}

/**
 * Load exercise text (placeholder - would come from server)
 */
function loadExerciseText(): void {
  // Default text for testing
  textToType.value = 'The quick brown fox jumps over the lazy dog. This is a sample typing exercise to test the typing interface functionality.'
}

/**
 * Format time in MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Show status message
 */
function showMessage(message: string, cssClass: string, icon: string): void {
  statusMessage.value = message
  statusMessageClass.value = cssClass
  statusMessageIcon.value = icon

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (statusMessage.value === message) {
      statusMessage.value = ''
    }
  }, 3000)
}
</script>

<template>
  <q-card class="typing-interface">
    <q-card-section>
      <div class="row items-center justify-between">
        <div class="text-h6">Typing Exercise</div>
        <div class="row q-gutter-md">
          <q-chip
            :color="exerciseState.isActive ? 'green' : 'grey'"
            text-color="white"
            icon="timer"
          >
            {{ formatTime(stats.elapsedTime) }}
          </q-chip>
          <q-chip color="blue" text-color="white" icon="speed">
            {{ stats.wpm }} WPM
          </q-chip>
          <q-chip
            :color="stats.accuracy >= 90 ? 'green' : stats.accuracy >= 75 ? 'orange' : 'red'"
            text-color="white"
            icon="analytics"
          >
            {{ stats.accuracy }}% ACC
          </q-chip>
        </div>
      </div>
    </q-card-section>

    <!-- Text Display Area -->
    <q-card-section class="text-display-section">
      <div class="text-display" ref="textDisplayRef">
        <span
          v-for="(char, index) in textToType"
          :key="index"
          :class="getCharClass(index)"
          class="char"
        >{{ char === ' ' ? '·' : char }}</span>
        <span v-if="showCursor" class="cursor">|</span>
      </div>
    </q-card-section>

    <!-- Input Area -->
    <q-card-section>
      <q-input
        v-model="userInput"
        ref="inputRef"
        :disable="!exerciseState.isActive || exerciseState.isPaused"
        :readonly="exerciseState.isCompleted"
        outlined
        autofocus
        placeholder="Start typing here..."
        @input="onInput"
        @keydown="onKeyDown"
        @paste="onPaste"
        class="typing-input"
        hide-bottom-space
      />

      <div class="row justify-between q-mt-sm">
        <div class="text-caption text-grey-6">
          Position: {{ currentPosition }} / {{ textToType.length }}
        </div>
        <div class="text-caption text-grey-6">
          Errors: {{ stats.errors }}
        </div>
      </div>
    </q-card-section>

    <!-- Control Buttons -->
    <q-card-section>
      <div class="row q-gutter-sm">
        <q-btn
          v-if="!exerciseState.isActive && !exerciseState.isCompleted"
          color="primary"
          @click="startExercise"
          :disable="!textToType || !isLoggedIn"
        >
          Start Exercise
        </q-btn>

        <q-btn
          v-if="exerciseState.isActive && !exerciseState.isPaused"
          color="orange"
          @click="pauseExercise"
        >
          Pause
        </q-btn>

        <q-btn
          v-if="exerciseState.isPaused"
          color="primary"
          @click="resumeExercise"
        >
          Resume
        </q-btn>

        <q-btn
          v-if="exerciseState.isCompleted"
          color="green"
          @click="submitResults"
          :loading="isSubmitting"
        >
          Submit Results
        </q-btn>

        <q-btn
          v-if="exerciseState.isActive || exerciseState.isCompleted"
          color="grey"
          outline
          @click="resetExercise"
        >
          Reset
        </q-btn>
      </div>
    </q-card-section>

    <!-- Status Messages -->
    <q-card-section v-if="statusMessage">
      <q-banner
        :class="statusMessageClass"
        rounded
      >
        <template v-slot:avatar>
          <q-icon :name="statusMessageIcon" />
        </template>
        {{ statusMessage }}
      </q-banner>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.typing-interface {
  max-width: 900px;
  margin: 0 auto;
}

.text-display-section {
  background-color: #f8f8f8;
  border-radius: 8px;
}

.text-display {
  font-family: 'Courier New', monospace;
  font-size: 18px;
  line-height: 1.6;
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  min-height: 120px;
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-end;
}

.char {
  position: relative;
}

.char-correct {
  background-color: #c8e6c9;
  color: #2e7d32;
}

.char-incorrect {
  background-color: #ffcdd2;
  color: #c62828;
}

.char-current {
  background-color: #2196f3;
  color: white;
}

.char-pending {
  color: #666;
}

.cursor {
  animation: blink 1s infinite;
  color: #2196f3;
  font-weight: bold;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.typing-input {
  font-family: 'Courier New', monospace;
  font-size: 16px;
}

.typing-input :deep(.q-field__control) {
  min-height: 80px;
}

.typing-input :deep(textarea) {
  min-height: 60px;
  resize: vertical;
}
</style>
