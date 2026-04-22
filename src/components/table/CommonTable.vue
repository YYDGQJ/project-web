<template>
  <div ref="tableWrapperRef" class="common-table-wrapper">
    <TableToolbar
      :name="props.name"
      :has-tree-data="hasTreeData"
      :ordered-enhanced-columns="orderedEnhancedColumns"
      :visible-column-keys="visibleColumnKeys"
      :col-drag-over-key="colDragOverKey"
      :col-dragging-key="colDraggingKey"
      :operation-mode="props.operationMode"
      :disabled="props.loading || props.toolbarConfig.disabled === true"
      :has-pending-new-rows="newRowKeys.size > 0"
      :toolbar-config="props.toolbarConfig"
      @expand-all="expandAllTreeRows"
      @collapse-all="collapseAllTreeRows"
      @enable-all-visible="enableAllColumnsVisible"
      @disable-all-visible="disableAllColumnsVisible"
      @col-order-drag-start="handleColOrderDragStart"
      @col-order-drag-over="handleColOrderDragOver"
      @col-order-drag-leave="handleColOrderDragLeave"
      @col-order-drop="handleColOrderDrop"
      @col-order-drag-end="handleColOrderDragEnd"
      @toggle-column-visible="toggleColumnVisible"
      @export="handleExport"
      @add-row="handleAddRow"
      @remove-new-rows="handleRemoveNewRows"
    >
      <template #info>
        <slot
          name="toolbar-info"
          :selected-rows="selectedRows"
          :selected-keys="selectedKeys"
        ></slot>
      </template>
    </TableToolbar>

    <div
      ref="vtableRef"
      class="common-table-vtable-wrapper"
      style="width: 100%; height: 100%;"
      @click="handleVtableWrapperClick"
    ></div>

    <div v-if="props.loading" class="common-table-loading-mask">
      <el-icon class="common-table-loading-mask__icon"><Loading /></el-icon>
      <span>{{ props.loadingConfig?.text ?? '加载中...' }}</span>
    </div>

    <!-- 列头筛选浮层按钮 -->
    <div class="common-table-header-filter-layer">
      <button
        v-for="anchor in headerFilterAnchors"
        :key="`header-filter-btn-${anchor.key}`"
        type="button"
        :draggable="false"
        class="common-table-header-filter-btn"
        :class="{ 'is-active': hasAppliedFilter(anchor.key) }"
        :style="{ left: `${anchor.left}px`, top: `${anchor.top}px` }"
        @dragstart.prevent
        @mousedown.stop
        @pointerdown.stop
        @click.stop="openHeaderFilterPanel(anchor.key, (key) => setDraftFilterValues(key, getAppliedFilterValues(key)))"
      >
        <CommonTableSearchIcon class="common-table-search-icon" />
      </button>
    </div>

    <!-- 列头筛选面板 -->
    <TableHeaderFilterPanel
      :visible="headerFilterPanelVisible"
      :active-column="activeHeaderFilterColumn"
      :filter-options="activeHeaderFilterOptions"
      :panel-style="headerFilterPanelStyle"
      :draft-values="activeHeaderFilterColumn ? getDraftFilterValues(activeHeaderFilterColumn.key) : []"
      @draft-change="handleHeaderFilterDraftChange"
      @confirm="handleHeaderFilterConfirm"
      @reset="handleHeaderFilterReset"
      @select-all="selectAllFilters"
      @invert="invertFilters"
    />

    <!-- 单元格悬浮气泡 -->
    <div
      v-if="cellTooltip.visible"
      class="common-table-cell-tooltip"
      :style="{ left: cellTooltip.x + 'px', top: cellTooltip.y + 'px' }"
    >{{ cellTooltip.content }}</div>

    <div
      v-if="activeEditor.visible"
      class="common-table-editor-overlay"
      :style="activeEditor.style"
      @mousedown.stop
      @click.stop
    >
      <el-input
        v-if="activeEditor.editorType === 'input' || activeEditor.editorType === 'number'"
        ref="editorInputRef"
        v-model="activeEditorValue"
        :type="activeEditor.editorType === 'number' ? 'number' : 'text'"
        size="small"
        @blur="commitActiveEditor"
        @keyup.enter="commitActiveEditor"
        @keyup.esc="cancelActiveEditor"
      />
      <el-select
        v-else-if="activeEditor.editorType === 'select'"
        v-model="activeEditorValue"
        size="small"
        style="width: 100%;"
        @change="commitActiveEditor"
        @visible-change="handleEditorVisibleChange"
      >
        <el-option
          v-for="option in activeEditor.options"
          :key="String(option.value)"
          :label="option.value + '_' + option.label"
          :value="option.value+ '_' + option.label"
        />
      </el-select>
      <el-config-provider v-else :locale="zhCnLocale">
        <el-date-picker
          v-model="activeEditorValue"
          :type="activeEditor.editorType === 'datetime' ? 'datetime' : 'date'"
          value-format="YYYY-MM-DD HH:mm:ss"
          size="small"
          style="width: 100%;"
          @change="commitActiveEditor"
          @visible-change="handleEditorVisibleChange"
        />
      </el-config-provider>
    </div>

    <!-- 行拖拽指示线 -->
    <div
      v-if="rowDragIndicator.visible"
      class="common-table-row-drag-indicator"
      :style="{ top: rowDragIndicator.top + 'px', left: rowDragIndicator.left + 'px', width: rowDragIndicator.width + 'px' }"
    ></div>

    <!-- 文字选择浮层 -->
    <div
      v-if="textSelectOverlay.visible"
      class="common-table-text-select-overlay"
      :style="{
        left: textSelectOverlay.left + 'px',
        top: textSelectOverlay.top + 'px',
        width: textSelectOverlay.width + 'px',
        height: textSelectOverlay.height + 'px'
      }"
    >
      <textarea
        ref="textSelectTextareaRef"
        class="common-table-text-select-overlay__textarea"
        readonly
        :value="textSelectOverlay.text"
      ></textarea>
    </div>

    <TablePagination
      :is-pagination-enabled="isPaginationEnabled"
      :total="props.total"
      :current-page="internalCurrentPage"
      :page-size="internalPageSize"
      :page-sizes="props.pageSizes"
      :pagination-layout="resolvedPaginationLayout"
      :active-filter-summaries="paginationFilterSummaries"
      :show-total="props.paginationConfig.showTotal"
      @current-change="handleCurrentPageChange"
      @size-change="handlePageSizeChange"
      @clear-filter-summary="clearFilterSummary"
    />
  </div>
</template>

<script lang="ts">
export { type CommonTableColumn } from './types'
</script>

<script setup lang="ts">
/**
 * 通用表格主组件。
 * 通过组合式模块整合筛选、排序、分页、编辑、导出、树形与拖拽能力，
 * 并对外提供统一事件协议。
 */
import { computed, ref, watch, nextTick, onMounted, onUnmounted, useAttrs } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import './common-table-shared.css'

import CommonTableSearchIcon from '../icons/CommonTableSearchIcon.vue'
import TableToolbar from './components/TableToolbar.vue'
import TablePagination from './components/TablePagination.vue'
import TableHeaderFilterPanel from './components/TableHeaderFilterPanel.vue'

import type {
  CommonTableColumn,
  EnhancedColumn,
  CommonTableSortConfig,
  CalculationMode,
  FilterValue,
  CommonTableOperationMode,
  CommonTableSelectionConfig,
  CommonTableEditingConfig,
  CommonTableSelectionChangePayload,
  CommonTableEditCellChangePayload,
  CommonTableAddCellChangePayload,
  CommonTableSubmitPayload,
  CommonTableEditorOption,
  CommonTableEditorType,
  CommonTableToolbarConfig,
  CommonTablePaginationConfig,
  CommonTableLoadingConfig,
  CommonTableVTableOverrides
} from './types'
import { mergeTableOptions } from './utils/optionUtils'
import { TOOLBAR_FONT_SIZE, CALC_MENU_PREFIX } from './constants'
import { getColumnKey, buildAutoFilters } from './utils/columnUtils'
import { toVTableSortOrder, fromVTableSortOrder, getSortValue, compareValues } from './utils/sortUtils'
import { defaultFilterMethod } from './utils/filterUtils'
import { getErrorMessage } from '../../common/request'
import { exportToExcel } from './utils/exportUtils'

import { usePagination } from './composables/usePagination'
import { useCalculation } from './composables/useCalculation'
import { useColumnManager } from './composables/useColumnManager'
import { useColumnWidth } from './composables/useColumnWidth'
import { useFilterManager } from './composables/useFilterManager'
import { useSortManager } from './composables/useSortManager'
import { useHeaderFilter } from './composables/useHeaderFilter'
import { useTextSelection } from './composables/useTextSelection'
import { useTreeManager } from './composables/useTreeManager'
import { useRowReorder } from './composables/useRowReorder'
import { useTablePreference } from './composables/useTablePreference'

// 复杂能力拆分到 composables，主文件仅负责装配、状态编排与生命周期协同。
// ── 属性与事件 ──

const props = withDefaults(
  defineProps<{
    data: any[]
    columns: CommonTableColumn[]
    loading?: boolean
    border?: boolean
    stripe?: boolean
    tableStyle?: string | Record<string, string>
    rowKey?: string | ((row: any) => string | number)
    height?: string | number
    fillHeight?: boolean
    defaultSort?: CommonTableSortConfig
    calculationEnabled?: boolean
    calculationRowLabel?: string
    calculationDefaultMode?: CalculationMode
    name?: string
    exportSheetName?: string
    rowDraggable?: boolean
    isRowAnchor?: (row: any) => boolean
    orderField?: string
    paginationEnabled?: boolean
    total?: number
    currentPage?: number
    pageSizes?: number[]
    paginationLayout?: string
    operationMode?: CommonTableOperationMode
    selection?: CommonTableSelectionConfig
    editing?: CommonTableEditingConfig
    toolbarConfig?: CommonTableToolbarConfig
    paginationConfig?: CommonTablePaginationConfig
    loadingConfig?: CommonTableLoadingConfig
    vtableOverrides?: CommonTableVTableOverrides
    preferenceEnabled?: boolean
    repairVisibleColumnsWhenEmpty?: boolean
    tableOptions?: Record<string, any>
  }>(),
  {
    loading: false,
    border: true,
    stripe: true,
    tableStyle: 'width: 100%; height: 100%;',
    fillHeight: true,
    calculationEnabled: true,
    calculationRowLabel: '',
    calculationDefaultMode: 'none',
    name: '',
    exportSheetName: 'Sheet1',
    rowDraggable: false,
    orderField: 'order',
    paginationEnabled: true,
    total: 0,
    currentPage: 1,
    pageSizes: () => [100, 500, 1000, 5000],
    paginationLayout: 'total, prev, pager, next, sizes',
    operationMode: 'idle',
    selection: () => ({ mode: 'none' }),
    editing: () => ({ enabled: false, allowCreate: false, allowDelete: false }),
    toolbarConfig: () => ({
      showExpandCollapse: true,
      showColumnManager: true,
      showExport: true
    }),
    paginationConfig: () => ({
      showTotal: true
    }),
    loadingConfig: () => ({}),
    vtableOverrides: () => ({}),
    preferenceEnabled: true,
    repairVisibleColumnsWhenEmpty: false,
    tableOptions: () => ({})
  }
)

const emit = defineEmits<{
  'row-reorder': [data: any[]]
  'update:currentPage': [value: number]
  'update:pageSize': [value: number]
  'pagination-change': [payload: { currentPage: number; pageSize: number; reason: 'page' | 'size' | 'reset' }]
  'selection-change': [payload: CommonTableSelectionChangePayload]
  'edit-cell-change': [payload: CommonTableEditCellChangePayload]
  'add-cell-change': [payload: CommonTableAddCellChangePayload]
  'edit-submit': [payload: CommonTableSubmitPayload]
  'create-submit': [payload: CommonTableSubmitPayload]
  'delete-submit': [payload: CommonTableSubmitPayload]
}>()

const attrs = useAttrs()

const directVTableOverrides = computed<Record<string, unknown>>(() => {
  const entries = Object.entries(attrs).filter(([key]) => {
    if (key === 'class' || key === 'style' || key === 'id' || key === 'role' || key === 'title') {
      return false
    }
    if (key.startsWith('on')) return false
    if (key.startsWith('aria-') || key.startsWith('data-')) return false
    return true
  })
  return Object.fromEntries(entries)
})

// ── 页面节点引用 ──
const vtableRef = ref<HTMLElement | null>(null)
const tableWrapperRef = ref<HTMLElement | null>(null)
let vtableInstance: any = null
let vtableModule: any = null
let vtableModulePromise: Promise<any> | null = null
const tableRef = ref<{ doLayout?: () => void; toggleRowExpansion?: (row: any, expanded: boolean) => void } | null>(null)
const tablePreferenceReady = ref(false)
const applyingTablePreference = ref(false)
const preservedScrollState = ref({ left: 0, top: 0 })

const cellTooltip = ref<{ visible: boolean; content: string; x: number; y: number }>({
  visible: false,
  content: '',
  x: 0,
  y: 0
})

// ── 行唯一标识 ──
const internalRowKeyMap = new WeakMap<object, string>()
let internalRowKeySeed = 0

// 为无业务主键的行生成稳定 key，保障拖拽、选择与树展开状态可持续追踪。
const ensureInternalRowKey = (row: any): string => {
  if (!row || typeof row !== 'object') {
    internalRowKeySeed += 1
    return `row-${internalRowKeySeed}`
  }
  const existing = internalRowKeyMap.get(row)
  if (existing) return existing
  internalRowKeySeed += 1
  const next = `row-${internalRowKeySeed}`
  internalRowKeyMap.set(row, next)
  return next
}

// 行主键解析优先级：rowKey 函数 > rowKey 字段 > __commonTableRowKey > 内部生成 key。
const getRowIdentity = (row: any): string | number => {
  if (typeof props.rowKey === 'function') return props.rowKey(row)
  if (props.rowKey) {
    const key = row?.[props.rowKey as string]
    if (key !== undefined && key !== null && key !== '') return key
  }
  if (row && typeof row === 'object' && row.__commonTableRowKey) {
    return row.__commonTableRowKey
  }
  return ensureInternalRowKey(row)
}

// 递归补齐 __commonTableRowKey，确保整棵树上的节点都具备稳定身份。
const assignInternalKeys = (rows: any[]): any[] => {
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row
    const nextRow = row as Record<string, any>
    if (!nextRow.__commonTableRowKey) {
      nextRow.__commonTableRowKey = String(getRowIdentity(nextRow))
    }
    if (Array.isArray(nextRow.children)) {
      nextRow.children = assignInternalKeys(nextRow.children)
    }
    return nextRow
  })
}

// 深拷贝行数据并保留内部 key，避免编辑态直接污染外部源数据。
const cloneRows = (rows: any[]): any[] =>
  rows.map((row) => {
    if (!row || typeof row !== 'object') return row
    const cloned = { ...row }
    cloned.__commonTableRowKey = row.__commonTableRowKey ?? String(getRowIdentity(row))
    if (Array.isArray(row.children)) {
      cloned.children = cloneRows(row.children)
    }
    return cloned
  })

// 将树形结构拍平成线性列表，方便执行批量选择、检索等操作。
const flattenRows = (rows: any[]): any[] =>
  rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const children = Array.isArray(row.children) ? flattenRows(row.children) : []
    return [row, ...children]
  })

// 递归查找目标行，命中后立刻返回，减少不必要遍历。
const findRowByKey = (rows: any[], rowKey: string | number): any | null => {
  for (const row of rows) {
    if (String(getRowIdentity(row)) === String(rowKey)) return row
    if (Array.isArray(row?.children)) {
      const nested = findRowByKey(row.children, rowKey)
      if (nested) return nested
    }
  }
  return null
}

const selectionMode = computed(() => props.selection?.mode ?? 'none')
const selectionKeyField = computed(() => props.selection?.keyField || (typeof props.rowKey === 'string' ? props.rowKey : undefined))
const editingEnabled = computed(() => props.editing?.enabled === true)
const createEnabled = computed(() => props.editing?.allowCreate !== false)
const deleteEnabled = computed(() => props.editing?.allowDelete !== false)

const workingData = ref<any[]>([])
const idleData = ref<any[]>([])
const originalDataSnapshot = ref<any[]>([])
const editedRowKeys = ref<Set<string>>(new Set())
const dirtyRowKeys = ref<Set<string>>(new Set())
const newRowKeys = ref<Set<string>>(new Set())
const selectedRowKeySet = ref<Set<string>>(new Set())
const invalidCellMessages = ref<Record<string, string>>({})
const activeEditorValue = ref<any>('')
const editorInputRef = ref()
const zhCnLocale = zhCn

const activeEditor = ref<{
  visible: boolean
  rowKey: string | null
  field: string | null
  editorType: CommonTableEditorType
  options: CommonTableEditorOption[]
  style: Record<string, string>
}>({
  visible: false,
  rowKey: null,
  field: null,
  editorType: 'input',
  options: [],
  style: {}
})

const syncIdleData = () => {
  idleData.value = assignInternalKeys(cloneRows(props.data))
}

const initializeWorkingState = (options?: { preserveSelection?: boolean }) => {
  const preservedSelection = options?.preserveSelection ? new Set(selectedRowKeySet.value) : new Set<string>()
  const normalized = cloneRows(idleData.value)
  workingData.value = normalized
  originalDataSnapshot.value = cloneRows(normalized)
  editedRowKeys.value = new Set()
  dirtyRowKeys.value = new Set()
  newRowKeys.value = new Set()
  invalidCellMessages.value = {}
  selectedRowKeySet.value = preservedSelection
  activeEditor.value.visible = false
}

const activeDataSource = computed(() =>
  props.operationMode === 'idle' ? idleData.value : workingData.value
)

const selectedRows = computed(() =>
  flattenRows(activeDataSource.value).filter((row) => selectedRowKeySet.value.has(String(getRowIdentity(row))))
)

const selectedKeys = computed(() =>
  selectedRows.value.map((row) => selectionKeyField.value ? row?.[selectionKeyField.value] : getRowIdentity(row))
)

const emitSelectionChange = () => {
  emit('selection-change', {
    rows: selectedRows.value,
    keys: selectedKeys.value
  })
}

const captureScrollState = () => {
  preservedScrollState.value = {
    left: Number(vtableInstance?.getScrollLeft?.() ?? vtableInstance?.scrollLeft ?? 0),
    top: Number(vtableInstance?.getScrollTop?.() ?? vtableInstance?.scrollTop ?? 0)
  }
}

const restoreScrollState = () => {
  const left = preservedScrollState.value.left
  const top = preservedScrollState.value.top
  if (!vtableInstance) return
  if (Number.isFinite(left)) {
    vtableInstance.setScrollLeft?.(left)
  }
  if (Number.isFinite(top)) {
    vtableInstance.setScrollTop?.(top)
  }
}

const ensureVTableModule = async () => {
  if (vtableModule) return vtableModule
  if (!vtableModulePromise) {
    vtableModulePromise = import('@visactor/vtable').then((module) => {
      vtableModule = module
      return module
    })
  }
  return vtableModulePromise
}

// ── 列宽状态（需先于列管理声明） ──
// 列宽状态由当前组件持有，并在列管理与列宽管理中共享
const _resizedColumnWidths = ref<Record<string, number>>({})

// ── 分页 ──
const paginationEmit = (
  event: string,
  ...args: any[]
) => {
  ;(emit as any)(event, ...args)
}

const {
  internalCurrentPage,
  internalPageSize,
  isPaginationEnabled,
  resolvedPaginationLayout,
  handleCurrentPageChange,
  handlePageSizeChange,
  resetPagination
} = usePagination(props, paginationEmit)

// ── 增强列（核心计算属性） ──
// 过滤/排序启用集合在组合式函数初始化后再回写
const _filterEnabledSet = ref<Set<string>>(new Set())
const _sortEnabledSet = ref<Set<string>>(new Set())

const enhancedColumns = computed<EnhancedColumn[]>(() => {
  return props.columns.map((column) => {
    const key = getColumnKey(column)
    const filterOptions = buildAutoFilters(activeDataSource.value, column.prop)
    return {
      ...column,
      key,
      filterOptions,
      canSort: Boolean(column.prop),
      isSortable: Boolean(column.prop) && _sortEnabledSet.value.has(key)
    }
  })
})

// ── 列管理 ──
const {
  columnOrderKeys,
  visibleColumnKeys,
  colDraggingKey,
  colDragOverKey,
  orderedEnhancedColumns,
  visibleColumnSet,
  visibleOrderedColumns,
  filterableColumns,
  sortableColumns,
  normalizeColumnOrderKeys,
  getDefaultColumnOrderKeys: _getDefaultColumnOrderKeys,
  reorderColumnKeys,
  enableAllColumnsVisible,
  disableAllColumnsVisible,
  toggleColumnVisible,
  handleColOrderDragStart,
  handleColOrderDragOver,
  handleColOrderDragLeave,
  handleColOrderDrop,
  handleColOrderDragEnd
} = useColumnManager(enhancedColumns, _resizedColumnWidths)

// 生成默认列顺序（以列配置声明顺序为准）

const getDefaultColumnOrderKeys = () =>
  _getDefaultColumnOrderKeys(props.columns)

// ── 排序管理 ──
const {
  sortKey,
  sortOrder,
  sortEnabledKeys,
  sortEnabledSet,
  isColumnSortEnabled,
  enableAllSorts,
  disableAllSorts
} = useSortManager(sortableColumns, (key) => enhancedColumns.value.find((c) => c.key === key), props.defaultSort)

// 将排序启用集合回写到基础引用
watch(sortEnabledSet, (v) => { _sortEnabledSet.value = v }, { immediate: true })

const syncEnabledSortKeys = (keys: string[]) => {
  const currentKeys = sortEnabledKeys.value
  if (currentKeys.length === keys.length && currentKeys.every((key, index) => key === keys[index])) {
    return
  }
  sortEnabledKeys.value = keys
}

// 排序固定为开启状态
watch(
  () => sortableColumns.value.map((column) => column.key),
  (keys) => {
    syncEnabledSortKeys(keys)
  },
  { immediate: true }
)

// ── 过滤管理 ──
const {
  filterEnabledKeys,
  filterEnabledSet,
  isColumnFilterEnabled,
  enableAllFilters,
  disableAllFilters,
  getAppliedFilterValues,
  getDraftFilterValues,
  setAppliedFilterValues,
  setDraftFilterValues,
  hasAppliedFilter,
  activeFilterSummaries,
  clearFilterSummary,
  selectAllFilters,
  invertFilters,
  confirmFilters,
  resetFilters,
  updateDraftFilterValues
} = useFilterManager(filterableColumns, enhancedColumns)

const syncEnabledFilterKeys = (keys: string[]) => {
  const currentKeys = filterEnabledKeys.value
  if (currentKeys.length === keys.length && currentKeys.every((key, index) => key === keys[index])) {
    return
  }
  filterEnabledKeys.value = keys
}

// 过滤和排序固定为开启状态
watch(
  () => filterableColumns.value.map((column) => column.key),
  (keys) => {
    syncEnabledFilterKeys(keys)
  },
  { immediate: true }
)

// 将过滤启用集合回写到基础引用
watch(filterEnabledSet, (v) => { _filterEnabledSet.value = v }, { immediate: true })

// ── 列宽管理 ──
const {
  resizedColumnWidths,
  getResolvedColumnMinWidth,
  getResolvedColumnWidth,
  hasResolvedColumnWidth,
  handleColumnResizeEnd,
  reClampResizedWidthsByCurrentMin
} = useColumnWidth(orderedEnhancedColumns, isColumnSortEnabled, isColumnFilterEnabled)

// 同步共享列宽引用
watch(resizedColumnWidths, (v) => { _resizedColumnWidths.value = v }, { deep: true, immediate: true })

// 当过滤或排序能力变化时，重新限制最小列宽
watch([filterEnabledKeys, sortEnabledKeys], () => {
  reClampResizedWidthsByCurrentMin(tableRef as any)
})

// ── 表格高度计算 ──
const resolvedHeight = computed(() => {
  if (props.height !== undefined) return props.height
  return props.fillHeight ? '100%' : undefined
})

// ── 表格展示数据（过滤+排序后） ──
const displayData = computed(() => {
  let rows = activeDataSource.value.slice()
  orderedEnhancedColumns.value.forEach((column) => {
    const selectedValues = getAppliedFilterValues(column.key)
    if (!selectedValues.length || !column.prop || !isColumnFilterEnabled(column.key)) return
    const filterMethod = column.filterMethod ?? defaultFilterMethod
    rows = rows.filter((row) =>
      selectedValues.some((value) => filterMethod(value, row, { property: column.prop }))
    )
  })
  if (!sortKey.value || !sortOrder.value || !isColumnSortEnabled(sortKey.value)) return rows
  const sortColumn = enhancedColumns.value.find((c) => c.key === sortKey.value)
  if (!sortColumn) return rows
  const factor = sortOrder.value === 'descending' ? -1 : 1
  return rows.slice().sort((a, b) => {
    if (sortColumn.sortMethod) return sortColumn.sortMethod(a, b) * factor
    const aVal = getSortValue(a, sortColumn, 0)
    const bVal = getSortValue(b, sortColumn, 1)
    return compareValues(aVal, bVal) * factor
  })
})

// ── 汇总计算 ──
const {
  calculationModes,
  getCalculationMode,
  showSummaryRow,
  updateCalculationMode,
  buildSummaryRecord
} = useCalculation(
  {
    calculationEnabled: props.calculationEnabled,
    calculationDefaultMode: props.calculationDefaultMode,
    calculationRowLabel: props.calculationRowLabel
  },
  visibleOrderedColumns,
  displayData
)

// ── 树形管理 ──
const {
  hasTreeData,
  allTreeRowKeys,
  expandAllTreeRows,
  collapseAllTreeRows
} = useTreeManager(
  props,
  getRowIdentity,
  () => vtableInstance,
  buildSummaryRecord
)

// ── 表头筛选管理 ──
const {
  headerFilterAnchors,
  headerFilterPanelVisible,
  activeHeaderFilterColumn,
  headerFilterPanelStyle,
  updateHeaderFilterAnchors,
  openHeaderFilterPanel,
  closeHeaderFilterPanel,
  handleGlobalLeftClickCloseHeaderFilter
} = useHeaderFilter(
  enhancedColumns,
  visibleOrderedColumns,
  isColumnSortEnabled,
  isColumnFilterEnabled,
  () => vtableInstance,
  computed(() => vtableRef.value)
)

// 基于“其他列已应用筛选条件”动态计算当前列可选筛选项
const getDynamicFilterOptionsByColumn = (column: EnhancedColumn | null) => {
  if (!column?.prop) {
    return [] as Array<{ text: string; value: FilterValue }>
  }

  let rows = activeDataSource.value.slice()
  orderedEnhancedColumns.value.forEach((otherColumn) => {
    if (otherColumn.key === column.key || !otherColumn.prop || !isColumnFilterEnabled(otherColumn.key)) {
      return
    }

    const selectedValues = getAppliedFilterValues(otherColumn.key)
    if (!selectedValues.length) {
      return
    }

    const filterMethod = otherColumn.filterMethod ?? defaultFilterMethod
    rows = rows.filter((row) =>
      selectedValues.some((value) =>
        filterMethod(value, row, { property: otherColumn.prop })
      )
    )
  })

  return buildAutoFilters(rows, column.prop) ?? []
}

const activeHeaderFilterOptions = computed(() => {
  return getDynamicFilterOptionsByColumn(activeHeaderFilterColumn.value)
})

const paginationFilterSummaries = computed(() =>
  visibleOrderedColumns.value.length ? activeFilterSummaries.value : []
)

// 更新表头筛选面板中的临时勾选状态，不立即影响结果集

const handleHeaderFilterDraftChange = (values: FilterValue[]) => {
  if (!activeHeaderFilterColumn.value) return
  updateDraftFilterValues(activeHeaderFilterColumn.value.key, values)
}

// 重置当前激活列的筛选
// 将当前列筛选恢复到空状态
const handleHeaderFilterReset = () => {
  if (!activeHeaderFilterColumn.value) return
  resetFilters(activeHeaderFilterColumn.value.key)
}

// 确认当前激活列的筛选
// 应用当前列筛选并关闭筛选面板
const handleHeaderFilterConfirm = () => {
  if (!activeHeaderFilterColumn.value) return
  confirmFilters(activeHeaderFilterColumn.value.key)
  closeHeaderFilterPanel()
}

const handleVtableWrapperClick = (event: MouseEvent) => {
  const target = event.target
  if (target instanceof Element) {
    if (target.closest('.common-table-header-filter-btn')) return
    if (target.closest('.common-table-header-filter-panel')) return
  }
  closeHeaderFilterPanel()
}

// ── 单元格文字选择 ──
const {
  textSelectTextareaRef,
  textSelectOverlay,
  hideTextSelectOverlay,
  startTextSelectionOverlay,
  handleGlobalLeftClickCloseTextOverlay
} = useTextSelection(
  computed(() => vtableRef.value),
  computed(() => tableWrapperRef.value),
  () => false // 行拖拽激活判断由行拖拽组合式函数提供
)

// ── 行拖拽排序 ──
const resolvedOrderColumnKey = computed(() => {
  const field = props.orderField || 'order'
  const matched = props.columns.find(
    (col) => col.prop === field || col.columnKey === field || getColumnKey(col) === field
  )
  return matched ? getColumnKey(matched) : null
})

const {
  rowDragIndicator,
  isRowReorderEnabled,
  validateVTableDragOrder,
  handleVTableRowReorder,
  setupRowDragListeners
} = useRowReorder(
  {
    rowDraggable: props.rowDraggable,
    orderField: props.orderField,
    isRowAnchor: props.isRowAnchor,
    columns: props.columns
  },
  activeDataSource,
  displayData,
  computed(() => selectedRowKeySet.value),
  getRowIdentity,
  resolvedOrderColumnKey,
  () => vtableInstance,
  computed(() => vtableRef.value),
  computed(() => tableWrapperRef.value),
  buildSummaryRecord,
  emit
)

// ── 表格偏好持久化 ──
const {
  initializeTablePreference,
  scheduleSaveTablePreference,
  clearSaveTimer
} = useTablePreference({
  preferenceEnabled: props.preferenceEnabled,
  repairVisibleColumnsWhenEmpty: props.repairVisibleColumnsWhenEmpty,
  tableName: props.name,
  tablePreferenceReady,
  applyingTablePreference,
  columnOrderKeys,
  visibleColumnKeys,
  filterEnabledKeys,
  sortEnabledKeys,
  resizedColumnWidths,
  internalPageSize,
  filterableColumns,
  sortableColumns,
  getDefaultColumnOrderKeys
})

watch(
  [visibleColumnKeys, columnOrderKeys, filterEnabledKeys, sortEnabledKeys, resizedColumnWidths, internalPageSize],
  () => { scheduleSaveTablePreference() },
  { deep: true }
)

// ── 列辅助方法 ──

// 根据运行时字段名定位到增强列定义

const getColumnByField = (field: unknown) => {
  if (typeof field !== 'string' && typeof field !== 'number') return undefined
  return enhancedColumns.value.find((col) => col.prop === String(field))
}

// 从运行时字段提取列键，供排序/筛选/菜单逻辑复用

const getColumnKeyByField = (field: unknown): string | null =>
  getColumnByField(field)?.key ?? null

const getSelectionKeyValue = (row: any) =>
  selectionKeyField.value ? row?.[selectionKeyField.value] : getRowIdentity(row)

const SELECTION_FIELD = '__commonTableSelection'

const resolveBodyRowIndex = (row: number) => {
  // VTable body row index starts at 1 because row 0 is header.
  return row - 1
}

const resolveRowByVTableIndex = (row: number) => {
  const bodyRowIndex = resolveBodyRowIndex(row)
  if (bodyRowIndex < 0) return null
  return displayData.value[bodyRowIndex] ?? null
}

const getInvalidCellKey = (rowKey: string | number, field: string) => `${String(rowKey)}::${field}`

const setInvalidCellMessage = (rowKey: string | number, field: string, message: string) => {
  invalidCellMessages.value = {
    ...invalidCellMessages.value,
    [getInvalidCellKey(rowKey, field)]: message
  }
}

const clearInvalidCellMessage = (rowKey: string | number, field: string) => {
  const next = { ...invalidCellMessages.value }
  delete next[getInvalidCellKey(rowKey, field)]
  invalidCellMessages.value = next
}

const getInvalidCellMessage = (rowKey: string | number, field: string) =>
  invalidCellMessages.value[getInvalidCellKey(rowKey, field)] ?? ''

const isRowEditable = (row: any) => {
  const rowKey = String(getRowIdentity(row))
  if (props.operationMode === 'create') {
    return newRowKeys.value.has(rowKey)
  }
  if (props.operationMode === 'edit') {
    return selectedRowKeySet.value.has(rowKey)
  }
  return false
}

const isColumnEditable = (column: CommonTableColumn, row: any) => {
  if (!editingEnabled.value || !column.prop) return false
  if (!isRowEditable(row)) return false
  if (props.operationMode === 'create') {
    return column.createEditable !== false
  }
  return column.editable === true
}

const isEditableMode = computed(
  () => props.operationMode === 'edit' || props.operationMode === 'create'
)

const isHeaderEditableColumn = (column: CommonTableColumn) => {
  if (!editingEnabled.value || !column.prop) return false
  if (props.operationMode === 'create') {
    return column.createEditable !== false
  }
  if (props.operationMode === 'edit') {
    return column.editable === true
  }
  return false
}

const buildCleanRows = (rows: any[]) =>
  rows.map(({ __commonTableRowKey, __commonTableSelection, ...rest }) => rest)

const buildEditPayload = (): CommonTableEditCellChangePayload => ({
  editRows: buildCleanRows(
    flattenRows(workingData.value).filter((r) => editedRowKeys.value.has(String(getRowIdentity(r))))
  )
})

const buildAddPayload = (): CommonTableAddCellChangePayload => ({
  addRows: buildCleanRows(
    flattenRows(workingData.value).filter((r) => {
      const rowKey = String(getRowIdentity(r))
      return newRowKeys.value.has(rowKey) && selectedRowKeySet.value.has(rowKey)
    })
  )
})

const emitCellChange = () => {
  if (props.operationMode === 'create') {
    emit('add-cell-change', buildAddPayload())
    return
  }
  if (props.operationMode === 'edit') {
    emit('edit-cell-change', buildEditPayload())
  }
}

const markRowAsEdited = (rowKey: string) => {
  if (!newRowKeys.value.has(rowKey)) {
    editedRowKeys.value = new Set([...editedRowKeys.value, rowKey])
    dirtyRowKeys.value = new Set([...dirtyRowKeys.value, rowKey])
  }
}

const resetActiveEditor = () => {
  activeEditor.value = {
    visible: false,
    rowKey: null,
    field: null,
    editorType: 'input',
    options: [],
    style: {}
  }
}

const cancelActiveEditor = () => {
  resetActiveEditor()
}

const validateRow = (row: any) => {
  for (const column of props.columns) {
    if (!column.prop) continue
    const value = row?.[column.prop]
    const requiredMessage = typeof column.required === 'string' ? column.required : `${column.label}不能为空`
    if (column.required && (value === undefined || value === null || value === '')) {
      return requiredMessage
    }
    const validationMessage = column.validator?.(value, row, column)
    if (validationMessage) {
      return validationMessage
    }
  }
  return ''
}

const validateRows = (rows: any[]) => {
  const nextInvalids: Record<string, string> = {}

  rows.forEach((row) => {
    const rowKey = getRowIdentity(row)
    props.columns.forEach((column) => {
      if (!column.prop) return
      const value = row?.[column.prop]
      const requiredMessage = typeof column.required === 'string' ? column.required : `${column.label}不能为空`
      let message = ''

      if (column.required && (value === undefined || value === null || value === '')) {
        message = requiredMessage
      }

      if (!message) {
        message = column.validator?.(value, row, column) ?? ''
      }

      if (message) {
        nextInvalids[getInvalidCellKey(rowKey, column.prop)] = message
      }
    })
  })

  invalidCellMessages.value = nextInvalids
  return nextInvalids
}

const scrollToInvalidCell = (invalids: Record<string, string>) => {
  const firstInvalidKey = Object.keys(invalids)[0]
  if (!firstInvalidKey) return
  const [rowKey, field] = firstInvalidKey.split('::')
  const rowIndex = displayData.value.findIndex((row) => String(getRowIdentity(row)) === rowKey)
  const columnIndex = buildVTableOption().columns.findIndex((column: any) => column.field === field)

  if (rowIndex < 0 || columnIndex < 0 || !vtableInstance?.scrollToCell) return

  nextTick(() => {
    vtableInstance.scrollToCell({ col: columnIndex, row: rowIndex + 1 })
  })
}

const handleEditorVisibleChange = (visible: boolean) => {
  if (!visible) {
    commitActiveEditor()
  }
}

const commitActiveEditor = () => {
  if (!activeEditor.value.visible || !activeEditor.value.rowKey || !activeEditor.value.field) return
  captureScrollState()
  const target = findRowByKey(workingData.value, activeEditor.value.rowKey)
  if (!target) {
    resetActiveEditor()
    return
  }
  target[activeEditor.value.field] = activeEditorValue.value
  let pendingValidationMessage = ''
  const editingColumn = props.columns.find((column) => column.prop === activeEditor.value.field)
  if (editingColumn) {
    const requiredMessage = typeof editingColumn.required === 'string'
      ? editingColumn.required
      : `${editingColumn.label}不能为空`
    let validationMessage = ''
    if (editingColumn.required && (activeEditorValue.value === undefined || activeEditorValue.value === null || activeEditorValue.value === '')) {
      validationMessage = requiredMessage
    }
    if (!validationMessage) {
      validationMessage = editingColumn.validator?.(activeEditorValue.value, target, editingColumn) ?? ''
    }
    if (validationMessage) {
      setInvalidCellMessage(activeEditor.value.rowKey, activeEditor.value.field, validationMessage)
      pendingValidationMessage = validationMessage
    } else {
      clearInvalidCellMessage(activeEditor.value.rowKey, activeEditor.value.field)
    }
  }
  markRowAsEdited(String(activeEditor.value.rowKey))
  emitCellChange()
  resetActiveEditor()
  refreshTableRecords()
  if (pendingValidationMessage) {
    nextTick(() => {
      ElMessage({
        type: 'warning',
        message: pendingValidationMessage,
        grouping: false
      })
    })
  }
}

const openEditorForCell = (row: any, column: CommonTableColumn, rect: { left: number; top: number; width: number; height: number }) => {
  if (!column.prop) return
  activeEditorValue.value = row?.[column.prop] ?? ''
  const editorWidth = Math.max(1, Number(rect.width) || 0)
  const editorHeight = Math.max(1, Number(rect.height) || 0)
  activeEditor.value = {
    visible: true,
    rowKey: String(getRowIdentity(row)),
    field: column.prop,
    editorType: column.editorType ?? 'input',
    options: column.editorOptions ?? [],
    style: {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${editorWidth}px`,
      height: `${editorHeight}px`
    }
  }
  nextTick(() => {
    editorInputRef.value?.focus?.()
  })
}

const handleAddRow = () => {
  if (props.operationMode !== 'create' || !createEnabled.value) return
  captureScrollState()
  const newRow = props.columns.reduce<Record<string, unknown>>((acc, column) => {
    if (column.prop) {
      acc[column.prop] = ''
    }
    return acc
  }, {})
  newRow.__commonTableRowKey = `created-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const newRowKey = String(newRow.__commonTableRowKey)
  workingData.value = [newRow, ...workingData.value]
  newRowKeys.value = new Set([...newRowKeys.value, newRowKey])
  // 新增行默认不计入 addRows，只有用户勾选后才进入 addRows。
  selectedRowKeySet.value = new Set(
    [...selectedRowKeySet.value].filter((key) => key !== newRowKey)
  )
  emitCellChange()
  refreshTableRecords()
}

const handleRemoveNewRows = () => {
  if (!createEnabled.value || !newRowKeys.value.size || !selectedRowKeySet.value.size) return
  captureScrollState()
  const removable = new Set(
    [...selectedRowKeySet.value].filter((key) => newRowKeys.value.has(key))
  )
  if (!removable.size) return
  workingData.value = flattenRows(workingData.value)
    .filter((row) => !removable.has(String(getRowIdentity(row))))
    .map((row) => ({ ...row }))
  newRowKeys.value = new Set([...newRowKeys.value].filter((key) => !removable.has(key)))
  selectedRowKeySet.value = new Set([...selectedRowKeySet.value].filter((key) => !removable.has(key)))
  emitCellChange()
  emitSelectionChange()
  refreshTableRecords()
}

const confirmPendingChanges = async () => {
  commitActiveEditor()
  if (props.operationMode === 'edit') {
    const rows = flattenRows(workingData.value).filter((row) => editedRowKeys.value.has(String(getRowIdentity(row))))
    const invalids = validateRows(rows)
    const firstMessage = Object.values(invalids)[0]
    refreshTableRecords()
    if (firstMessage) {
      ElMessage.warning(firstMessage)
      scrollToInvalidCell(invalids)
      return false
    }
    emit('edit-submit', { rows, keys: rows.map((row) => getSelectionKeyValue(row)) })
    return true
  }
  if (props.operationMode === 'create') {
    const rows = flattenRows(workingData.value).filter((row) => {
      const rowKey = String(getRowIdentity(row))
      return newRowKeys.value.has(rowKey) && selectedRowKeySet.value.has(rowKey)
    })
    const invalids = validateRows(rows)
    const firstMessage = Object.values(invalids)[0]
    refreshTableRecords()
    if (firstMessage) {
      ElMessage.warning(firstMessage)
      scrollToInvalidCell(invalids)
      return false
    }
    emit('create-submit', { rows, keys: rows.map((row) => getSelectionKeyValue(row)) })
    return true
  }
  if (props.operationMode === 'delete') {
    if (!deleteEnabled.value) return false
    invalidCellMessages.value = {}
    refreshTableRecords()
    emit('delete-submit', { rows: selectedRows.value, keys: selectedKeys.value })
    return true
  }
  return true
}

const cancelPendingChanges = () => {
  initializeWorkingState()
  emitSelectionChange()
  return true
}

defineExpose({ resetPagination, confirmPendingChanges, cancelPendingChanges })

// ── 右键菜单 ──
// 生成右键菜单：表头提供计算方式，数据区提供复制单元格
const buildContextMenuItems = (field: unknown, row: number, col: number, table?: any) => {
  const cellLocation = table?.getCellLocation?.(col, row)
  if (cellLocation !== 'columnHeader') {
    if (cellLocation !== 'body') return []
    return [{ text: '复制单元格', menuKey: 'copy-cell' }]
  }
  const column = getColumnByField(field)
  if (!column) return []
  const menuItems: Array<{ text: string; menuKey: string; type?: 'item' | 'split' | 'title'; disabled?: boolean }> = []
  if (props.calculationEnabled) {
    menuItems.push({ text: '计算方式', menuKey: 'calc-title', type: 'title' })
    menuItems.push({ text: '无', menuKey: `${CALC_MENU_PREFIX}none` })
    menuItems.push({ text: '求和', menuKey: `${CALC_MENU_PREFIX}sum` })
    menuItems.push({ text: '平均值', menuKey: `${CALC_MENU_PREFIX}avg` })
    menuItems.push({ text: '最小值', menuKey: `${CALC_MENU_PREFIX}min` })
    menuItems.push({ text: '最大值', menuKey: `${CALC_MENU_PREFIX}max` })
  }
  return menuItems
}

// 构建表格配置
// 组装 VTable 所需完整配置（列、数据、交互、主题、尺寸）
const buildVTableOption = () => {
  const filteredColumns = visibleOrderedColumns.value.filter((col) => col.prop)
  
  // 将列按照 fixed 属性重新排序，确保固定列在前/后
  const orderedColumns = [
    ...filteredColumns.filter((col) => col.fixed === 'left'),
    ...filteredColumns.filter((col) => !col.fixed),
    ...filteredColumns.filter((col) => col.fixed === 'right')
  ]
  
  const dataColumns = orderedColumns.map((col, idx) => {
    const {
      prop,
      label,
      width,
      minWidth,
      align,
      fixed,
      slotName,
      className,
      showOverflowTooltip,
      sortable,
      sortMethod,
      sortBy,
      sortOrders,
      filters,
      filterMethod,
      filterPlacement,
      filterMultiple,
      filteredValue,
      columnKey,
      formatter,
      editable,
      createEditable,
      editorType,
      editorOptions,
      editorProps,
      required,
      validator,
      color,
      headerColor,
      backgroundColor,
      headerBackgroundColor,
      vtableColumnOptions,
      ...nativeColumnOptions
    } = col

    const hasPersonalizedWidth = hasResolvedColumnWidth(col)
    const preferredWidth = hasPersonalizedWidth
      ? getResolvedColumnWidth(col)
      : undefined
    const preferredMinWidth = getResolvedColumnMinWidth(col)

    const baseColumn = {
      field: col.prop as string,
      caption: col.label,
      // 默认宽度采用最小安全宽度；如传入原生 width，可在后续合并阶段覆盖。
      width: idx === orderedColumns.length - 1 ? undefined : preferredMinWidth,
      minWidth: preferredMinWidth,
      sort: isColumnSortEnabled(col.key),
      showSort: isColumnSortEnabled(col.key),
      dragHeader: false,
      cellType: 'text' as const,
      __columnTextColor: col.color,
      __columnBgColor: col.backgroundColor,
      tree: hasTreeData.value && idx === 0 ? true : undefined,
      headerStyle: {
        color: col.headerColor ?? (isEditableMode.value && isHeaderEditableColumn(col) ? '#2563eb' : undefined),
        bgColor: col.headerBackgroundColor
      }
    }
    const mergedColumn = {
      ...baseColumn,
      ...nativeColumnOptions,
      ...(col.vtableColumnOptions ?? {})
    }

    // 个性化宽度（列宽管理/用户拖拽）优先级最高，仅在存在个性化宽度时覆盖透传值。
    if (hasPersonalizedWidth && preferredWidth !== undefined) {
      mergedColumn.width = preferredWidth
    }
    if (preferredMinWidth !== undefined) {
      mergedColumn.minWidth = preferredMinWidth
    }

    return mergedColumn
  })

  const selectionColumn: any[] = selectionMode.value === 'none'
    ? []
    : [{
      field: SELECTION_FIELD,
      caption: '',
      width: 46,
      minWidth: 46,
      maxWidth: 46,
      resizable: false,
      sortable: false,
      dragHeader: false,
      headerType: selectionMode.value === 'multiple' ? 'checkbox' : undefined,
      cellType: selectionMode.value === 'multiple' ? 'checkbox' as const : 'radio' as const,
      checked: ({ row }: { row: number }) => {
        const record = resolveRowByVTableIndex(row)
        return record ? selectedRowKeySet.value.has(String(getRowIdentity(record))) : false
      }
    }]

  const validColumns = [...selectionColumn, ...dataColumns]

  // 计算固定列数量
  const leftFixedCount = orderedColumns.filter((col) => col.fixed === 'left').length
  const rightFixedCount = orderedColumns.filter((col) => col.fixed === 'right').length
  const frozenColCount = (selectionMode.value === 'none' ? 0 : 1) + leftFixedCount
  const rightFrozenColCount = rightFixedCount

  const summaryRecord = buildSummaryRecord()
  const records = summaryRecord ? [...displayData.value, summaryRecord] : displayData.value
  const dragHeaderMode: 'all' | 'column' | 'row' | 'none' = isRowReorderEnabled.value ? 'row' : 'none'
  const sortColumn = sortKey.value ? enhancedColumns.value.find((c) => c.key === sortKey.value) : null
  const sortState =
    sortColumn?.prop
      ? { field: sortColumn.prop, order: toVTableSortOrder(sortOrder.value) }
      : undefined

  const baseOptions = {
    records,
    columns: validColumns,
    rowSeriesNumber: undefined,
    sortState,
    emptyTip: {
      text: '暂无数据',
      displayMode: 'basedOnContainer' as const,
      spaceBetweenTextAndIcon: 0,
      icon: {
        width: 0,
        height: 0,
        image: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
      },
      textStyle: { fontSize: TOOLBAR_FONT_SIZE, color: '#909399' }
    },
    rowHierarchyType: hasTreeData.value ? ('tree' as const) : undefined,
    hierarchyExpandLevel: hasTreeData.value ? 1 : undefined,
    hierarchyIndent: 16,
    defaultHeaderRowHeight: 22,
    defaultRowHeight: 22,
    bottomFrozenRowCount: summaryRecord ? 1 : 0,
    dragOrder: {
      dragHeaderMode,
      validateDragOrderOnEnd: validateVTableDragOrder
    },
    resize: { columnResizeMode: 'all' as const },
    menu: { contextMenuItems: buildContextMenuItems, contextMenuWorkOnlyCell: true },
    select: { disableSelect: true },
    theme: {
      headerStyle: { fontSize: TOOLBAR_FONT_SIZE, color: '#606266', borderColor: '#e0e3e9' },
      bodyStyle: {
        fontSize: TOOLBAR_FONT_SIZE,
        lineHeight: 16,
        borderColor: '#e0e3e9',
        bgColor: ({ row, col }: { row: number; col: number }) => {
          const bodyRowIndex = resolveBodyRowIndex(row)
          const record = resolveRowByVTableIndex(row)
          if (!record) return '#ffffff'
          const rowKey = String(getRowIdentity(record))
          const field = validColumns[col]?.field
          if (typeof field === 'string' && getInvalidCellMessage(rowKey, field)) return '#fff1f0'
          if (props.operationMode === 'delete' && selectedRowKeySet.value.has(rowKey)) return '#ffe7e7'
          if (newRowKeys.value.has(rowKey)) return '#e8f4ff'
          if (dirtyRowKeys.value.has(rowKey)) return '#fff1df'
          const columnBgColor = (validColumns[col] as { __columnBgColor?: string } | undefined)?.__columnBgColor
          if (columnBgColor) return columnBgColor
          if (props.stripe && bodyRowIndex % 2 === 1) return '#fafcff'
          return '#ffffff'
        },
        color: ({ row, col }: { row: number; col: number }) => {
          const record = resolveRowByVTableIndex(row)
          if (!record) return '#606266'
          const rowKey = String(getRowIdentity(record))
          const field = validColumns[col]?.field
          if (typeof field === 'string' && getInvalidCellMessage(rowKey, field)) return '#d03050'
          const columnTextColor = (validColumns[col] as { __columnTextColor?: string } | undefined)?.__columnTextColor
          if (columnTextColor) return columnTextColor
          return '#606266'
        }
      },
      bottomFrozenStyle: { color: '#f56c6c', fontSize: TOOLBAR_FONT_SIZE, lineHeight: 16 },
      selectionStyle: {
        cellBorderColor: 'transparent',
        cellBgColor: 'transparent',
        inlineColumnBgColor: 'transparent',
        inlineRowBgColor: 'transparent'
      },
      columnResize: { labelVisible: false },
      scrollStyle: { barToSide: true, hoverOn: false }
    },
    frameStyle: { borderColor: '#e0e3e9' },
    widthMode: 'standard' as const,
    heightMode: 'standard' as const,
    autoFillWidth: true,
    autoFillHeight: false,
    containerFit: { width: false, height: true },
    frozenColCount: frozenColCount,
    rightFrozenColCount: rightFrozenColCount,
    height: resolvedHeight.value
  }

  const directMergedOptions = mergeTableOptions(baseOptions, directVTableOverrides.value)
  const mergedOptions = mergeTableOptions(directMergedOptions, props.vtableOverrides)
  const legacyMergedOptions = mergeTableOptions(mergedOptions, props.tableOptions)

  return {
    ...legacyMergedOptions,
    records,
    columns: validColumns,
    height: resolvedHeight.value
  }
}

const refreshTableRecords = () => {
  if (vtableInstance?.setRecords) {
    captureScrollState()
    const summaryRecord = buildSummaryRecord()
    const records = summaryRecord ? [...displayData.value, summaryRecord] : displayData.value
    vtableInstance.setRecords(records)
    nextTick(restoreScrollState)
  }
}

// 渲染并绑定表格事件
// 负责创建表格实例并绑定交互事件（排序、筛选、拖拽、提示等）
const renderVTable = async () => {
  if (!vtableRef.value) return
  const VTable = await ensureVTableModule()
  captureScrollState()
  if (vtableInstance) {
    vtableInstance.release?.()
    vtableInstance = null
  }
  vtableInstance = new VTable.ListTable(vtableRef.value, buildVTableOption())
  nextTick(() => {
    restoreScrollState()
    updateHeaderFilterAnchors()
  })

  vtableInstance.on?.('dropdown_menu_click', (args: any) => {
    const columnKey = getColumnKeyByField(args?.field)
    if (!columnKey) return
    const menuKey = String(args?.menuKey || '')
    if (menuKey.startsWith(CALC_MENU_PREFIX)) {
      const nextMode = menuKey.slice(CALC_MENU_PREFIX.length) as CalculationMode
      updateCalculationMode(columnKey, nextMode)
      nextTick(renderVTable)
    }
  })

  vtableInstance.on?.('dropdown_menu_click', (args: any) => {
    const menuKey = String(args?.menuKey || '')
    if (menuKey === 'copy-cell') {
      const cellValue = vtableInstance?.getCellValue?.(args?.col, args?.row)
      if (cellValue !== undefined && cellValue !== null) {
        navigator.clipboard?.writeText(String(cellValue)).catch(() => {})
      }
    }
  })

  vtableInstance.on?.('change_header_position', (args: any) => {
    if (args?.movingColumnOrRow === 'row') {
      handleVTableRowReorder(args)
      return
    }
    const fieldToKey = new Map(
      enhancedColumns.value
        .filter((col) => col.prop)
        .map((col) => [String(col.prop), col.key])
    )
    const reorderedVisibleKeys: string[] = []
    const totalColCount = Number(vtableInstance?.colCount || 0)
    for (let index = 0; index < totalColCount; index += 1) {
      const field = vtableInstance?.getHeaderField?.(index, 0)
      const key = fieldToKey.get(String(field))
      if (key) reorderedVisibleKeys.push(key)
    }
    if (!reorderedVisibleKeys.length) return
    const visibleSet = new Set(visibleOrderedColumns.value.map((col) => col.key))
    const untouched = columnOrderKeys.value.filter((key) => !visibleSet.has(key))
    columnOrderKeys.value = [...reorderedVisibleKeys, ...untouched]
    updateHeaderFilterAnchors()
  })

  vtableInstance.on?.('resize_column_end', (args: any) => {
    const col = Number(args?.col)
    if (!Number.isFinite(col) || col < 0) return

    const targetField = vtableInstance?.getHeaderField?.(col, 0)
    const targetColumnKey = getColumnKeyByField(targetField)
    if (!targetColumnKey) return

    const resizedCols = visibleOrderedColumns.value.filter((column) => column.prop)
    const targetColumn = resizedCols.find((column) => column.key === targetColumnKey)
    if (!targetColumn) return

    const oldWidth = resizedColumnWidths.value[targetColumn.key] ?? getResolvedColumnMinWidth(targetColumn)
    const nextWidth = Number(args?.colWidths?.[col] ?? vtableInstance?.getColWidth?.(col))
    if (!Number.isFinite(nextWidth) || nextWidth <= 0) return
    
    // 保存被拖动列的新宽度
    handleColumnResizeEnd(nextWidth, oldWidth, {
      columnKey: targetColumn.key,
      label: targetColumn.label
    })

    // 调整最后一列来补偿拖动的宽度差，保持表格撑满且其他列不动
    nextTick(() => {
      const widthDelta = nextWidth - oldWidth  // 被拖动列的宽度变化量
      if (Math.abs(widthDelta) < 2) return    // 变化太小不处理

      const dataColumnKeysInDisplayOrder: string[] = []
      const totalColCount = Number(vtableInstance?.colCount || 0)
      for (let index = 0; index < totalColCount; index += 1) {
        const field = vtableInstance?.getHeaderField?.(index, 0)
        if (!field || field === SELECTION_FIELD) continue
        const key = getColumnKeyByField(field)
        if (key) dataColumnKeysInDisplayOrder.push(key)
      }

      if (!dataColumnKeysInDisplayOrder.length) return

      const targetIndex = dataColumnKeysInDisplayOrder.indexOf(targetColumn.key)
      const lastKeyInDisplayOrder = dataColumnKeysInDisplayOrder[dataColumnKeysInDisplayOrder.length - 1]
      if (targetIndex < 0 || targetColumn.key === lastKeyInDisplayOrder) return

      const lastColumn = resizedCols.find((column) => column.key === lastKeyInDisplayOrder)
      if (!lastColumn) return

      const lastKey = lastColumn.key
      const currentLastWidth = getResolvedColumnWidth(lastColumn) ?? getResolvedColumnMinWidth(lastColumn)
      const minLastWidth = getResolvedColumnMinWidth(lastColumn)
      
      // 最后一列的新宽度 = 当前宽度 - 被拖动列增加的宽度（即负的 widthDelta）
      const newLastWidth = Math.max(currentLastWidth - widthDelta, minLastWidth)
      
      if (Math.abs(newLastWidth - currentLastWidth) > 1) {  // 确实有变化
        const nextState = { ...resizedColumnWidths.value, [lastKey]: newLastWidth }
        resizedColumnWidths.value = nextState
        nextTick(() => {
          tableRef?.value?.doLayout?.()
        })
      }
    })
  })

  vtableInstance.on?.('after_sort', (args: any) => {
    const columnKey = getColumnKeyByField(args?.field)
    if (!columnKey || !isColumnSortEnabled(columnKey)) {
      sortKey.value = null
      sortOrder.value = null
      return
    }
    sortKey.value = columnKey
    sortOrder.value = fromVTableSortOrder(args?.order)
    updateHeaderFilterAnchors()
  })

  vtableInstance.on?.('checkbox_state_change', () => {
    if (selectionMode.value !== 'multiple') return
    const states = vtableInstance?.getCheckboxState?.(SELECTION_FIELD) ?? []
    const rows = flattenRows(displayData.value)
    const stateOffset = states.length === rows.length + 1 ? 1 : 0
    const nextSelected = new Set<string>()
    states.forEach((checked: boolean, index: number) => {
      if (index < stateOffset) return
      if (!checked) return
      const row = rows[index - stateOffset]
      if (row) {
        nextSelected.add(String(getRowIdentity(row)))
      }
    })
    if (props.operationMode === 'edit') {
      const deselected = [...editedRowKeys.value].filter((key) => !nextSelected.has(key))
      if (deselected.length) {
        editedRowKeys.value = new Set([...editedRowKeys.value].filter((key) => nextSelected.has(key)))
        emitCellChange()
      }
    }
    selectedRowKeySet.value = nextSelected
    if (props.operationMode === 'create') {
      emitCellChange()
    }
    emitSelectionChange()
    refreshTableRecords()
  })

  vtableInstance.on?.('radio_state_change', (args: any) => {
    if (selectionMode.value !== 'single') return
    const record = vtableInstance?.getCellOriginRecord?.(args?.col, args?.row)
    if (!record) return
    const newKey = String(getRowIdentity(record))
    if (props.operationMode === 'edit') {
      const prevSize = editedRowKeys.value.size
      editedRowKeys.value = new Set([...editedRowKeys.value].filter((key) => key === newKey))
      if (editedRowKeys.value.size !== prevSize) {
        emitCellChange()
      }
    }
    selectedRowKeySet.value = new Set([newKey])
    if (props.operationMode === 'create') {
      emitCellChange()
    }
    emitSelectionChange()
    refreshTableRecords()
  })

  vtableInstance.on?.('click_cell', (args: any) => {
    if (!editingEnabled.value || props.operationMode === 'idle' || props.operationMode === 'delete') return
    const location = vtableInstance?.getCellLocation?.(args?.col, args?.row)
    if (location !== 'body') return
    const field = vtableInstance?.getHeaderField?.(args?.col, 0)
    if (!field || field === SELECTION_FIELD) return
    const column = props.columns.find((item) => item.prop === field)
    const row = vtableInstance?.getCellOriginRecord?.(args?.col, args?.row)
    if (!column || !row || !isColumnEditable(column, row)) return
    const rect =
      vtableInstance.getCellRelativeRect?.(args?.col, args?.row) ??
      vtableInstance.getCellRect?.(args?.col, args?.row)
    if (!rect || !vtableRef.value || !tableWrapperRef.value) return
    const wrapperRect = tableWrapperRef.value.getBoundingClientRect()
    const tableRect = vtableRef.value.getBoundingClientRect()
    openEditorForCell(row, column, {
      left: tableRect.left - wrapperRect.left + rect.left,
      top: tableRect.top - wrapperRect.top + rect.top,
      width: rect.width,
      height: rect.height
    })
  })

  vtableInstance.on?.('scroll', () => {
    captureScrollState()
    cellTooltip.value = { ...cellTooltip.value, visible: false }
    hideTextSelectOverlay()
    cancelActiveEditor()
    updateHeaderFilterAnchors()
  })

  vtableInstance.on?.('mousedown_cell', (args: any) => {
    startTextSelectionOverlay(args, vtableInstance)
  })

  vtableInstance.on?.('dblclick_cell', (args: any) => {
    startTextSelectionOverlay(args, vtableInstance, { selectAll: true, disableDrag: true })
  })

  vtableInstance.on?.('mouseenter_cell', (args: any) => {
    const { col, row } = args || {}
    const location = vtableInstance.getCellLocation?.(col, row)
    if (location !== 'body') { cellTooltip.value = { ...cellTooltip.value, visible: false }; return }
    const record = vtableInstance.getCellOriginRecord?.(col, row)
    const field = vtableInstance?.getHeaderField?.(col, 0)
    const invalidMessage = record && typeof field === 'string'
      ? getInvalidCellMessage(getRowIdentity(record), field)
      : ''
    if (invalidMessage) {
      const rect =
        vtableInstance.getCellRelativeRect?.(col, row) ?? vtableInstance.getCellRect?.(col, row)
      if (!rect || !vtableRef.value || !tableWrapperRef.value) {
        cellTooltip.value = { ...cellTooltip.value, visible: false }; return
      }
      const wrapperRect = tableWrapperRef.value.getBoundingClientRect()
      const tableRect = vtableRef.value.getBoundingClientRect()
      cellTooltip.value = {
        visible: true,
        content: invalidMessage,
        x: tableRect.left - wrapperRect.left + rect.left + rect.width / 2,
        y: tableRect.top - wrapperRect.top + rect.top
      }
      return
    }
    const value = vtableInstance.getCellValue?.(col, row)
    if (value === undefined || value === null || String(value).trim() === '') {
      cellTooltip.value = { ...cellTooltip.value, visible: false }; return
    }
    const rect =
      vtableInstance.getCellRelativeRect?.(col, row) ?? vtableInstance.getCellRect?.(col, row)
    if (!rect || !vtableRef.value || !tableWrapperRef.value) {
      cellTooltip.value = { ...cellTooltip.value, visible: false }; return
    }
    const wrapperRect = tableWrapperRef.value.getBoundingClientRect()
    const tableRect = vtableRef.value.getBoundingClientRect()
    cellTooltip.value = {
      visible: true,
      content: String(value),
      x: tableRect.left - wrapperRect.left + rect.left + rect.width / 2,
      y: tableRect.top - wrapperRect.top + rect.top
    }
  })

  vtableInstance.on?.('mouseleave_cell', () => {
    cellTooltip.value = { ...cellTooltip.value, visible: false }
  })

  if (isRowReorderEnabled.value) {
    setupRowDragListeners()
  }
}

// ── 侦听器 ──
watch(
  [() => visibleOrderedColumns.value, () => calculationModes.value, () => sortKey.value, () => sortOrder.value],
  () => {
    if (!tablePreferenceReady.value) return
    nextTick(renderVTable)
  }
)

watch(
  () => displayData.value,
  (newData) => {
    if (!tablePreferenceReady.value) return
    if (vtableInstance?.setRecords) {
      const summaryRecord = buildSummaryRecord()
      const records = summaryRecord ? [...newData, summaryRecord] : newData
      vtableInstance.setRecords(records)
    } else {
      nextTick(renderVTable)
    }
  },
  { deep: false }
)

watch(
  () => props.data,
  () => {
    syncIdleData()
    if (props.operationMode === 'idle') {
      selectedRowKeySet.value = new Set()
      emitSelectionChange()
    }
    initializeWorkingState({ preserveSelection: props.operationMode !== 'idle' })
    if (tablePreferenceReady.value) {
      nextTick(renderVTable)
    }
  },
  { deep: true, immediate: true }
)

watch(
  () => props.operationMode,
  (nextMode, prevMode) => {
    cancelActiveEditor()
    if (nextMode === 'idle') {
      initializeWorkingState()
    } else if (prevMode === 'idle') {
      initializeWorkingState({ preserveSelection: nextMode === 'edit' || nextMode === 'delete' })
    }
    emitSelectionChange()
    if (tablePreferenceReady.value) {
      nextTick(renderVTable)
    }
  }
)

watch(
  () => allTreeRowKeys.value.join('|'),
  () => {
    if (!hasTreeData.value) return
    const validKeys = new Set(allTreeRowKeys.value)
    // 树形数据变化时无需额外处理，展开状态由表格内部管理
  }
)

// ── 生命周期 ──
onMounted(async () => {
  document.addEventListener('mousedown', handleGlobalLeftClickCloseHeaderFilter)
  document.addEventListener('mousedown', handleGlobalLeftClickCloseTextOverlay)
  syncIdleData()
  initializeWorkingState()
  await initializeTablePreference()
  tablePreferenceReady.value = true
  nextTick(renderVTable)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleGlobalLeftClickCloseHeaderFilter)
  document.removeEventListener('mousedown', handleGlobalLeftClickCloseTextOverlay)
  clearSaveTimer()
  if (vtableInstance) {
    vtableInstance.release?.()
    vtableInstance = null
  }
})

// ── 导出 ──
// 按当前可见列与过滤结果导出 Excel 文件
const handleExport = async () => {
  try {
    await exportToExcel(visibleOrderedColumns.value, displayData.value, props.name, props.exportSheetName)
  } catch (error) {
    console.error('导出失败', error)
    ElMessage.error(getErrorMessage(error, '导出失败，请稍后重试'))
  }
}
</script>

<style scoped>
.common-table-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.common-table-vtable-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
}

.common-table-loading-mask {
  position: absolute;
  inset: 40px 0 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.7);
  z-index: 18;
  color: #606266;
  font-size: 12px;
  backdrop-filter: blur(1px);
}

.common-table-loading-mask__icon {
  animation: common-table-spin 1s linear infinite;
}

.common-table-editor-overlay {
  position: absolute;
  z-index: 25;
  padding: 0;
  background: #fff;
  border: none;
  border-radius: 0;
  box-shadow: none;
  box-sizing: border-box;
  overflow: hidden;
}

:deep(.common-table-editor-overlay .el-input),
:deep(.common-table-editor-overlay .el-select),
:deep(.common-table-editor-overlay .el-date-editor) {
  width: 100%;
  height: 100%;
}

:deep(.common-table-editor-overlay .el-input__wrapper),
:deep(.common-table-editor-overlay .el-select__wrapper) {
  width: 100%;
  height: 100%;
  min-height: 100%;
  border-radius: 0;
  box-shadow: inset 0 0 0 1px #f59e0b;
}

@keyframes common-table-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.common-table-header-filter-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}

.common-table-header-filter-btn {
  position: absolute;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: #909399;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  opacity: 0.7;
  cursor: pointer;
  padding: 0;
  user-select: none;
  -webkit-user-drag: none;
}

.common-table-header-filter-btn:hover,
.common-table-header-filter-btn.is-active {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
}

:v-deep(.common-table-pagination .el-pagination) {
  font-size: 12px;
}

:v-deep(.common-table-pagination .el-pager li),
:v-deep(.common-table-pagination .btn-prev),
:v-deep(.common-table-pagination .btn-next) {
  min-width: 24px;
  height: 24px;
  line-height: 24px;
}

:v-deep(.common-table-wrapper .el-table) {
  flex: 1;
  min-height: 0;
  font-size: 12px;
}

:v-deep(.common-table-wrapper .el-table__body-wrapper) {
  overflow: auto;
}

.common-table-header-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  white-space: nowrap;
  line-height: 20px;
}

.common-table-header-cell__label {
  color: #606266;
  white-space: nowrap;
  font-size: 12px;
}

.common-table-header-cell__actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.common-table-icon-btn,
.common-table-sort-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #909399;
  cursor: pointer;
  width: 16px;
  height: 16px;
  padding: 0;
  min-width: auto;
  line-height: 1;
}

.common-table-search-icon {
  width: 12px;
  height: 12px;
  display: block;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.common-table-icon-btn.active {
  color: #409eff;
}

.common-table-sort-btn {
  flex-direction: column;
  gap: 2px;
  transition: opacity 0.15s ease;
  opacity: 0.45;
}

.common-table-sort-btn:hover {
  opacity: 0.8;
}

.common-table-sort-btn--active {
  opacity: 1;
}

.sort-icon {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  display: block;
}

.sort-icon-up {
  border-bottom: 5px solid #c0c4cc;
}

.sort-icon-down {
  border-top: 5px solid #c0c4cc;
}

.sort-icon--active.sort-icon-up {
  border-bottom-color: #409eff;
}

.sort-icon--active.sort-icon-down {
  border-top-color: #409eff;
}

:v-deep(.common-table-col-auto .cell) {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:v-deep(.el-table__header-wrapper th.el-table__cell),
:v-deep(.el-table__body-wrapper td.el-table__cell),
:v-deep(.el-table__footer-wrapper td.el-table__cell) {
  padding-top: 4px;
  padding-bottom: 4px;
}

:v-deep(.el-table__header-wrapper th.el-table__cell .cell),
:v-deep(.el-table__body-wrapper td.el-table__cell .cell),
:v-deep(.el-table__footer-wrapper td.el-table__cell .cell) {
  line-height: 20px;
  font-size: 12px;
}

:v-deep(.el-table__header-wrapper th.el-table__cell) {
  background-color: #f5f7fa;
}

:v-deep(.el-table__body tr td.el-table__cell) {
  background-color: #ffffff;
}

:v-deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background-color: #eaf3ff;
}

:v-deep(.el-table__footer tr td.el-table__cell) {
  background-color: #f5f7fa;
  font-weight: 500;
}

:v-deep(.el-table__footer .common-table-summary-value) {
  color: #f56c6c;
}

:v-deep(.el-table__body tr:hover > td.el-table__cell) {
  background-color: #dbeafe;
}

:v-deep(.el-table__body tr.common-table-row-draggable > td.el-table__cell),
:v-deep(.el-table__body tr.common-table-row-draggable > td.el-table__cell .cell) {
  cursor: grab;
  user-select: none;
}

:v-deep(.el-table__body tr.common-table-row-parent > td.el-table__cell),
:v-deep(.el-table--striped .el-table__body tr.common-table-row-parent > td.el-table__cell),
:v-deep(.el-table__body tr.common-table-row-parent:hover > td.el-table__cell) {
  background-color: #eaf3ff;
}

:v-deep(.el-table__body tr.common-table-row-child > td.el-table__cell),
:v-deep(.el-table--striped .el-table__body tr.common-table-row-child.el-table__row--striped > td.el-table__cell),
:v-deep(.el-table__body tr.common-table-row-child:hover > td.el-table__cell) {
  background-color: #ffffff;
}
</style>

<style>
.common-table-filter-popper {
  padding: 0 !important;
}

.common-table-toolbar-popper {
  padding: 8px 12px !important;
}

.common-table-filter-panel {
  padding: 10px 12px 12px;
}

.common-table-filter-panel__toolbar,
.common-table-filter-panel__footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.common-table-filter-panel__toolbar {
  margin-bottom: 10px;
}

.common-table-filter-panel__footer {
  justify-content: flex-end;
  margin-top: 10px;
}

.common-table-filter-panel__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
}

.common-table-filter-panel__option {
  line-height: 1.4;
}

.common-table-filter-btn {
  padding: 6px 14px;
  font-size: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #ffffff;
  color: #606266;
  line-height: 1;
  cursor: pointer;
  position: relative;
}

.common-table-filter-btn:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background: #ecf5ff;
}

.common-table-filter-btn--primary {
  color: #ffffff;
  border-color: #409eff;
  background: #409eff;
}

.common-table-filter-btn--primary:hover {
  color: #ffffff;
  border-color: #66b1ff;
  background: #66b1ff;
}

.common-table-filter-btn--invert:hover {
  color: #e6a23c;
  border-color: #f3d19e;
  background: #fdf6ec;
}

.common-table-filter-btn.has-indicator::after {
  content: '';
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #409eff;
}

.common-table-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  background: linear-gradient(180deg, #fdfdfd 0%, #f7f8fa 100%);
  border-bottom: 1px solid #e5e7eb;
}

.common-table-toolbar-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.common-table-toolbar-divider {
  width: 1px;
  height: 14px;
  background: #dcdfe6;
}

.common-table-toolbar-info {
  display: flex;
  align-items: center;
  min-width: 120px;
  color: #606266;
  font-size: 12px;
}

.common-table-toolbar-spacer {
  flex: 1;
}

.common-table-toolbar-create-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.common-table-toolbar-btn {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
}

.common-table-toolbar-btn:hover:not(:disabled) {
  color: #409eff;
  border-color: #bfdcff;
  background: #f5f9ff;
}

.common-table-toolbar-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.common-table-row-drag-indicator {
  position: absolute;
  z-index: 60;
  height: 2px;
  background: #409eff;
  pointer-events: none;
  border-radius: 1px;
}

.common-table-cell-tooltip {
  position: absolute;
  z-index: 50;
  transform: translateX(-50%) translateY(calc(-100% - 6px));
  max-width: 320px;
  padding: 5px 8px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 12px;
  line-height: 1.5;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.common-table-text-select-overlay {
  position: absolute;
  z-index: 45;
  pointer-events: none;
  background: transparent;
}

.common-table-text-select-overlay__textarea {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0 16px;
  border: none;
  outline: none;
  resize: none;
  overflow: hidden;
  background: transparent;
  color: transparent;
  -webkit-text-fill-color: transparent;
  font-size: 12px;
  line-height: 22px;
  white-space: nowrap;
  user-select: text;
  caret-color: transparent;
  font-family: inherit;
  text-shadow: none;
}

.common-table-text-select-overlay__textarea::selection {
  background: rgba(64, 158, 255, 0.35);
  color: transparent;
}

.common-table-toolbar-popper .el-checkbox__label,
.common-table-filter-panel__option .el-checkbox__label {
  font-size: 12px !important;
}

.common-table-row-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 14px;
  color: #c0c4cc;
  cursor: grab;
  user-select: none;
  line-height: 1;
  border-radius: 3px;
  transition: color 0.15s, background 0.15s;
}

.common-table-row-drag-handle:hover {
  color: #409eff;
  background: #ecf5ff;
}

:v-deep(.common-table-order-drag-col .cell) {
  cursor: grab;
  user-select: none;
}

:v-deep(.common-table-order-drag-col .cell::before) {
  content: '⠿';
  display: inline-block;
  margin-right: 6px;
  color: #c0c4cc;
}

:v-deep(.sortable-ghost) {
  opacity: 0.4;
  background: #e6f0ff !important;
}

:v-deep(.sortable-chosen) {
  background: #f0f7ff !important;
}
</style>
