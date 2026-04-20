<template>
  <div class="security-page">
    <el-card shadow="hover" class="security-card">
      <div class="security-header">
        <h2>树形行拖拽测试</h2>
      </div>

      <div class="table-wrap">
        <CommonTable
          :data="tableData"
          :columns="tableColumns"
          row-key="id"
          :row-draggable="true"
          order-field="order"
          stripe
            name="树形行拖拽测试"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CommonTable, { type CommonTableColumn } from '../../../../components/CommonTable.vue'

type TreeRow = {
  id: string
  order: number
  name: string
  type: string
  status: string
  children?: TreeRow[]
}

const tableData = ref<TreeRow[]>([
  {
    id: 'group-a',
    order: 1,
    name: 'A组资源',
    type: '目录',
    status: '启用',
    children: [
      { id: 'group-a-1', order: 1, name: 'A组-明细1', type: '页面', status: '启用' },
      { id: 'group-a-2', order: 2, name: 'A组-明细2', type: '页面', status: '停用' }
    ]
  },
  {
    id: 'group-b',
    order: 2,
    name: 'B组资源',
    type: '目录',
    status: '启用',
    children: [
      { id: 'group-b-1', order: 1, name: 'B组-明细1', type: '页面', status: '启用' },
      { id: 'group-b-2', order: 2, name: 'B组-明细2', type: '页面', status: '启用' }
    ]
  }
])

const tableColumns: CommonTableColumn[] = [
  { prop: 'order', label: '顺序', width: 100 },
  { prop: 'name', label: '名称', width: 220 },
  { prop: 'type', label: '类型', width: 120 },
  { prop: 'status', label: '状态' }
]
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

:deep(.security-card .el-card__body) {
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

