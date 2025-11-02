
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useUserStore } from './userStore'

// Types für Tipp-Examen
interface TypingExamConfig {
  id: string
  title: string
  text: string
  duration: number // in Minuten
  allowCorrection: boolean
  showErrors: boolean
  difficulty: 'easy' | 'medium' | 'hard'
  language: 'de' | 'en'
}

interface TypingStats {
  totalCharacters: number
  correctCharacters: number
  incorrectCharacters: number
  wordsPerMinute: number
  charactersPerMinute: number
  accuracy: number // in Prozent
  errorRate: number // in Prozent
  currentPosition: number
  backspaceCount: number
  correctionCount: number
}

interface TypingProgress {
  examId: string
  studentId: string
  startTime: Date
  lastActivity: Date
  currentText: string
  referenceText: string
  isCompleted: boolean
  stats: TypingStats
  keystrokes: KeystrokeEvent[]
}

interface KeystrokeEvent {
  key: string
  timestamp: Date
  position: number
  isCorrect: boolean
  isBackspace: boolean
  isCorrection: boolean
}

export const useExamenStore = defineStore('examen', () => {
  // State
  const examState = ref({
    isInitialized: false,
    isExamActive: false,
    isExamStarted: false,
    isPracticeMode: false,
    isLoading: false,
    error: null as string | null
  })

  const currentExam = ref<TypingExamConfig | null>(null)
  const examProgress = ref<TypingProgress | null>(null)
  const timeRemaining = ref(0) // in Sekunden
  const currentTypedText = ref('')

  let examTimer: NodeJS.Timeout | null = null
  let statsTimer: NodeJS.Timeout | null = null
  let lastKeystroke: Date | null = null

  // Dependencies
  const userStore = useUserStore()

  // Computed Properties
  const currentStats = computed((): TypingStats => {
    if (!examProgress.value) {
      return {
        totalCharacters: 0,
        correctCharacters: 0,
        incorrectCharacters: 0,
        wordsPerMinute: 0,
        charactersPerMinute: 0,
        accuracy: 100,
        errorRate: 0,
        currentPosition: 0,
        backspaceCount: 0,
        correctionCount: 0
      }
    }

    return calculateStats()
  })

  const progressPercentage = computed(() => {
    if (!currentExam.value || !examProgress.value) return 0
    return Math.round((examProgress.value.stats.currentPosition / currentExam.value.text.length) * 100)
  })

  const isTextCompleted = computed(() => {
    return currentExam.value && examProgress.value &&
      examProgress.value.stats.currentPosition >= currentExam.value.text.length
  })

  const canStartExam = computed(() => {
    return currentExam.value && !examState.value.isExamStarted && userStore.isLoggedIn
  })

  const formattedTime = computed(() => {
    const minutes = Math.floor(timeRemaining.value / 60)
    const seconds = timeRemaining.value % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  })

  // Initialization
  function init() {
    console.log('[ExamenStore] ⌨️ Initialisiere Tipp-ExamenStore...')

    if (examState.value.isInitialized) {
      console.log('[ExamenStore] ⚠️ Bereits initialisiert')
      return
    }

    if (!userStore.connectionState.isConnected) {
      console.error('[ExamenStore] ❌ UserStore nicht verbunden')
      examState.value.error = 'Keine Verbindung zum Server'
      return
    }

    setupSocketListeners()
    examState.value.isInitialized = true

    // Server über Bereitschaft informieren
    sendToServer('typing_exam_student_ready', {
      studentId: userStore.user?.id,
      timestamp: new Date().toISOString()
    })

    console.log('[ExamenStore] ✅ Tipp-Examen Initialisierung abgeschlossen')
  }

  // Socket Event Listeners
  function setupSocketListeners() {
    const socket = userStore.connectionState.socket

    if (!socket) {
      console.error('[ExamenStore] ❌ Kein Socket verfügbar')
      return
    }

    // Tipp-Prüfungsdaten empfangen
    socket.on('typing_exam_data', handleExamData)

    // Prüfung starten
    socket.on('typing_exam_start', handleExamStart)

    // Prüfung beenden
    socket.on('typing_exam_end', handleExamEnd)

    // Lehrer-Nachrichten
    socket.on('teacher_message', handleTeacherMessage)

    console.log('[ExamenStore] 📡 Tipp-Examen Socket-Listener eingerichtet')
  }

  // Event Handlers
  function handleExamData(data: { exam: TypingExamConfig }) {
    console.log('[ExamenStore] 📋 Tipp-Prüfungsdaten empfangen:', data.exam.title)

    currentExam.value = data.exam
    examState.value.isExamActive = true
    examState.value.error = null
    currentTypedText.value = ''

    // Progress initialisieren
    examProgress.value = {
      examId: data.exam.id,
      studentId: userStore.user?.id || '',
      startTime: new Date(),
      lastActivity: new Date(),
      currentText: '',
      referenceText: data.exam.text,
      isCompleted: false,
      stats: {
        totalCharacters: 0,
        correctCharacters: 0,
        incorrectCharacters: 0,
        wordsPerMinute: 0,
        charactersPerMinute: 0,
        accuracy: 100,
        errorRate: 0,
        currentPosition: 0,
        backspaceCount: 0,
        correctionCount: 0
      },
      keystrokes: []
    }

    console.log('[ExamenStore] ✅ Tipp-Prüfung geladen:', data.exam.title)
  }

  function handleExamStart(data: { startTime: string, duration: number }) {
    console.log('[ExamenStore] 🚀 Tipp-Prüfung gestartet!')

    examState.value.isExamStarted = true
    timeRemaining.value = data.duration * 60 // Minuten zu Sekunden

    if (examProgress.value) {
      examProgress.value.startTime = new Date(data.startTime)
    }

    startExamTimer()
    startStatsSync()
  }

  function handleExamEnd(data: { reason: string, finalStats?: TypingStats }) {
    console.log('[ExamenStore] 🏁 Tipp-Prüfung beendet:', data.reason)

    examState.value.isExamStarted = false

    if (examProgress.value) {
      examProgress.value.isCompleted = true
      if (data.finalStats) {
        examProgress.value.stats = data.finalStats
      }
    }

    stopTimers()

    // Finale Statistik senden
    sendStatsToServer('typing_exam_completed')
  }

  function handleTeacherMessage(data: { message: string, type: 'info' | 'warning' | 'error' }) {
    console.log(`[ExamenStore] 👨‍🏫 Lehrer-Nachricht (${data.type}):`, data.message)
  }

  // Timer Management
  function startExamTimer() {
    if (examTimer) clearInterval(examTimer)

    examTimer = setInterval(() => {
      if (timeRemaining.value > 0) {
        timeRemaining.value--

        if (examProgress.value) {
          examProgress.value.lastActivity = new Date()
        }
      } else {
        handleExamEnd({ reason: 'time_expired' })
      }
    }, 1000)
  }

  function startStatsSync() {
    if (statsTimer) clearInterval(statsTimer)

    // Alle 5 Sekunden Statistiken senden
    statsTimer = setInterval(() => {
      if (examState.value.isExamStarted) {
        sendStatsToServer('typing_stats_update')
      }
    }, 5000)
  }

  function stopTimers() {
    if (examTimer) {
      clearInterval(examTimer)
      examTimer = null
    }

    if (statsTimer) {
      clearInterval(statsTimer)
      statsTimer = null
    }
  }

  // Typing Logic
  function handleKeyInput(key: string, position: number) {
    if (!currentExam.value || !examProgress.value || !examState.value.isExamStarted) {
      return false
    }

    const now = new Date()
    const isBackspace = key === 'Backspace'
    const referenceChar = currentExam.value.text[position] || ''
    const isCorrect = !isBackspace && key === referenceChar
    const isCorrection = isBackspace && position < examProgress.value.stats.currentPosition

    // Keystroke Event erfassen
    const keystroke: KeystrokeEvent = {
      key,
      timestamp: now,
      position,
      isCorrect,
      isBackspace,
      isCorrection
    }

    examProgress.value.keystrokes.push(keystroke)
    examProgress.value.lastActivity = now
    lastKeystroke = now

    // Backspace handling
    if (isBackspace) {
      if (currentTypedText.value.length > 0 && currentExam.value.allowCorrection) {
        currentTypedText.value = currentTypedText.value.slice(0, -1)
        examProgress.value.stats.backspaceCount++

        if (isCorrection) {
          examProgress.value.stats.correctionCount++
        }
      }
    } else {
      // Normaler Tastendruck
      currentTypedText.value += key
      examProgress.value.stats.totalCharacters++

      if (isCorrect) {
        examProgress.value.stats.correctCharacters++
        examProgress.value.stats.currentPosition = Math.max(examProgress.value.stats.currentPosition, position + 1)
      } else {
        examProgress.value.stats.incorrectCharacters++

        // Fehler anzeigen, wenn erlaubt
        if (!currentExam.value.showErrors) {
          // Fehlerhafte Eingabe nicht anzeigen
          currentTypedText.value = currentTypedText.value.slice(0, -1)
        }
      }
    }

    // Aktuelle Position aktualisieren
    examProgress.value.currentText = currentTypedText.value

    // Statistiken aktualisieren
    examProgress.value.stats = calculateStats()

    // Text vollständig getippt?
    if (examProgress.value.stats.currentPosition >= currentExam.value.text.length) {
      finishExam()
    }

    return true
  }

  // Statistics Calculation
  function calculateStats(): TypingStats {
    if (!examProgress.value || !currentExam.value) {
      return {
        totalCharacters: 0,
        correctCharacters: 0,
        incorrectCharacters: 0,
        wordsPerMinute: 0,
        charactersPerMinute: 0,
        accuracy: 100,
        errorRate: 0,
        currentPosition: 0,
        backspaceCount: 0,
        correctionCount: 0
      }
    }

    const progress = examProgress.value
    const elapsedTime = (Date.now() - progress.startTime.getTime()) / 1000 / 60 // in Minuten

    const stats: TypingStats = {
      ...progress.stats,
      wordsPerMinute: elapsedTime > 0 ? Math.round((progress.stats.correctCharacters / 5) / elapsedTime) : 0,
      charactersPerMinute: elapsedTime > 0 ? Math.round(progress.stats.correctCharacters / elapsedTime) : 0,
      accuracy: progress.stats.totalCharacters > 0 ?
        Math.round((progress.stats.correctCharacters / progress.stats.totalCharacters) * 100) : 100,
      errorRate: progress.stats.totalCharacters > 0 ?
        Math.round((progress.stats.incorrectCharacters / progress.stats.totalCharacters) * 100) : 0
    }

    return stats
  }

  // Practice Mode
  function startPracticeMode(config: {
    text?: string
    duration?: number
    allowCorrection?: boolean
    showErrors?: boolean
  }) {
    console.log('[ExamenStore] 🏃‍♂️ Starte Übungsmodus')

    examState.value.isPracticeMode = true
    examState.value.isExamStarted = true

    // Standard-Konfiguration für Übungsmodus
    currentExam.value = {
      id: 'practice-' + Date.now(),
      title: 'Übungsmodus',
      text: config.text || 'Dies ist ein Übungstext zum Tippen lernen. Versuchen Sie, so schnell und genau wie möglich zu tippen.',
      duration: config.duration || 10,
      allowCorrection: config.allowCorrection ?? true,
      showErrors: config.showErrors ?? true,
      difficulty: 'medium',
      language: 'de'
    }

    // Progress für Übungsmodus
    examProgress.value = {
      examId: currentExam.value.id,
      studentId: userStore.user?.id || 'practice-user',
      startTime: new Date(),
      lastActivity: new Date(),
      currentText: '',
      referenceText: currentExam.value.text,
      isCompleted: false,
      stats: {
        totalCharacters: 0,
        correctCharacters: 0,
        incorrectCharacters: 0,
        wordsPerMinute: 0,
        charactersPerMinute: 0,
        accuracy: 100,
        errorRate: 0,
        currentPosition: 0,
        backspaceCount: 0,
        correctionCount: 0
      },
      keystrokes: []
    }

    timeRemaining.value = currentExam.value.duration * 60
    currentTypedText.value = ''

    startExamTimer()

    console.log('[ExamenStore] ✅ Übungsmodus gestartet')
  }

  // Server Communication
  function sendToServer(event: string, data: any) {
    if (!userStore.connectionState.socket || examState.value.isPracticeMode) {
      if (examState.value.isPracticeMode) {
        console.log('[ExamenStore] 🏃‍♂️ Übungsmodus: Keine Server-Kommunikation')
        return true
      }
      console.error('[ExamenStore] ❌ Kein Socket für Server-Kommunikation')
      return false
    }

    try {
      userStore.connectionState.socket.emit(event, {
        ...data,
        studentId: userStore.user?.id,
        timestamp: new Date().toISOString()
      })

      console.log(`[ExamenStore] 📤 Gesendet: ${event}`, data)
      return true
    } catch (error) {
      console.error(`[ExamenStore] ❌ Fehler beim Senden (${event}):`, error)
      examState.value.error = `Kommunikationsfehler: ${error}`
      return false
    }
  }

  function sendStatsToServer(eventType: string) {
    if (!examProgress.value) return

    const statsData = {
      examId: examProgress.value.examId,
      stats: examProgress.value.stats,
      progress: {
        currentPosition: examProgress.value.stats.currentPosition,
        totalLength: currentExam.value?.text.length || 0,
        percentage: progressPercentage.value
      },
      timeRemaining: timeRemaining.value,
      eventType
    }

    sendToServer('typing_exam_stats', statsData)
  }

  // Public Actions
  function startExam() {
    if (!canStartExam.value) {
      console.error('[ExamenStore] ❌ Kann Tipp-Prüfung nicht starten')
      return false
    }

    sendToServer('typing_exam_start_request', {
      examId: currentExam.value?.id
    })

    return true
  }

  function finishExam() {
    if (!examProgress.value) return false

    examProgress.value.isCompleted = true
    examProgress.value.lastActivity = new Date()

    // Finale Statistiken berechnen
    examProgress.value.stats = calculateStats()

    if (examState.value.isPracticeMode) {
      console.log('[ExamenStore] 🏁 Übungsmodus beendet')
      console.log('Finale Statistiken:', examProgress.value.stats)
    } else {
      sendStatsToServer('typing_exam_finish_request')
    }

    stopTimers()
    examState.value.isExamStarted = false

    return true
  }

  function reset() {
    console.log('[ExamenStore] 🔄 Reset Tipp-ExamenStore')

    stopTimers()

    currentExam.value = null
    examProgress.value = null
    currentTypedText.value = ''
    timeRemaining.value = 0
    lastKeystroke = null

    examState.value = {
      isInitialized: false,
      isExamActive: false,
      isExamStarted: false,
      isPracticeMode: false,
      isLoading: false,
      error: null
    }
  }

  function exitPracticeMode() {
    if (examState.value.isPracticeMode) {
      console.log('[ExamenStore] 🚪 Beende Übungsmodus')
      stopTimers()
      examState.value.isPracticeMode = false
      examState.value.isExamStarted = false
      currentExam.value = null
      examProgress.value = null
      currentTypedText.value = ''
    }
  }

  // Watch for user login
  watch(
    () => userStore.isLoggedIn,
    (isLoggedIn) => {
      if (isLoggedIn && userStore.connectionState.isConnected) {
        console.log('[ExamenStore] 👤 User eingeloggt - initialisiere Tipp-ExamenStore')
        init()
      } else {
        console.log('[ExamenStore] 👤 User ausgeloggt - reset Tipp-ExamenStore')
        reset()
      }
    },
    { immediate: true }
  )

  // Cleanup on disconnect
  watch(
    () => userStore.connectionState.isConnected,
    (isConnected) => {
      if (!isConnected && !examState.value.isPracticeMode) {
        console.log('[ExamenStore] 🔌 Verbindung getrennt - stoppe Timer')
        stopTimers()
      }
    }
  )

  return {
    // State
    examState: computed(() => examState.value),
    currentExam: computed(() => currentExam.value),
    examProgress: computed(() => examProgress.value),
    currentTypedText: computed(() => currentTypedText.value),
    timeRemaining: computed(() => timeRemaining.value),
    formattedTime,

    // Computed
    currentStats,
    progressPercentage,
    isTextCompleted,
    canStartExam,

    // Actions
    init,
    reset,
    startExam,
    finishExam,
    handleKeyInput,
    startPracticeMode,
    exitPracticeMode,
    sendToServer
  }
})
