import { boot } from 'quasar/wrappers'
import { useUserStore } from 'stores/userStore'

export default boot(({ app }) => {
  // Pinia ist bereits durch das Plugin verfügbar
  // Hier können Sie den Store initialisieren
  const userStore = useUserStore()
  userStore.init()

  // Optional: Store global verfügbar machen
  app.config.globalProperties.$userStore = userStore
})
