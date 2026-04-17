<template>
  <el-menu
    class="side-menu"
    background-color="#1f2d3d"
    text-color="#ffffff"
    active-text-color="#ffd04b"
    :default-active="currentRoute.path"
    router
    collapse-transition
  >
    <template v-for="group in groupedRoutes" :key="group.category">
      <el-sub-menu v-if="group.category !== '默认'" :index="group.category">
        <template #title>
          <span>{{ group.category }}</span>
        </template>
        <el-menu-item
          v-for="item in group.routes"
          :key="item.path"
          :index="item.path"
        >
          {{ item.label }}
        </el-menu-item>
      </el-sub-menu>
      <template v-else>
        <el-menu-item
          v-for="item in group.routes"
          :key="item.path"
          :index="item.path"
        >
          {{ item.label }}
        </el-menu-item>
      </template>
    </template>
  </el-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  visibleMenuRouteTemplates,
  MenuRouteItem
} from '../views/security/manuSettings/menuRoutes'

const currentRoute = useRoute()

const groupedRoutes = computed(() => {
  const enabledRoutes = visibleMenuRouteTemplates
  const groups: Record<string, MenuRouteItem[]> = {}
  const categoryOrder: string[] = []

  enabledRoutes.forEach((item) => {
    const category = item.category || '默认'
    if (!groups[category]) {
      groups[category] = []
      categoryOrder.push(category)
    }
    groups[category].push(item)
  })

  return categoryOrder.map((category) => ({
    category,
    routes: groups[category]
  }))
})
</script>

<style scoped>
.side-menu {
  width: 100%;
  height: 100%;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  box-sizing: border-box;
}
</style>
