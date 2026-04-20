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
    <SideMenuNode :nodes="menuTree" />
  </el-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SideMenuNode from './SideMenuNode.vue'
import {
  menuRouteTemplates,
  MenuRouteItem
} from '../views/security/manuSettings/menuRoutes'

const currentRoute = useRoute()

const buildEnabledMenuTree = (
  items: MenuRouteItem[],
  parentEnabled = true
): MenuRouteItem[] => {
  return items.reduce<MenuRouteItem[]>((acc, item) => {
    const currentEnabled = parentEnabled && item.enabled
    if (!currentEnabled) {
      return acc
    }

    const nextChildren = item.children
      ? buildEnabledMenuTree(item.children, currentEnabled)
      : undefined

    acc.push({
      ...item,
      children: nextChildren && nextChildren.length ? nextChildren : undefined
    })

    return acc
  }, [])
}

const menuTree = computed(() => {
  return buildEnabledMenuTree(menuRouteTemplates)
})
</script>

<style scoped>
.side-menu {
  width: 100%;
  height: 100%;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.45) transparent;
}

.side-menu::-webkit-scrollbar {
  width: 8px;
}

.side-menu::-webkit-scrollbar-track {
  background: transparent;
}

.side-menu::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.45);
}

.side-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.65);
}
</style>
