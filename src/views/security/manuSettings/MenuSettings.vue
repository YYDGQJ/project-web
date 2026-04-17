<template>
  <div class="security-page">
    <el-card shadow="hover" class="security-card">
      <div class="security-header">
        <h2>安全配置</h2>
        <p>可以在此调整目录与菜单顺序，保存后会记录到本地并刷新页面。</p>
      </div>

      <el-table
        :data="tableRows"
        style="width: 100%; margin-bottom: 20px;"
        stripe
      >
        
        <el-table-column label="菜单名称" width="220">
          <template #default="{ row }">
            <span :style="{ paddingLeft: row._depth === 2 ? '24px' : '0' }">
              {{ row.label }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="路由路径" width="240" />
        <el-table-column prop="category" label="分类" width="140" />
        <el-table-column
          prop="enabled"
          label="启用"
          width="100"
          :formatter="formatEnabled"
        />
        <el-table-column label="顺序" width="160">
          <template #default="{ row }">
            <span style="margin-right: 8px; width: 24px; display: inline-block; text-align: center;">
              {{ row.order ?? '-' }}
            </span>
            <el-button
              type="text"
              icon="el-icon-arrow-up"
              :disabled="!canMoveUp(row)"
              @click="moveUp(row)"
            />
            <el-button
              type="text"
              icon="el-icon-arrow-down"
              :disabled="!canMoveDown(row)"
              @click="moveDown(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" />
      </el-table>


    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  menuRouteTemplates,
  MenuRouteItem
} from './menuRoutes'

interface MenuRouteRow extends MenuRouteItem {
  _depth: number
  _parentIndex: number
  _childIndex?: number
}

const menuRoutes = ref<MenuRouteItem[]>(JSON.parse(JSON.stringify(menuRouteTemplates)))

const tableRows = computed<MenuRouteRow[]>(() => {
  return menuRoutes.value.flatMap((item, parentIndex) => {
    const parentRow: MenuRouteRow = {
      ...item,
      _depth: 1,
      _parentIndex: parentIndex
    }

    const childrenRows: MenuRouteRow[] = item.children
      ? item.children.map((child, childIndex) => ({
          ...child,
          _depth: 2,
          _parentIndex: parentIndex,
          _childIndex: childIndex
        }))
      : []

    return [parentRow, ...childrenRows]
  })
})

const swapArrayItems = <T>(array: T[], indexA: number, indexB: number) => {
  const temp = array[indexA]
  array[indexA] = array[indexB]
  array[indexB] = temp
}

const normalizeOrder = (routes: MenuRouteItem[]) => {
  routes.forEach((item, index) => {
    item.order = index + 1
    if (item.children) {
      item.children.forEach((child, childIndex) => {
        child.order = childIndex + 1
      })
    }
  })
}

const canMoveUp = (row: MenuRouteRow) => {
  return row._depth === 1 ? row._parentIndex > 0 : (row._childIndex ?? 0) > 0
}

const canMoveDown = (row: MenuRouteRow) => {
  if (row._depth === 1) {
    return row._parentIndex < menuRoutes.value.length - 1
  }
  const children = menuRoutes.value[row._parentIndex].children || []
  return (row._childIndex ?? 0) < children.length - 1
}

const moveUp = (row: MenuRouteRow) => {
  if (row._depth === 1) {
    swapArrayItems(menuRoutes.value, row._parentIndex, row._parentIndex - 1)
    normalizeOrder(menuRoutes.value)
    return
  }

  const children = menuRoutes.value[row._parentIndex].children
  if (children && row._childIndex !== undefined && row._childIndex > 0) {
    swapArrayItems(children, row._childIndex, row._childIndex - 1)
    normalizeOrder(menuRoutes.value)
  }
}

const moveDown = (row: MenuRouteRow) => {
  if (row._depth === 1) {
    swapArrayItems(menuRoutes.value, row._parentIndex, row._parentIndex + 1)
    normalizeOrder(menuRoutes.value)
    return
  }

  const children = menuRoutes.value[row._parentIndex].children
  if (children && row._childIndex !== undefined && row._childIndex < children.length - 1) {
    swapArrayItems(children, row._childIndex, row._childIndex + 1)
    normalizeOrder(menuRoutes.value)
  }
}

const formatEnabled = (row: MenuRouteItem) => {
  return row.enabled ? '是' : '否'
}


</script>

<style scoped>
.security-card {
  width: 100%;
}
.security-header {
  margin-bottom: 20px;
}
</style>
