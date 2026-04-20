<template>
  <div class="security-page">
    <el-card shadow="hover" class="security-card">
      <div class="security-header">
        <h2>平铺行拖拽测试</h2>
      </div>

      <div class="table-wrap">
        <CommonTable
          :data="tableData"
          :columns="tableColumns"
          row-key="id"
          :row-draggable="true"
          order-field="order"
          stripe
          name="平铺行拖拽测试"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CommonTable, { type CommonTableColumn } from '../../../../components/CommonTable.vue'

type FlatRow = {
  id: number
  order: number
  code: string
  name: string
  status: string
  owner: string
}

const tableData = ref<FlatRow[]>([
  { id: 1, order: 1, code: 'SEC-001', name: '权限配置', status: '启用', owner: '张三' },
  { id: 2, order: 2, code: 'SEC-002', name: '角色映射', status: '启用', owner: '李四' },
  { id: 3, order: 3, code: 'SEC-003', name: '资源绑定', status: '停用', owner: '王五' },
  { id: 4, order: 4, code: 'SEC-004', name: '访问审计', status: '启用', owner: '赵六' }
])

const tableColumns: CommonTableColumn[] = [
  { prop: 'order', label: '顺序', width: 100 },
  { prop: 'code', label: '编码', width: 140 },
  { prop: 'name', label: '名称', width: 180 },
  { prop: 'status', label: '状态', width: 120 },
  { prop: 'owner', label: '负责人' }
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

