import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import { initializeMenuRouteTemplates } from './views/security/manuSettings/menuRoutes'

const bootstrap = async () => {
  await initializeMenuRouteTemplates()

  const [{ default: App }, { default: router }] = await Promise.all([
    import('./App.vue'),
    import('./router')
  ])

  createApp(App)
    .use(ElementPlus)
    .use(router)
    .mount('#app')
}

bootstrap()
