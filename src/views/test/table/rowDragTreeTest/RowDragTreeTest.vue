<template>
  <div class="tree-test-page">
    <el-card shadow="hover" class="tree-test-card">
      <div class="tree-test-header">
        <div>
          <h2>树形行拖拽测试</h2>
          <p>模拟资源分组维护，验证同父级拖拽、父节点重排和锁定节点禁拖规则。</p>
        </div>

        <div class="tree-test-actions">
          <el-button @click="resetTreeData">恢复树结构</el-button>
          <el-button type="primary" @click="sortLeavesByProgress">按进度整理子节点</el-button>
        </div>
      </div>

      <div class="tree-test-panels">
        <div class="overview-panel">
          <span class="panel-label">结构概览</span>
          <p>父节点 {{ parentNodeCount }} 个，叶子节点 {{ leafNodeCount }} 个，锁定节点 {{ lockedNodeCount }} 个。</p>
        </div>
        <div class="overview-panel">
          <span class="panel-label">最近一次结果</span>
          <p>{{ reorderMessage }}</p>
        </div>
      </div>

      <div class="tree-test-selection">
        <span class="panel-label">当前选中</span>
        <p>{{ selectedSummaryText }}</p>
      </div>

      <div class="tree-test-table-wrap">
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
          name="树形行拖拽测试"
          @selection-change="handleSelectionChange"
          @row-reorder="handleRowReorder"
        >
          <template #toolbar-info>
            已选 {{ selectedRows.length }} 条，只允许同父级一起拖动；锁定节点不可拖拽。
          </template>

        </CommonTable>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 组件说明：RowDragTreeTest 组件，负责当前页面的结构与交互。
import { computed, ref } from 'vue'
import CommonTable, { type CommonTableColumn } from '../../../../components/table/CommonTable.vue'

type TreeRow = {
  id: string
  order: number
  name: string
  type: '分组' | '页面' | '动作'
  owner: string
  status: 'ready' | 'active' | 'paused'
  progress: number
  locked?: boolean
  children?: TreeRow[]
}

const statusLabelMap: Record<TreeRow['status'], string> = {
  ready: '待配置',
  active: '已启用',
  paused: '暂停'
}

const createInitialTreeRows = (): TreeRow[] => [
  {
    id: 'tree-001',
    order: 1,
    name: '订单履约配置',
    type: '分组',
    owner: '张三',
    status: 'active',
    progress: 100,
    children: [
      {
        id: 'tree-001-01',
        order: 1,
        name: '接单校验页面',
        type: '页面',
        owner: '李四',
        status: 'active',
        progress: 92
      },
      {
        id: 'tree-001-02',
        order: 2,
        name: '产能锁定动作',
        type: '动作',
        owner: '王五',
        status: 'ready',
        progress: 45
      },
      {
        id: 'tree-001-03',
        order: 3,
        name: '优先级回写动作',
        type: '动作',
        owner: '赵六',
        status: 'paused',
        progress: 30,
        locked: true
      }
    ]
  },
  {
    id: 'tree-002',
    order: 2,
    name: '生产排程配置',
    type: '分组',
    owner: '钱七',
    status: 'active',
    progress: 88,
    children: [
      {
        id: 'tree-002-01',
        order: 1,
        name: '批次合并页面',
        type: '页面',
        owner: '孙八',
        status: 'active',
        progress: 79
      },
      {
        id: 'tree-002-02',
        order: 2,
        name: '缺料预警动作',
        type: '动作',
        owner: '周九',
        status: 'ready',
        progress: 52
      }
    ]
  },
  {
    id: 'tree-003',
    order: 3,
    name: '系统保留节点',
    type: '分组',
    owner: '系统',
    status: 'active',
    progress: 100,
    locked: true,
    children: [
      {
        id: 'tree-003-01',
        order: 1,
        name: '审计日志页面',
        type: '页面',
        owner: '系统',
        status: 'active',
        progress: 100
      },
      {
        id: 'tree-003-02',
        order: 2,
        name: '权限同步动作',
        type: '动作',
        owner: '系统',
        status: 'active',
        progress: 100
      }
    ]
  }
]

const cloneTreeRows = (rows: TreeRow[]): TreeRow[] =>
  rows.map((row) => ({
    ...row,
    children: row.children ? cloneTreeRows(row.children) : undefined
  }))

const flattenTreeRows = (rows: TreeRow[]): TreeRow[] =>
  rows.flatMap((row) => [row, ...(row.children ? flattenTreeRows(row.children) : [])])

const tableData = ref<TreeRow[]>(createInitialTreeRows())
const selectedRows = ref<TreeRow[]>([])
const reorderMessage = ref('拖拽后会在这里显示树结构的最新变化。')

const tableColumns: CommonTableColumn[] = [
  { prop: 'order', label: '顺序', width: 90 },
  { prop: 'name', label: '节点名称', width: 240 },
  { prop: 'type', label: '类型', width: 100 },
  {
    prop: 'status',
    label: '状态',
    width: 120,
    formatter: (row) => statusLabelMap[row.status as TreeRow['status']] ?? '-'
  },
  { prop: 'progress', label: '完成度', width: 110, formatter: (row) => `${row.progress}%` },
  { prop: 'owner', label: '负责人', width: 120 },
  {
    prop: 'locked',
    label: '拖拽限制',
    width: 120,
    formatter: (row) => (row.locked ? '锁定' : '可拖拽')
  }
]

const flatRows = computed(() => flattenTreeRows(tableData.value))
const parentNodeCount = computed(() => tableData.value.length)
const leafNodeCount = computed(() => flatRows.value.filter((row) => !row.children?.length).length)
const lockedNodeCount = computed(() => flatRows.value.filter((row) => row.locked).length)
const selectedSummaryText = computed(() => {
  if (!selectedRows.value.length) {
    return '未选择任何节点。'
  }

  return selectedRows.value
    .map((row) => `${row.name}（${row.type}）`)
    .join('，')
})

const isRowAnchor = (row: TreeRow) => Boolean(row.locked)

const handleSelectionChange = (payload: { rows: TreeRow[] }) => {
  selectedRows.value = payload.rows
}

const handleRowReorder = (rows: TreeRow[]) => {
  tableData.value = cloneTreeRows(rows)
  const firstGroup = tableData.value[0]
  const childPreview = firstGroup?.children?.map((row) => row.name).join(' -> ') || '无子节点'
  reorderMessage.value = `顶层首组“${firstGroup?.name || '-'}”当前顺序：${childPreview}`
}

const resetTreeData = () => {
  tableData.value = createInitialTreeRows()
  selectedRows.value = []
  reorderMessage.value = '已恢复到初始树结构。'
}

const sortLeavesByProgress = () => {
  tableData.value = cloneTreeRows(
    tableData.value.map((group) => ({
      ...group,
      children: group.children
        ? group.children
          .slice()
          .sort((left, right) => right.progress - left.progress)
          .map((child, index) => ({
            ...child,
            order: index + 1
          }))
        : undefined
    }))
  )
  reorderMessage.value = '已按完成度整理各分组子节点，便于继续验证同层级拖拽。'
}
</script>

<style scoped>
.tree-test-page {
  height: 100%;
}

.tree-test-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.tree-test-card .el-card__body) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tree-test-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.tree-test-header h2 {
  margin: 0;
  font-size: 20px;
}

.tree-test-header p {
  margin: 8px 0 0;
  color: #667085;
  font-size: 13px;
}

.tree-test-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tree-test-panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.overview-panel,
.tree-test-selection {
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #dbe4ff;
}

.panel-label {
  display: inline-block;
  margin-bottom: 6px;
  color: #475569;
  font-size: 12px;
}

.overview-panel p,
.tree-test-selection p {
  margin: 0;
  color: #0f172a;
  line-height: 1.6;
}

.tree-test-table-wrap {
  flex: 1;
  min-height: 0;
}

@media (max-width: 960px) {
  .tree-test-header,
  .tree-test-panels {
    grid-template-columns: 1fr;
    display: grid;
  }
}

@media (max-width: 640px) {
  .tree-test-actions {
    width: 100%;
  }
}
</style>

