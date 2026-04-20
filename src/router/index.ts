import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import {
  menuRouteTemplates,
  type MenuRouteItem
} from '../views/security/manuSettings/menuRoutes'

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
  MenuSettings: () => import('../views/security/manuSettings/MenuSettings.vue'),
  UserManage: () => import('../views/security/userManage/UserManage.vue'),
  RowDragFlatTest: () => import('../views/test/table/rowDragFlatTest/RowDragFlatTest.vue'),
  RowDragTreeTest: () => import('../views/test/table/rowDragTreeTest/RowDragTreeTest.vue'),
  TestPageSample: () => import('../views/test/page/sample/TestPageSample.vue')
}

const collectEnabledMenuRoutes = (
  items: MenuRouteItem[],
  parentEnabled = true
): MenuRouteItem[] => {
  return items.reduce<MenuRouteItem[]>((acc, item) => {
    const currentEnabled = parentEnabled && item.enabled
    if (!currentEnabled) {
      return acc
    }

    acc.push(item)

    if (item.children?.length) {
      acc.push(...collectEnabledMenuRoutes(item.children, currentEnabled))
    }

    return acc
  }, [])
}

const dynamicRouteItems = collectEnabledMenuRoutes(menuRouteTemplates)
const dynamicRoutes = dynamicRouteItems
  .filter((item, index, arr) => arr.findIndex((route) => route.path === item.path) === index)
  .filter((item) => componentMap[item.component])
  .map((item) => ({
    path: item.path,
    name: item.name,
    component: componentMap[item.component]
  }))

// 添加额外的路由别名以支持用户设置的路径
const aliasRoutes = [
  {
    path: '/security/userManage',
    name: 'UserManageAlias',
    component: componentMap.UserManage
  }
]

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
  ...dynamicRoutes,
  ...aliasRoutes
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
