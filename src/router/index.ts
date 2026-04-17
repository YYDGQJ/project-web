import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import { visibleMenuRouteTemplates } from '../views/security/manuSettings/menuRoutes'

const componentMap: Record<string, any> = {
  Home: () => import('../views/Home.vue'),
  Mm00View: () => import('../views/mm/mm00/Mm00View.vue'),
  MmbsView: () => import('../views/mm/mmbs/MmbsView.vue'),
  MmbwView: () => import('../views/mm/mmbw/MmbwView.vue'),
  MmhrView: () => import('../views/mm/mmhr/MmhrView.vue'),
  MmsmView: () => import('../views/mm/mmsm/MmsmView.vue'),
  PmoaView: () => import('../views/om/pmoa/PmoaView.vue'),
  PmofView: () => import('../views/om/pmof/PmofView.vue'),
  PmogView: () => import('../views/om/pmog/PmogView.vue'),
  PmolView: () => import('../views/om/pmol/PmolView.vue'),
  PmomView: () => import('../views/om/pmom/PmomView.vue'),
  PmopView: () => import('../views/om/pmop/PmopView.vue'),
  PabsView: () => import('../views/ps/pabs/PabsView.vue'),
  PsbwView: () => import('../views/ps/psbw/PsbwView.vue'),
  PshrView: () => import('../views/ps/pshr/PshrView.vue'),
  PssmView: () => import('../views/ps/pssm/PssmView.vue'),
  MenuSettings: () => import('../views/security/manuSettings/MenuSettings.vue')
}

const dynamicRoutes = visibleMenuRouteTemplates
  .filter((item) => componentMap[item.component])
  .map((item) => ({
    path: item.path,
    name: item.name,
    component: componentMap[item.component]
  }))

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/home',
    name: 'Home',
    component: componentMap.Home
  },
  ...dynamicRoutes
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const loggedIn = localStorage.getItem('loggedIn') === 'true'

  if (to.path === '/login') {
    if (loggedIn) {
      return next('/home')
    }
    return next()
  }

  if (!loggedIn) {
    return next('/login')
  }

  return next()
})

export default router
