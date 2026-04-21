<template>
  <el-header class="app-header">
    <div class="header-left">
      <router-link to="/home" class="app-logo">DemoLogo</router-link>
      <el-button link class="menu-toggle-btn" @click="emit('toggle-aside')" :title="asideVisible ? '隐藏菜单' : '显示菜单'">
        <el-icon>
          <component :is="asideVisible ? Fold : Expand" />
        </el-icon>
      </el-button>
    </div>
    <div class="header-actions">
      <el-button link class="fullscreen-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
        <el-icon>
          <component :is="isFullscreen ? ScaleToOriginal : FullScreen" />
        </el-icon>
      </el-button>
      <span class="header-divider"></span>
      <el-popover placement="bottom-end" trigger="click" :width="360" popper-class="user-info-popper">
        <template #reference>
          <el-button link class="user-name-btn">
            {{ displayUserName }}
          </el-button>
        </template>

        <el-card shadow="never" class="user-info-card">
          <el-table :data="userInfoRows" border :show-header="false" size="small">
            <el-table-column prop="label" label="字段" width="120" class-name="label-col" />
            <el-table-column prop="value" label="内容" />
          </el-table>
          <div class="card-footer">
            <el-button class="logout-btn" @click="emit('logout')">退出</el-button>
          </div>
        </el-card>
      </el-popover>
    </div>
  </el-header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Expand, Fold, FullScreen, ScaleToOriginal } from '@element-plus/icons-vue'

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

const props = defineProps<{
  asideVisible: boolean
  userInfo?: UserInfo | null
}>()

const emit = defineEmits<{
  (event: 'toggle-aside'): void
  (event: 'logout'): void
}>()

const isFullscreen = ref(false)

const syncFullscreenState = () => {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      return
    }
    await document.exitFullscreen()
  } catch (error) {
    // Ignore fullscreen permission or browser capability errors.
  }
}

const formatStatus = (status: number | string | undefined) => {
  if (status === 1 || status === '1') {
    return '启用'
  }
  if (status === 0 || status === '0') {
    return '停用'
  }
  return '-'
}

const displayUserName = computed(() => {
  return props.userInfo?.userName || props.userInfo?.userId || '当前用户'
})

const userInfoRows = computed(() => {
  const user = props.userInfo || {}
  return [
    { label: '工号', value: user.userId || '-' },
    { label: '用户名称', value: user.userName || '-' },
    { label: '手机号', value: user.userPhone || '-' },
    { label: '部门', value: user.dept || '-' },
    { label: '岗位', value: user.position || '-' },
    { label: '状态', value: formatStatus(user.status) },
    { label: '角色', value: user.role || '-' }
  ]
})

onMounted(() => {
  syncFullscreenState()
  document.addEventListener('fullscreenchange', syncFullscreenState)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState)
})
</script>

<style scoped>
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
  gap: 12px;
  margin-left: auto;
}
.app-header .el-button {
  color: #000;
}
.menu-toggle-btn {
  color: #ffffff !important;
}
.user-name-btn {
  color: #ffffff !important;
}
.fullscreen-btn {
  color: #ffffff !important;
  height: 32px;
  min-height: 32px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-btn :v-deep(svg) {
  width: 18px;
  height: 18px;
}
.header-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.45);
}
.user-info-card {
  border: none;
  box-shadow: none;
}

:v-deep(.user-info-card .el-card__body) {
  padding: 0;
}

:v-deep(.user-info-popper) {
  padding: 0 !important;
}

.card-footer {
  margin-top: 0;
  display: flex;
  justify-content: stretch;
}

.logout-btn {
  width: 100%;
  height: 40px;
  border-radius: 0;
  border: 1px solid #f56c6c;
  color: #ffffff;
  background: #f56c6c;
}

.logout-btn:hover,
.logout-btn:focus {
  color: #ffffff;
  border-color: #f78989;
  background: #f78989;
}

:v-deep(.label-col) {
  background: #f5f7fa;
}

:v-deep(.label-col .cell) {
  color: #606266;
  font-weight: 500;
}
</style>

