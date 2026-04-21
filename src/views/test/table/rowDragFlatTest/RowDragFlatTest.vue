<template>
  <div class="flat-test-page">
    <el-card shadow="hover" class="flat-test-card">
      <div class="flat-test-header">
        <div>
          <h2>平铺行拖拽测试</h2>
          <p>模拟排产任务编排，验证单行拖拽、多选联动拖拽和锚点行禁拖规则。</p>
        </div>

        <div class="flat-test-actions">
          <el-button @click="resetTableData">恢复初始顺序</el-button>
          <el-button type="primary" @click="sortByPriority">按优先级重排</el-button>
        </div>
      </div>

      <div class="flat-test-metrics">
        <div class="metric-card">
          <span class="metric-card__label">任务总数</span>
          <strong>{{ tableData.length }}</strong>
        </div>
        <div class="metric-card">
          <span class="metric-card__label">已选任务</span>
          <strong>{{ selectedRows.length }}</strong>
        </div>
        <div class="metric-card">
          <span class="metric-card__label">锁定任务</span>
          <strong>{{ lockedRowCount }}</strong>
        </div>
        <div class="metric-card">
          <span class="metric-card__label">总工时</span>
          <strong>{{ totalPlannedHours }} h</strong>
        </div>
      </div>

      <div class="flat-test-summary">
        <div>
          <span class="summary-label">当前顺序</span>
          <p>{{ orderPreviewText }}</p>
        </div>
        <div>
          <span class="summary-label">最近一次结果</span>
          <p>{{ reorderMessage }}</p>
        </div>
      </div>

      <div class="flat-test-table-wrap">
        <CommonTable
          :data="tableData"
          :columns="tableColumns"
          :repair-visible-columns-when-empty="true"
          :selection="{ mode: 'multiple', keyField: 'id' }"
          :is-row-anchor="isRowAnchor"
          row-key="id"
          :row-draggable="true"
          order-field="order"
          stripe
          name="平铺行拖拽测试"
          @selection-change="handleSelectionChange"
          @row-reorder="handleRowReorder"
        >
          <template #toolbar-info>
            已选 {{ selectedRows.length }} 条，拖拽时会整组移动；锁定任务不可拖拽。
          </template>

        </CommonTable>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 组件说明：RowDragFlatTest 组件，负责当前页面的结构与交互。
import { computed, ref } from 'vue'
import CommonTable, { type CommonTableColumn } from '../../../../components/table/CommonTable.vue'

type FlatRow = {
  id: string
  order: number
  taskCode: string
  taskName: string
  stage: string
  owner: string
  status: 'ready' | 'doing' | 'blocked'
  priority: 'P0' | 'P1' | 'P2'
  plannedHours: number
  locked?: boolean
}

const statusLabelMap: Record<FlatRow['status'], string> = {
  ready: '待执行',
  doing: '处理中',
  blocked: '阻塞'
}

const priorityWeightMap: Record<FlatRow['priority'], number> = {
  P0: 0,
  P1: 1,
  P2: 2
}

const createInitialFlatRows = (): FlatRow[] => [
  {
    id: 'flat-001',
    order: 1,
    taskCode: 'PLAN-001',
    taskName: '合同导入校验',
    stage: '接单',
    owner: '张三',
    status: 'ready',
    priority: 'P1',
    plannedHours: 4,
    locked: true
  },
  {
    id: 'flat-002',
    order: 2,
    taskCode: 'PLAN-002',
    taskName: '缺料提醒生成',
    stage: '排产',
    owner: '李四',
    status: 'doing',
    priority: 'P0',
    plannedHours: 6
  },
  {
    id: 'flat-003',
    order: 3,
    taskCode: 'PLAN-003',
    taskName: '轧制计划拆分',
    stage: '排产',
    owner: '王五',
    status: 'ready',
    priority: 'P0',
    plannedHours: 5
  },
  {
    id: 'flat-004',
    order: 4,
    taskCode: 'PLAN-004',
    taskName: '产线能力平衡',
    stage: '平衡',
    owner: '赵六',
    status: 'blocked',
    priority: 'P1',
    plannedHours: 8
  },
  {
    id: 'flat-005',
    order: 5,
    taskCode: 'PLAN-005',
    taskName: '夜班指令下发',
    stage: '执行',
    owner: '钱七',
    status: 'ready',
    priority: 'P2',
    plannedHours: 3
  },
  {
    id: 'flat-006',
    order: 6,
    taskCode: 'PLAN-006',
    taskName: '完工反馈回传',
    stage: '执行',
    owner: '孙八',
    status: 'doing',
    priority: 'P1',
    plannedHours: 2
  }
]

const cloneRows = (rows: FlatRow[]): FlatRow[] => rows.map((row) => ({ ...row }))

const tableData = ref<FlatRow[]>(createInitialFlatRows())
const selectedRows = ref<FlatRow[]>([])
const reorderMessage = ref('拖拽后会在这里显示最新顺序结果。')

const tableColumns: CommonTableColumn[] = [
  { prop: 'order', label: '顺序', width: 90 },
  { prop: 'taskCode', label: '任务编码', width: 120 },
  { prop: 'taskName', label: '任务名称', width: 220 },
  { prop: 'stage', label: '阶段', width: 120 },
  { prop: 'priority', label: '优先级', width: 100 },
  {
    prop: 'status',
    label: '状态',
    width: 120,
    formatter: (row) => statusLabelMap[row.status as FlatRow['status']] ?? '-'
  },
  { prop: 'plannedHours', label: '预计工时', width: 120 },
  { prop: 'owner', label: '负责人', width: 120 },
  {
    prop: 'locked',
    label: '拖拽限制',
    width: 120,
    formatter: (row) => (row.locked ? '锁定' : '可拖拽')
  }
]

const lockedRowCount = computed(() => tableData.value.filter((row) => row.locked).length)
const totalPlannedHours = computed(() => tableData.value.reduce((sum, row) => sum + row.plannedHours, 0))
const orderPreviewText = computed(() =>
  tableData.value
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((row) => `${row.order}.${row.taskCode}`)
    .join('  /  ')
)

const isRowAnchor = (row: FlatRow) => Boolean(row.locked)

const handleSelectionChange = (payload: { rows: FlatRow[] }) => {
  selectedRows.value = payload.rows
}

const handleRowReorder = (rows: FlatRow[]) => {
  tableData.value = cloneRows(rows)
  reorderMessage.value = `最新前四项：${tableData.value
    .slice()
    .sort((left, right) => left.order - right.order)
    .slice(0, 4)
    .map((row) => row.taskCode)
    .join(' -> ')}`
}

const resetTableData = () => {
  tableData.value = createInitialFlatRows()
  selectedRows.value = []
  reorderMessage.value = '已恢复到初始顺序。'
}

const sortByPriority = () => {
  tableData.value = cloneRows(
    tableData.value
      .slice()
      .sort((left, right) => {
        const priorityDiff = priorityWeightMap[left.priority] - priorityWeightMap[right.priority]
        if (priorityDiff !== 0) {
          return priorityDiff
        }
        return left.order - right.order
      })
      .map((row, index) => ({
        ...row,
        order: index + 1
      }))
  )
  reorderMessage.value = '已按优先级重排，便于继续验证多选联动拖拽。'
}
</script>

<style scoped>
.flat-test-page {
  height: 100%;
}

.flat-test-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.flat-test-card .el-card__body) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.flat-test-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.flat-test-header h2 {
  margin: 0;
  font-size: 20px;
}

.flat-test-header p {
  margin: 8px 0 0;
  color: #667085;
  font-size: 13px;
}

.flat-test-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.flat-test-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  border: 1px solid #dbe4ff;
}

.metric-card__label {
  display: block;
  margin-bottom: 8px;
  color: #64748b;
  font-size: 12px;
}

.metric-card strong {
  color: #0f172a;
  font-size: 24px;
}

.flat-test-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.flat-test-summary > div {
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.summary-label {
  display: inline-block;
  margin-bottom: 6px;
  color: #475569;
  font-size: 12px;
}

.flat-test-summary p {
  margin: 0;
  color: #0f172a;
  line-height: 1.6;
}

.flat-test-table-wrap {
  flex: 1;
  min-height: 0;
}

@media (max-width: 960px) {
  .flat-test-header,
  .flat-test-summary {
    grid-template-columns: 1fr;
    display: grid;
  }

  .flat-test-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .flat-test-metrics,
  .flat-test-summary {
    grid-template-columns: 1fr;
  }
}
</style>

