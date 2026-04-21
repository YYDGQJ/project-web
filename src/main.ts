import { createApp } from 'vue'
import './style.css'
import { initializeMenuRouteTemplates } from './views/security/manuSettings/menuRoutes'

// 启动流程：先初始化菜单模板，再并行加载 App 与路由，避免首屏路由缺失。
const bootstrap = async () => {
  await initializeMenuRouteTemplates()

  const [{ default: App }, { default: router }] = await Promise.all([
    import('./App.vue'),
    import('./router')
  ])

  createApp(App)
    .use(router)
    .mount('#app')
}

bootstrap()
