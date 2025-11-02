import { boot } from 'quasar/wrappers'
import { useUserStore } from 'stores/userStore'



export default boot(() => {
  // Pinia ist bereits durch das Plugin verfügbar
  // Hier können Sie den Store initialisieren
  const userStore = useUserStore()
  userStore.init()

})
