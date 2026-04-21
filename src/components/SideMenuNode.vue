<template>
  <template v-for="item in nodes" :key="item.path">
    <el-sub-menu v-if="item.children && item.children.length" :index="item.path">
      <template #title>
        <span>{{ item.label }}</span>
      </template>

      <SideMenuNode :nodes="item.children" />
    </el-sub-menu>
    <el-menu-item v-else :index="item.path">
      {{ item.label }}
    </el-menu-item>
  </template>
</template>

<script setup lang="ts">
// 组件说明：SideMenuNode 组件，负责当前页面的结构与交互。
import type { MenuRouteItem } from '../views/security/manuSettings/menuRoutes'

defineOptions({
  name: 'SideMenuNode'
})

defineProps<{
  nodes: MenuRouteItem[]
}>()
</script>

