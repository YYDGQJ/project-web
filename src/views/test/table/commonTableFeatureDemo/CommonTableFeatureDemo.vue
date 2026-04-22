<template>
  <div class="feature-demo-page">
    <el-card shadow="hover" class="feature-demo-card">
      <div class="feature-demo-header">
        <div>
          <h2>通用表格能力测试</h2>
          <p>覆盖多选、编辑、新增、删除、工具栏扩展和外部配置覆盖。</p>
        </div>
        <div class="feature-demo-actions">
          <el-button type="primary" :disabled="locked" @click="operationMode = 'edit'">编辑</el-button>
          <el-button :disabled="locked" @click="operationMode = 'create'">新增</el-button>
          <el-button type="danger" :disabled="locked || !selectedRows.length" @click="operationMode = 'delete'">删除</el-button>
          <el-button v-if="locked" type="success" @click="confirmChanges">确认</el-button>
          <el-button v-if="locked" @click="cancelChanges">取消</el-button>
        </div>
      </div>

      <div class="feature-demo-table-wrap">
        <CommonTable
          ref="tableRef"
          :data="tableData"
          :columns="tableColumns"
          :operation-mode="operationMode"
          :selection="{ mode: 'multiple', keyField: 'id' }"
          :editing="{ enabled: true, allowCreate: true, allowDelete: true }"
          :toolbar-config="{ showExpandCollapse: false, showColumnManager: true, showExport: false }"
          :pagination-config="{ showTotal: true }"
          :vtable-overrides="vtableOverrides"
          row-key="id"
          row-draggable
          order-field="order"
          name="通用表格能力测试"
          stripe
          @selection-change="handleSelectionChange"
          @edit-cell-change="handleEditCellChange"
          @add-cell-change="handleAddCellChange"
          @edit-submit="handleEditSubmit"
          @create-submit="handleCreateSubmit"
          @delete-submit="handleDeleteSubmit"
        >
          <template #toolbar-info>
            <div class="feature-demo-summary">
              已选 {{ selectedRows.length }} 条，预算合计 {{ selectedBudget }}
            </div>
          </template>

        </CommonTable>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 组件说明：CommonTableFeatureDemo 组件，负责当前页面的结构与交互。
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import CommonTable, { type CommonTableColumn } from '../../../../components/table/CommonTable.vue'

type DemoRow = {
  id: string
  order: number
  projectCode: string
  projectName: string
  status: string
  owner: string
  planDate: string
  budget: number
  level: string
}

const tableRef = ref<{
  confirmPendingChanges: () => Promise<boolean> | boolean
  cancelPendingChanges: () => boolean
} | null>(null)

const operationMode = ref<'idle' | 'edit' | 'create' | 'delete'>('idle')
const selectedRows = ref<DemoRow[]>([])
const tableData = ref<DemoRow[]>([
  {
    id: 'project-001',
    order: 1,
    projectCode: 'PRJ-001',
    projectName: '热轧合同整理',
    status: 'draft',
    owner: '张三',
    planDate: '2026-04-20 10:00:00',
    budget: 120,
    level: 'A'
  },
  {
    id: 'project-002',
    order: 2,
    projectCode: 'PRJ-002',
    projectName: '订单交付跟踪',
    status: 'active',
    owner: '李四',
    planDate: '2026-04-21 15:30:00',
    budget: 200,
    level: 'B'
  },
  {
    id: 'project-003',
    order: 3,
    projectCode: 'PRJ-003',
    projectName: '库存协同校验',
    status: 'cancelled',
    owner: '王五',
    planDate: '2026-04-22 09:15:00',
    budget: 80,
    level: 'C'
  }
])

const tableColumns: CommonTableColumn[] = [
  { prop: 'order', label: '顺序', width: 80, editable: true, editorType: 'number', required: true },
  { prop: 'projectCode', label: '项目编码', width: 120, editable: true, editorType: 'input', required: '项目编码不能为空' },
  { prop: 'projectName', label: '项目名称', width: 180, editable: true, editorType: 'input', required: '项目名称不能为空' },
  {
    prop: 'status',
    label: '状态',
    width: 120,
    editable: true,
    editorType: 'select',
    editorOptions: [
      { label: '草稿', value: 'draft' },
      { label: '生效', value: 'active' },
      { label: '作废', value: 'cancelled' }
    ]
  },
  { prop: 'owner', label: '负责人', width: 120, editable: true, editorType: 'input' },
  { prop: 'planDate', label: '计划日期', width: 180, editable: true, editorType: 'datetime' },
  { prop: 'budget', label: '预算', width: 120, editable: true, editorType: 'number', required: '预算不能为空' },
  {
    prop: 'level',
    label: '等级',
    editable: true,
    editorType: 'select',
    editorOptions: [
      { label: 'A级', value: 'A' },
      { label: 'B级', value: 'B' },
      { label: 'C级', value: 'C' }
    ]
  }
]

const vtableOverrides = {
  defaultRowHeight: 26,
  theme: {
    headerStyle: {
      bgColor: '#eef4ff'
    },
    bodyStyle: {
      color: '#1f2937'
    }
  }
}

const locked = computed(() => operationMode.value !== 'idle')
const selectedBudget = computed(() => selectedRows.value.reduce((sum, row) => sum + Number(row.budget ?? 0), 0).toFixed(2))

const handleSelectionChange = (payload: { rows: DemoRow[] }) => {
  selectedRows.value = payload.rows
}

const handleEditCellChange = (payload: { editRows: DemoRow[] }) => {
  console.log('edit-cell-change', payload)
}

const handleAddCellChange = (payload: { addRows: DemoRow[] }) => {
  console.log('add-cell-change', payload)
}

const handleEditSubmit = (payload: { rows: DemoRow[] }) => {
  const patchMap = new Map(payload.rows.map((row) => [row.id, { ...row }]))
  tableData.value = tableData.value.map((row) => patchMap.get(row.id) ?? row)
  ElMessage.success(`测试页已提交 ${payload.rows.length} 条编辑数据`)
}

const handleCreateSubmit = (payload: { rows: DemoRow[] }) => {
  tableData.value = [...tableData.value, ...payload.rows.map((row, index) => ({
    ...row,
    id: row.id || `created-${Date.now()}-${index}`
  }))]
  ElMessage.success(`测试页已新增 ${payload.rows.length} 条数据`)
}

const handleDeleteSubmit = (payload: { keys: Array<string | number | undefined> }) => {
  const keySet = new Set(payload.keys.map((key) => String(key ?? '')))
  tableData.value = tableData.value.filter((row) => !keySet.has(row.id))
  selectedRows.value = []
  ElMessage.success(`测试页已删除 ${payload.keys.length} 条数据`)
}

const confirmChanges = async () => {
  const success = await tableRef.value?.confirmPendingChanges?.()
  if (success) {
    operationMode.value = 'idle'
  }
}

const cancelChanges = () => {
  tableRef.value?.cancelPendingChanges?.()
  operationMode.value = 'idle'
}
</script>

<style scoped>
.feature-demo-page {
  height: 100%;
}

.feature-demo-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

:v-deep(.feature-demo-card .el-card__body) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-demo-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.feature-demo-header h2 {
  margin: 0;
  font-size: 20px;
}

.feature-demo-header p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.feature-demo-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.feature-demo-table-wrap {
  flex: 1;
  min-height: 0;
}

.feature-demo-summary {
  font-size: 12px;
  color: #475569;
}
</style>