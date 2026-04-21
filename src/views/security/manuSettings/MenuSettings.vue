<template>
  <div class="security-page">
    <el-card shadow="hover" class="security-card">
      <div class="table-wrap">
        <CommonTable
          :data="menuRoutes"
          :columns="tableColumns"
          row-key="path"
          :row-draggable="true"
          order-field="order"
          stripe
          name="菜单列表"
          @row-reorder="onRowReorder"
        >
          <template #enabledSlot="{ row }">
            {{ row.enabled ? '是' : '否' }}
          </template>

        </CommonTable>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 组件说明：MenuSettings 组件，负责当前页面的结构与交互。
import { ref } from 'vue'
import {
  menuRouteTemplates,
  type MenuRouteItem
} from './menuRoutes'
import CommonTable, { type CommonTableColumn } from '../../../components/table/CommonTable.vue'

const menuRoutes = ref<MenuRouteItem[]>(JSON.parse(JSON.stringify(menuRouteTemplates)))

const tableColumns: CommonTableColumn[] = [
  { prop: 'label', label: '菜单名称' },
  { prop: 'path', label: '路由路径' },
  { prop: 'category', label: '分类' },
  { prop: 'enabled', label: '启用', slotName: 'enabledSlot' },
  { prop: 'order', label: '顺序' },
  { prop: 'description', label: '描述' }
]


const onRowReorder = (data: MenuRouteItem[]) => {
  console.log('[MenuSettings] row-reorder payload:', data)
}
</script>

<style scoped>
.security-page {
  height: 100%;
}
.security-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
:v-deep(.security-card .el-card__body) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.security-header {
  margin-bottom: 20px;
}
.table-wrap {
  flex: 1;
  min-height: 0;
}
</style>
