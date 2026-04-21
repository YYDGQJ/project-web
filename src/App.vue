<template>
  <el-container class="app-layout" direction="vertical">
    <AppHeader
      v-if="!isLoginPage"
      :aside-visible="asideVisible"
      :user-info="currentUserInfo"
      @toggle-aside="toggleAside"
      @logout="logout"
    />

    <el-container class="app-body">
      <el-aside v-if="!isLoginPage" :style="asideStyle" class="app-aside">
        <SideMenu v-if="asideVisible" />
      </el-aside>

      <div v-if="asideVisible && !isLoginPage" class="drag-handle" @mousedown="startDrag"></div>

      <el-container class="app-content">
        <el-main class="app-main">
          <div v-if="!isLoginPage && openedPages.length" class="opened-tabs-wrap">
            <el-tabs
              :model-value="route.path"
              type="card"
              closable
              class="opened-tabs"
              @tab-click="onTabClick"
              @tab-remove="removeTab"
            >
              <el-tab-pane
                v-for="item in openedPages"
                :key="item.path"
                :label="item.label"
                :name="item.path"
                :closable="item.path !== HOME_PATH"
              />
            </el-tabs>
          </div>
          <div class="main-content">
            <router-view />
          </div>
        </el-main>
      </el-container>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
// 组件说明：App 组件，负责当前页面的结构与交互。
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TabsPaneContext } from 'element-plus'
import AppHeader from './components/AppHeader.vue'
import SideMenu from './components/SideMenu.vue'
import { visibleMenuRouteTemplates } from './views/security/manuSettings/menuRoutes'

interface OpenedPageItem {
  path: string
  label: string
}

interface UserInfo {
  id?: number
  userId?: string
  userName?: string
  userPhone?: string
  dept?: string
  position?: string
  status?: number | string
  role?: string
}

const OPENED_PAGES_KEY = 'openedPages'
const USER_INFO_KEY = 'currentUserInfo'
const HOME_PATH = '/home'

const route = useRoute()
const router = useRouter()
const asideWidth = ref(240)
const asideVisible = ref(true)
const lastWidth = ref(240)
const dragging = ref(false)
const openedPages = ref<OpenedPageItem[]>([])
const currentUserInfo = ref<UserInfo | null>(null)

const isLoginPage = computed(() => route.path === '/login')

const normalizePath = (path: string) => {
  return path === '/' ? '/home' : path
}

const routeLabelMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {
    '/home': '首页'
  }
  visibleMenuRouteTemplates.forEach((item) => {
    map[item.path] = item.label
  })
  return map
})

const getRouteLabel = (path: string) => {
  const normalizedPath = normalizePath(path)
  return routeLabelMap.value[normalizedPath] || normalizedPath
}

const saveOpenedPages = () => {
  localStorage.setItem(OPENED_PAGES_KEY, JSON.stringify(openedPages.value))
}

const normalizeUserInfo = (raw: unknown): UserInfo | null => {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = raw as Record<string, unknown>
  const normalized: UserInfo = {
    id: source.id as number | undefined,
    userId: (source.userId ?? source.user_id ?? source.userid) as string | undefined,
    userName: (source.userName ?? source.user_name ?? source.username) as string | undefined,
    userPhone: (source.userPhone ?? source.user_phone ?? source.phone) as string | undefined,
    dept: (source.dept ?? source.department) as string | undefined,
    position: (source.position ?? source.post) as string | undefined,
    status: source.status as number | string | undefined,
    role: (source.role ?? source.roleName ?? source.role_name) as string | undefined
  }

  if (
    normalized.id === undefined &&
    !normalized.userId &&
    !normalized.userName &&
    !normalized.userPhone &&
    !normalized.dept &&
    !normalized.position &&
    normalized.status === undefined &&
    !normalized.role
  ) {
    return null
  }

  return normalized
}

const loadCurrentUserInfo = () => {
  try {
    const stored = localStorage.getItem(USER_INFO_KEY)
    if (!stored) {
      currentUserInfo.value = null
      return
    }
    currentUserInfo.value = normalizeUserInfo(JSON.parse(stored))
  } catch (error) {
    currentUserInfo.value = null
  }
}

const loadOpenedPages = () => {
  try {
    const stored = localStorage.getItem(OPENED_PAGES_KEY)
    if (!stored) {
      openedPages.value = []
      return
    }
    const parsed = JSON.parse(stored) as OpenedPageItem[]
    openedPages.value = Array.isArray(parsed)
      ? parsed.map((item) => ({
          ...item,
          path: normalizePath(item.path),
          label: getRouteLabel(item.path)
        }))
      : []
  } catch (error) {
    openedPages.value = []
  }
}

const updateOpenedPages = (path: string) => {
  const normalizedPath = normalizePath(path)

  if (!normalizedPath || normalizedPath === '/login') {
    return
  }

  const exists = openedPages.value.some((item) => item.path === normalizedPath)
  if (!exists) {
    openedPages.value.push({
      path: normalizedPath,
      label: getRouteLabel(normalizedPath)
    })
  } else {
    openedPages.value = openedPages.value.map((item) =>
      item.path === normalizedPath
        ? {
            ...item,
            label: getRouteLabel(normalizedPath)
          }
        : item
    )
  }

  saveOpenedPages()
}

const goToOpenedPage = (path: string) => {
  const normalizedPath = normalizePath(path)
  const currentPath = normalizePath(route.path)

  if (normalizedPath !== currentPath) {
    router.push(normalizedPath)
  }
}

const onTabClick = (tab: TabsPaneContext) => {
  const targetPath = String(tab.paneName || '')
  if (targetPath) {
    goToOpenedPage(targetPath)
  }
}

const removeTab = (name: string | number) => {
  const targetPath = String(name)
  if (targetPath === HOME_PATH) {
    return
  }
  const index = openedPages.value.findIndex((item) => item.path === targetPath)

  if (index === -1) {
    return
  }

  openedPages.value.splice(index, 1)
  saveOpenedPages()

  if (route.path !== targetPath) {
    return
  }

  const fallback = openedPages.value[index] || openedPages.value[index - 1]
  if (fallback) {
    router.push(fallback.path)
    return
  }

  router.push(HOME_PATH)
}

const resetIdleTimer = () => {
  if (localStorage.getItem('loggedIn') === 'true') {
    localStorage.setItem('lastActive', Date.now().toString())
  }
}

const checkIdle = () => {
  if (localStorage.getItem('loggedIn') !== 'true') {
    return
  }

  const last = Number(localStorage.getItem('lastActive')) || Date.now()
  const timeout = 30 * 60 * 1000

  if (Date.now() - last >= timeout) {
    logout()
  }
}

const asideStyle = computed(() => ({
  width: asideVisible.value && !isLoginPage.value ? `${asideWidth.value}px` : '0px',
  minWidth: asideVisible.value && !isLoginPage.value ? `${asideWidth.value}px` : '0px',
  overflow: asideVisible.value && !isLoginPage.value ? 'auto' : 'hidden',
  transition: 'width 0.2s ease'
}))

const toggleAside = () => {
  if (asideVisible.value) {
    lastWidth.value = asideWidth.value
    asideVisible.value = false
  } else {
    asideVisible.value = true
    asideWidth.value = lastWidth.value || 240
  }
}

const startDrag = (event: MouseEvent) => {
  dragging.value = true
  event.preventDefault()
}

const onMouseMove = (event: MouseEvent) => {
  if (!dragging.value || !asideVisible.value || isLoginPage.value) return
  const newWidth = Math.min(Math.max(event.clientX, 180), 420)
  asideWidth.value = newWidth
}

const onMouseUp = () => {
  dragging.value = false
}

const logout = () => {
  localStorage.setItem('loggedIn', 'false')
  localStorage.removeItem('lastActive')
  localStorage.removeItem(OPENED_PAGES_KEY)
  localStorage.removeItem(USER_INFO_KEY)
  openedPages.value = []
  currentUserInfo.value = null
  router.push('/login')
}

let intervalId = 0

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('click', resetIdleTimer)
  window.addEventListener('keydown', resetIdleTimer)
  window.addEventListener('scroll', resetIdleTimer)

  resetIdleTimer()
  intervalId = window.setInterval(checkIdle, 60 * 1000)

  loadOpenedPages()
  loadCurrentUserInfo()
  updateOpenedPages(route.path)
})

watch(
  () => route.path,
  (newPath) => {
    loadCurrentUserInfo()
    updateOpenedPages(newPath)
  }
)

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('click', resetIdleTimer)
  window.removeEventListener('keydown', resetIdleTimer)
  window.removeEventListener('scroll', resetIdleTimer)
  window.clearInterval(intervalId)
})
</script>

<style scoped>
.app-layout {
  height: 100vh;
}
.app-body {
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;
}
.app-aside {
  background: #1f2d3d;
  padding-top: 20px;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
.app-content {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 100%;
}
.app-main {
  padding: 10px 1px 1px;
  background: #f5f7fb;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}
.opened-tabs-wrap {
  margin: 0;
  padding: 0;
  background: transparent;
  border-radius: 0;
  flex-shrink: 0;
}
.main-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
:v-deep(.opened-tabs .el-tabs__header) {
  margin-bottom: 0;
  border-bottom: none;
}
:v-deep(.opened-tabs .el-tabs__nav-wrap) {
  padding: 0;
}
:v-deep(.opened-tabs .el-tabs__nav-wrap::after) {
  display: none;
}
:v-deep(.opened-tabs.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  border: none;
}
:v-deep(.opened-tabs .el-tabs__item) {
  height: 26px;
  line-height: 26px;
  font-size: 12px;
  color: #8c95a3;
  border-radius: 16px 16px 0 0;
  margin-right: 8px;
  padding: 0 12px;
}
:v-deep(.opened-tabs.el-tabs--card > .el-tabs__header .el-tabs__item) {
  border: none;
  background: #f8f9fc;
}
:v-deep(.opened-tabs.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  color: #5b6b85;
  background: #eaf3ff;
  border: none;
}
:v-deep(.opened-tabs .el-tabs__item .is-icon-close) {
  color: #a8b0bd;
}
.drag-handle {
  width: 8px;
  cursor: col-resize;
  background: rgba(255, 255, 255, 0.08);
  transition: background-color 0.2s ease;
  height: 100%;
}
.drag-handle:hover {
  background: rgba(255, 255, 255, 0.14);
}
</style>
