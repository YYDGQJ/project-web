<template>
  <el-container class="app-layout">
    <el-header v-if="!isLoginPage" class="app-header">
      <div class="header-left">
        <router-link to="/home" class="app-logo">DemoLogo</router-link>
        <el-button type="text" @click="toggleAside">
          {{ asideVisible ? '隐藏菜单' : '显示菜单' }}
        </el-button>
      </div>
      <div class="header-actions">
        <el-button type="text" @click="logout">
          退出
        </el-button>
      </div>
    </el-header>

    <el-container class="app-body">
      <el-aside v-if="!isLoginPage" :style="asideStyle" class="app-aside">
        <SideMenu v-if="asideVisible" />
      </el-aside>

      <div v-if="asideVisible && !isLoginPage" class="drag-handle" @mousedown="startDrag"></div>

      <el-container class="app-content">
        <el-main class="app-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SideMenu from './components/SideMenu.vue'

const route = useRoute()
const router = useRouter()
const asideWidth = ref(240)
const asideVisible = ref(true)
const lastWidth = ref(240)
const dragging = ref(false)

const isLoginPage = computed(() => route.path === '/login')

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
})

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
.app-header {
  background: #409eff;
  display: flex;
  align-items: center;
  padding: 0 24px;
  color: #fff;
  height: 60px;
  min-height: 60px;
  box-sizing: border-box;
}
.app-logo {
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  text-decoration: none;
  margin-right: 24px;
}
.app-logo:hover {
  opacity: 0.85;
}
.header-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
}
.app-header .el-button {
  color: #000;
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
  padding: 24px;
  background: #f5f7fb;
  width: 100%;
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
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
