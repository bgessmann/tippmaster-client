import { boot } from 'quasar/wrappers'
import { useUserStore } from 'stores/userStore'

export default boot(() => {
  const userStore = useUserStore()
  userStore.init()
})
