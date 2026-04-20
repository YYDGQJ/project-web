<template>
  <div ref="tableWrapperRef" class="common-table-wrapper">
    <div class="common-table-toolbar">
      <div v-if="props.name" class="common-table-toolbar-title" :title="props.name">
        {{ props.name }}
      </div>
      <span v-if="props.name" class="common-table-toolbar-divider" aria-hidden="true"></span>
      <div class="common-table-toolbar-switch">
        <span class="common-table-toolbar-switch__label">拖拽列</span>
        <el-switch v-model="dragReorderEnabled" size="small" />
      </div>
      <button type="button" class="common-table-toolbar-btn" @click="resetColumnOrder">恢复默认列顺序</button>
      <button
        v-if="hasTreeData"
        type="button"
        class="common-table-toolbar-btn"
        @click="expandAllTreeRows"
      >
        展开全部
      </button>
      <button
        v-if="hasTreeData"
        type="button"
        class="common-table-toolbar-btn"
        @click="collapseAllTreeRows"
      >
        收起全部
      </button>
      <!-- 列显示 -->
      <el-popover trigger="click" placement="bottom-start" :width="220" popper-class="common-table-toolbar-popper">
        <template #reference>
          <button type="button" class="common-table-toolbar-btn">列显示</button>
        </template>
        <div class="common-table-toolbar-panel">
          <div class="common-table-toolbar-quickbar">
            <button type="button" class="common-table-toolbar-quick-btn" @click="enableAllColumnsVisible">全开</button>
            <button type="button" class="common-table-toolbar-quick-btn" @click="disableAllColumnsVisible">全关</button>
          </div>
          <el-checkbox-group v-model="visibleColumnKeys" class="common-table-toolbar-group">
            <el-checkbox
              v-for="column in orderedEnhancedColumns"
              :key="`visible-${column.key}`"
              :value="column.key"
            >
              {{ column.label }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
      </el-popover>
      <!-- 列筛选-->
      <el-popover trigger="click" placement="bottom-start" :width="220" popper-class="common-table-toolbar-popper">
        <template #reference>
          <button type="button" class="common-table-toolbar-btn">列筛选</button>
        </template>
        <div class="common-table-toolbar-panel">
          <div class="common-table-toolbar-quickbar">
            <button type="button" class="common-table-toolbar-quick-btn" @click="enableAllFilters">全开</button>
            <button type="button" class="common-table-toolbar-quick-btn" @click="disableAllFilters">全关</button>
          </div>
          <el-checkbox-group v-model="filterEnabledKeys" class="common-table-toolbar-group">
            <el-checkbox
              v-for="column in filterableColumns"
              :key="`filter-${column.key}`"
              :value="column.key"
            >
              {{ column.label }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
      </el-popover>
      <!-- 列排序 -->
      <el-popover trigger="click" placement="bottom-start" :width="220" popper-class="common-table-toolbar-popper">
        <template #reference>
          <button type="button" class="common-table-toolbar-btn">列排序</button>
        </template>
        <div class="common-table-toolbar-panel">
          <div class="common-table-toolbar-quickbar">
            <button type="button" class="common-table-toolbar-quick-btn" @click="enableAllSorts">全开</button>
            <button type="button" class="common-table-toolbar-quick-btn" @click="disableAllSorts">全关</button>
          </div>
          <el-checkbox-group v-model="sortEnabledKeys" class="common-table-toolbar-group">
            <el-checkbox
              v-for="column in sortableColumns"
              :key="`sort-${column.key}`"
              :value="column.key"
            >
              {{ column.label }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
      </el-popover>
      <!-- 导出 Excel -->
      <button type="button" class="common-table-toolbar-btn common-table-toolbar-btn--export" @click="exportToExcel">
        导出 Excel
      </button>
    </div>
    <div
      ref="vtableRef"
      class="common-table-vtable-wrapper"
      style="width: 100%; height: 100%;"
      @click="closeHeaderFilterPanel"
    ></div>
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
        @click.stop="openHeaderFilterPanel(anchor.key)"
      >
        <CommonTableSearchIcon class="common-table-search-icon" />
      </button>
    </div>
    <div
      v-if="headerFilterPanelVisible && activeHeaderFilterColumn"
      class="common-table-header-filter-panel"
      :style="headerFilterPanelStyle"
      @click.stop
    >
      <div class="common-table-filter-panel__toolbar">
        <button
          type="button"
          class="common-table-filter-btn"
          @click="selectAllFilters(activeHeaderFilterColumn.key, activeHeaderFilterColumn.filterOptions || [])"
        >
          全选
        </button>
        <button
          type="button"
          class="common-table-filter-btn common-table-filter-btn--invert"
          @click="invertFilters(activeHeaderFilterColumn.key, activeHeaderFilterColumn.filterOptions || [])"
        >
          反选
        </button>
      </div>
      <el-checkbox-group
        :model-value="getDraftFilterValues(activeHeaderFilterColumn.key)"
        class="common-table-filter-panel__group"
        @update:model-value="handleHeaderFilterDraftChange"
      >
        <el-checkbox
          v-for="option in activeHeaderFilterColumn.filterOptions || []"
          :key="`header-filter-value-${activeHeaderFilterColumn.key}-${option.value}`"
          :value="option.value"
          class="common-table-filter-panel__option"
        >
          {{ option.text }}
        </el-checkbox>
      </el-checkbox-group>
      <div class="common-table-filter-panel__footer">
         <button type="button" class="common-table-filter-btn common-table-filter-btn--primary" @click="handleHeaderFilterConfirm">确定</button>
        <button type="button" class="common-table-filter-btn" @click="handleHeaderFilterReset">重置</button>
      </div>
    </div>

    <!-- 单元格悬浮气泡 -->
    <div
      v-if="cellTooltip.visible"
      class="common-table-cell-tooltip"
      :style="{ left: cellTooltip.x + 'px', top: cellTooltip.y + 'px' }"
    >{{ cellTooltip.content }}</div>

    <!-- 行拖拽指示线 -->
    <div
      v-if="rowDragIndicator.visible"
      class="common-table-row-drag-indicator"
      :style="{ top: rowDragIndicator.top + 'px', left: rowDragIndicator.left + 'px', width: rowDragIndicator.width + 'px' }"
    ></div>

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

    <div v-if="isPaginationEnabled" class="common-table-pagination">
      <div class="common-table-pagination-left">
        <div v-if="activeFilterSummaries.length" class="common-table-filter-summary-list">
          <div
            v-for="summary in activeFilterSummaries"
            :key="`filter-summary-${summary.key}`"
            class="common-table-filter-summary-item"
          >
            <span class="common-table-filter-summary-item__field">{{ summary.label }}:</span>
            <span
              class="common-table-filter-summary-item__values"
              :title="summary.valuesText"
            >{{ summary.valuesText }}</span>
            <button
              type="button"
              class="common-table-filter-summary-item__close"
              @click="clearFilterSummary(summary.key)"
            >×</button>
          </div>
        </div>
      </div>
      <div class="common-table-pagination-right">
        <span class="common-table-pagination-total">共{{ props.total }}条</span>
        <el-config-provider :locale="zhCn">
          <el-pagination
            small
            background
            :current-page="internalCurrentPage"
            :page-size="internalPageSize"
            :page-sizes="props.pageSizes"
            :layout="resolvedPaginationLayout"
            :total="props.total"
            @current-change="handleCurrentPageChange"
            @size-change="handlePageSizeChange"
          />
        </el-config-provider>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import CommonTableSearchIcon from './icons/CommonTableSearchIcon.vue'
import { computed, ref, h, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as XLSX from 'xlsx'
import {
  loadCommonTablePreference,
  saveCommonTablePreference,
  type CommonTablePreference
} from '../common/tablePreference'
import * as VTable from '@visactor/vtable';

// 依赖函数必须在所有 setup 变量和 computed 之前声明
function getColumnKey(column: CommonTableColumn) {
  return column.columnKey ?? column.prop ?? column.label
}

const isFilterPrimitive = (value: unknown): value is FilterValue => {
  return ['string', 'number', 'boolean'].includes(typeof value)
}

function buildAutoFilters(prop?: string) {
  if (!prop) return undefined
  const uniqueValues = Array.from(
    new Set(
      props.data
        .map((row) => row?.[prop])
        .filter((value) => value !== undefined && value !== null && isFilterPrimitive(value))
    )
  ) as FilterValue[]
  if (!uniqueValues.length) return undefined
  const formatFilterOptionText = (value: FilterValue) =>
    typeof value === 'boolean' ? (value ? '是' : '否') : String(value)
  return uniqueValues.map((value) => ({ text: formatFilterOptionText(value), value }))
}


// 声明 props（必须在所有依赖 props 的变量前）
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
    paginationLayout: 'total, prev, pager, next, sizes'
  }
)
const route = useRoute()
const filterPopoverVisible = ref<Record<string, boolean>>({})
const appliedFilterState = ref<Record<string, FilterValue[]>>({})
const draftFilterState = ref<Record<string, FilterValue[]>>({})
const tableRef = ref<{ doLayout?: () => void; toggleRowExpansion?: (row: any, expanded: boolean) => void } | null>(null)
const sortKey = ref<string | null>(props.defaultSort?.prop ?? null)
const sortOrder = ref<'ascending' | 'descending' | null>(props.defaultSort?.order ?? null)
const calculationModes = ref<Record<string, CalculationMode>>({})
const filterEnabledKeys = ref<string[]>([])
const sortEnabledKeys = ref<string[]>([])
const dragReorderEnabled = ref(false)
const draggingColumnKey = ref<string | null>(null)
const dragOverColumnKey = ref<string | null>(null)
const dragInsertSide = ref<'left' | 'right' | null>(null)
const columnOrderKeys = ref<string[]>([])
const visibleColumnKeys = ref<string[]>([])
const resizedColumnWidths = ref<Record<string, number>>({})
const expandedTreeRowKeys = ref<Array<string | number>>([])
const vtableHierarchyExpandLevel = ref(1)
const tablePreferenceReady = ref(false)
const applyingTablePreference = ref(false)
const rowDragIndicator = ref<{ visible: boolean; top: number; left: number; width: number }>({
  visible: false, top: 0, left: 0, width: 0
})
let rowDragState: { active: boolean; dragging: boolean; sourceRow: number; sourceCol: number; startX: number; startY: number } | null = null
let rowDragMoveHandler: ((e: MouseEvent) => void) | null = null
let rowDragUpHandler: ((e: MouseEvent) => void) | null = null
let tablePreferenceSaveTimer: ReturnType<typeof window.setTimeout> | null = null
const internalRowKeyMap = new WeakMap<object, string>()
let internalRowKeySeed = 0

// 依赖函数提前声明，避免初始化顺序问题
const filterEnabledSet = computed(() => new Set(filterEnabledKeys.value))
const sortEnabledSet = computed(() => new Set(sortEnabledKeys.value))

const isColumnFilterEnabled = (columnKey: string) => {
  return filterEnabledSet.value.has(columnKey)
}

const isColumnSortEnabled = (columnKey: string) => {
  return sortEnabledSet.value.has(columnKey)
}

const enhancedColumns = computed<EnhancedColumn[]>(() => {
  return props.columns.map((column) => {
    const key = getColumnKey(column)
    const filterOptions = buildAutoFilters(column.prop)
    return {
      ...column,
      key,
      filterOptions,
      canSort: Boolean(column.prop),
      isSortable: Boolean(column.prop) && isColumnSortEnabled(key)
    }
  })
})
const orderedEnhancedColumns = computed<EnhancedColumn[]>(() => {
  const columnMap = new Map(enhancedColumns.value.map((column) => [column.key, column]))
  return columnOrderKeys.value
    .map((key) => columnMap.get(key))
    .filter((column): column is EnhancedColumn => Boolean(column))
})
const visibleColumnSet = computed(() => new Set(visibleColumnKeys.value))
const visibleOrderedColumns = computed<EnhancedColumn[]>(() => {
  return orderedEnhancedColumns.value.filter((column) => visibleColumnSet.value.has(column.key))
})
const displayData = computed(() => {
  let rows = props.data.slice()
  orderedEnhancedColumns.value.forEach((column) => {
    const selectedValues = getAppliedFilterValues(column.key)
    if (!selectedValues.length || !column.prop || !isColumnFilterEnabled(column.key)) {
      return
    }
    const filterMethod = column.filterMethod ?? defaultFilterMethod
    rows = rows.filter((row) =>
      selectedValues.some((value) =>
        filterMethod(value, row, { property: column.prop })
      )
    )
  })
  if (!sortKey.value || !sortOrder.value || !isColumnSortEnabled(sortKey.value)) {
    return rows
  }
  const sortColumn = getEnhancedColumn(sortKey.value)
  if (!sortColumn) return rows
  const factor = sortOrder.value === 'descending' ? -1 : 1
  return rows.slice().sort((a, b) => {
    if (sortColumn.sortMethod) {
      return sortColumn.sortMethod(a, b) * factor
    }
    const aVal = getSortValue(a, sortColumn, 0)
    const bVal = getSortValue(b, sortColumn, 1)
    return compareValues(aVal, bVal) * factor
  })
})

const vtableRef = ref<HTMLElement | null>(null);
const tableWrapperRef = ref<HTMLElement | null>(null);
let vtableInstance: any = null;
const cellTooltip = ref<{ visible: boolean; content: string; x: number; y: number }>({
  visible: false,
  content: '',
  x: 0,
  y: 0,
});
const textSelectTextareaRef = ref<HTMLTextAreaElement | null>(null)
const textSelectOverlay = ref<{
  visible: boolean
  text: string
  left: number
  top: number
  width: number
  height: number
}>({
  visible: false,
  text: '',
  left: 0,
  top: 0,
  width: 0,
  height: 0
})
const textSelectDragState = ref<{
  active: boolean
  anchorIndex: number
  contentLeftClient: number
  contentWidth: number
}>({
  active: false,
  anchorIndex: 0,
  contentLeftClient: 0,
  contentWidth: 0
})
const suppressNextTextOverlayGlobalClose = ref(false)
const TOOLBAR_FONT_SIZE = 12;
const CALC_MENU_PREFIX = 'calc-mode-';
const HEADER_FILTER_ICON_SIZE = 16;
const HEADER_FILTER_PANEL_WIDTH = 250;
const VTABLE_CELL_PADDING_LEFT = 16; // VTable default cell left padding
const VTABLE_CELL_PADDING_RIGHT = 16; // VTable default cell right padding
const VTABLE_SORT_ICON_TOTAL_WIDTH = 19; // sort icon width (16) + marginLeft (3)

type VTableSortOrder = 'asc' | 'desc' | 'normal';

const toVTableSortOrder = (order: 'ascending' | 'descending' | null): VTableSortOrder => {
  if (order === 'ascending') return 'asc';
  if (order === 'descending') return 'desc';
  return 'normal';
};

const fromVTableSortOrder = (order: string): 'ascending' | 'descending' | null => {
  const normalized = String(order).toLowerCase();
  if (normalized === 'asc') return 'ascending';
  if (normalized === 'desc') return 'descending';
  return null;
};

const getColumnByField = (field: unknown) => {
  if (typeof field !== 'string' && typeof field !== 'number') {
    return undefined;
  }
  const fieldText = String(field);
  return enhancedColumns.value.find((column) => column.prop === fieldText);
};

const getColumnKeyByField = (field: unknown): string | null => {
  return getColumnByField(field)?.key ?? null;
};

const getVisibleFilterColumnKeys = () => {
  return visibleOrderedColumns.value
    .filter(
      (column) =>
        Boolean(column.prop) &&
        isColumnFilterEnabled(column.key) &&
        Boolean(column.filterOptions?.length)
    )
    .map((column) => column.key);
};

const getSummaryCellText = (column: EnhancedColumn, index: number) => {
  if (!column.prop) {
    return '';
  }
  const mode = getCalculationMode(column.key);
  if (mode === 'none') {
    return '';
  }
  const values: number[] = [];
  displayData.value.forEach((row) => {
    const value = toNumber(row?.[column.prop as string]);
    if (value !== null) {
      values.push(value);
    }
  });
  if (!values.length) {
    return '';
  }
  let result: number | null = null;
  let formatted: string | null = null;
  if (mode === 'sum') {
    result = values.reduce((acc, value) => acc + value, 0);
  } else if (mode === 'avg') {
    result = values.reduce((acc, value) => acc + value, 0) / values.length;
    formatted = formatAverage(result);
  } else if (mode === 'min') {
    result = Math.min(...values);
  } else if (mode === 'max') {
    result = Math.max(...values);
  }
  if (result === null || Number.isNaN(result)) {
    return '';
  }
  const label = calculationModeLabels[mode];
  const valueText = formatted ?? `${result}`;
  return label ? `${label}: ${valueText}` : valueText;
};

const buildSummaryRecord = () => {
  if (!showSummaryRow.value) {
    return null;
  }
  const summaryRecord: Record<string, string> = {};
  visibleOrderedColumns.value.forEach((column, index) => {
    if (!column.prop) {
      return;
    }
    summaryRecord[column.prop] = getSummaryCellText(column, index);
  });
  return summaryRecord;
};

const buildContextMenuItems = (field: unknown, row: number, col: number, table?: any) => {
  const cellLocation = table?.getCellLocation?.(col, row);
  if (cellLocation !== 'columnHeader') {
    if (cellLocation !== 'body') {
      return [];
    }
    return [{ text: '复制单元格', menuKey: 'copy-cell' }];
  }
  const column = getColumnByField(field);
  if (!column) {
    return [];
  }

  const menuItems: Array<{ text: string; menuKey: string; type?: 'item' | 'split' | 'title'; disabled?: boolean }> = [];

  if (props.calculationEnabled) {
    menuItems.push({ text: '计算方式', menuKey: 'calc-title', type: 'title' });
    menuItems.push({ text: '无', menuKey: `${CALC_MENU_PREFIX}none` });
    menuItems.push({ text: '求和', menuKey: `${CALC_MENU_PREFIX}sum` });
    menuItems.push({ text: '平均值', menuKey: `${CALC_MENU_PREFIX}avg` });
    menuItems.push({ text: '最小值', menuKey: `${CALC_MENU_PREFIX}min` });
    menuItems.push({ text: '最大值', menuKey: `${CALC_MENU_PREFIX}max` });
  }

  return menuItems;
};

// 构建 VTable columns 配置，补充必需属性
const buildVTableOption = () => {
  // 过滤掉没有 prop 的列，并确保类型正确
  const filteredColumns = visibleOrderedColumns.value.filter(col => col.prop)
  const validColumns = filteredColumns
    .map((col, idx) => ({
      field: col.prop as string, // 断言为 string
      caption: col.label,
      width: getResolvedColumnWidth(col),
      minWidth: getResolvedColumnMinWidth(col),
      sort: isColumnSortEnabled(col.key),
      showSort: isColumnSortEnabled(col.key),
      dragHeader: dragReorderEnabled.value,
      cellType: 'text' as const, // 使用 as const 确保类型为字面量
      tree: hasTreeData.value && idx === 0 ? true : undefined,
    }));

  const summaryRecord = buildSummaryRecord();
  const records = summaryRecord ? [...displayData.value, summaryRecord] : displayData.value;
  const dragHeaderMode: 'all' | 'column' | 'row' | 'none' =
    dragReorderEnabled.value && isRowReorderEnabled.value
      ? 'all'
      : dragReorderEnabled.value
      ? 'column'
      : isRowReorderEnabled.value
      ? 'row'
      : 'none';

  const sortColumn = sortKey.value ? getEnhancedColumn(sortKey.value) : null;
  const sortState = sortColumn?.prop
    ? {
        field: sortColumn.prop,
        order: toVTableSortOrder(sortOrder.value)
      }
    : undefined;

  return {
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
      textStyle: {
        fontSize: TOOLBAR_FONT_SIZE,
        color: '#909399'
      }
    },
    rowHierarchyType: hasTreeData.value ? 'tree' as const : undefined,
    hierarchyExpandLevel: hasTreeData.value ? vtableHierarchyExpandLevel.value : undefined,
    hierarchyIndent: 16,
    defaultHeaderRowHeight: 22,
    defaultRowHeight: 22,
    bottomFrozenRowCount: summaryRecord ? 1 : 0,
    dragOrder: {
      dragHeaderMode,
      validateDragOrderOnEnd: validateVTableDragOrder
    },
    resize: {
      columnResizeMode: 'all' as const
    },
    menu: {
      contextMenuItems: buildContextMenuItems,
      contextMenuWorkOnlyCell: true,
    },
    select: {
      disableSelect: true,
    },
    theme: {
      headerStyle: {
        fontSize: TOOLBAR_FONT_SIZE,
        color: '#606266',
        borderColor: '#e0e3e9',
      },
      bodyStyle: {
        fontSize: TOOLBAR_FONT_SIZE,
        lineHeight: 16,
        borderColor: '#e0e3e9',
      },
      bottomFrozenStyle: {
        color: '#f56c6c',
        fontSize: TOOLBAR_FONT_SIZE,
        lineHeight: 16,
      },
      selectionStyle: {
        cellBorderColor: 'transparent',
        cellBgColor: 'transparent',
        inlineColumnBgColor: 'transparent',
        inlineRowBgColor: 'transparent',
      },
      columnResize: {
        labelVisible: false,
      },
      scrollStyle: {
        barToSide: true,
        hoverOn: false,
      },
    },
    frameStyle: {
      borderColor: '#e0e3e9',
    },
    widthMode: 'standard' as const,
    heightMode: 'standard' as const,
    autoFillWidth: true,
    autoFillHeight: false,
    containerFit: {
      width: false,
      height: true
    },
    height: resolvedHeight.value,
  };
};
const renderVTable = () => {
  if (!vtableRef.value) return;
  if (vtableInstance) {
    vtableInstance.release && vtableInstance.release();
    vtableInstance = null;
  }
  vtableInstance = new VTable.ListTable(vtableRef.value, buildVTableOption());
  nextTick(() => {
    updateHeaderFilterAnchors();
  });

  vtableInstance.on?.('dropdown_menu_click', (args: any) => {
    const columnKey = getColumnKeyByField(args?.field);
    if (!columnKey) {
      return;
    }

    const menuKey = String(args?.menuKey || '');
    if (menuKey.startsWith(CALC_MENU_PREFIX)) {
      const nextMode = menuKey.slice(CALC_MENU_PREFIX.length) as CalculationMode;
      updateCalculationMode(columnKey, nextMode);
      nextTick(renderVTable);
    }
  });

  vtableInstance.on?.('dropdown_menu_click', (args: any) => {
    const menuKey = String(args?.menuKey || '');
    if (menuKey === 'copy-cell') {
      const cellValue = vtableInstance?.getCellValue?.(args?.col, args?.row);
      if (cellValue !== undefined && cellValue !== null) {
        navigator.clipboard?.writeText(String(cellValue)).catch(() => {});
      }
    }
  });

  vtableInstance.on?.('change_header_position', (args: any) => {
    if (args?.movingColumnOrRow === 'row') {
      handleVTableRowReorder(args);
      return;
    }

    const fieldToKey = new Map(
      enhancedColumns.value
        .filter((column) => column.prop)
        .map((column) => [String(column.prop), column.key])
    );

    const reorderedVisibleKeys: string[] = [];
    const totalColCount = Number(vtableInstance?.colCount || 0);
    for (let index = 0; index < totalColCount; index += 1) {
      const field = vtableInstance?.getHeaderField?.(index, 0);
      const key = fieldToKey.get(String(field));
      if (key) {
        reorderedVisibleKeys.push(key);
      }
    }

    if (!reorderedVisibleKeys.length) {
      return;
    }

    const visibleSet = new Set(visibleOrderedColumns.value.map((column) => column.key));
    const untouched = columnOrderKeys.value.filter((key) => !visibleSet.has(key));
    columnOrderKeys.value = [...reorderedVisibleKeys, ...untouched];
    updateHeaderFilterAnchors();
  });

  vtableInstance.on?.('resize_column_end', (args: any) => {
    const resizedColumns = visibleOrderedColumns.value.filter((column) => column.prop)
    const col = Number(args?.col)
    if (!Number.isFinite(col) || col < 0 || col >= resizedColumns.length) {
      return
    }

    const targetColumn = resizedColumns[col]
    const nextWidth = Number(args?.colWidths?.[col] ?? vtableInstance?.getColWidth?.(col))
    if (!Number.isFinite(nextWidth) || nextWidth <= 0) {
      return
    }

    handleColumnResizeEnd(nextWidth, resizedColumnWidths.value[targetColumn.key] ?? nextWidth, {
      columnKey: targetColumn.key,
      label: targetColumn.label
    })
  })

  vtableInstance.on?.('after_sort', (args: any) => {
    const columnKey = getColumnKeyByField(args?.field);
    if (!columnKey || !isColumnSortEnabled(columnKey)) {
      sortKey.value = null;
      sortOrder.value = null;
      return;
    }
    sortKey.value = columnKey;
    sortOrder.value = fromVTableSortOrder(args?.order);
    updateHeaderFilterAnchors();
  });

  vtableInstance.on?.('scroll', () => {
    cellTooltip.value = { ...cellTooltip.value, visible: false };
    hideTextSelectOverlay();
    updateHeaderFilterAnchors();
  });

  vtableInstance.on?.('mousedown_cell', (args: any) => {
    startTextSelectionOverlay(args)
  })

  if (isRowReorderEnabled.value) {
    if (rowDragMoveHandler) document.removeEventListener('mousemove', rowDragMoveHandler)
    if (rowDragUpHandler) document.removeEventListener('mouseup', rowDragUpHandler)
    rowDragState = null

    rowDragMoveHandler = (e: MouseEvent) => {
      if (!rowDragState) return
      const dx = e.clientX - rowDragState.startX
      const dy = e.clientY - rowDragState.startY
      if (!rowDragState.dragging && Math.sqrt(dx * dx + dy * dy) < 5) return
      rowDragState.dragging = true

      if (!vtableInstance || !vtableRef.value || !tableWrapperRef.value) return
      const tableRect = vtableRef.value.getBoundingClientRect()
      const relX = e.clientX - tableRect.left
      const relY = e.clientY - tableRect.top
      const cell = vtableInstance.getCellAtRelativePosition?.(relX, relY)
      if (!cell) { rowDragIndicator.value = { ...rowDragIndicator.value, visible: false }; return }
      const loc = vtableInstance.getCellLocation?.(cell.col, cell.row)
      if (loc !== 'body') { rowDragIndicator.value = { ...rowDragIndicator.value, visible: false }; return }
      const cellRect = vtableInstance.getCellRelativeRect?.(cell.col, cell.row) ?? vtableInstance.getCellRect?.(cell.col, cell.row)
      if (!cellRect) return
      const wrapperRect = tableWrapperRef.value.getBoundingClientRect()
      const insertAfter = cell.row >= rowDragState.sourceRow
      const lineTop = tableRect.top - wrapperRect.top + cellRect.top + (insertAfter ? cellRect.height : 0)
      rowDragIndicator.value = { visible: true, top: lineTop, left: tableRect.left - wrapperRect.left, width: tableRect.width }
    }

    rowDragUpHandler = (e: MouseEvent) => {
      document.removeEventListener('mousemove', rowDragMoveHandler!)
      document.removeEventListener('mouseup', rowDragUpHandler!)
      rowDragIndicator.value = { ...rowDragIndicator.value, visible: false }
      const state = rowDragState
      rowDragState = null
      if (!state?.dragging || !vtableInstance || !vtableRef.value) return
      const tableRect = vtableRef.value.getBoundingClientRect()
      const relX = e.clientX - tableRect.left
      const relY = e.clientY - tableRect.top
      const cell = vtableInstance.getCellAtRelativePosition?.(relX, relY)
      if (!cell) return
      const loc = vtableInstance.getCellLocation?.(cell.col, cell.row)
      if (loc !== 'body' || cell.row === state.sourceRow) return
      handleVTableRowReorder({ source: { col: state.sourceCol, row: state.sourceRow }, target: { col: cell.col, row: cell.row } })
    }

    vtableInstance.on?.('mousedown_cell', (args: any) => {
      if (!isRowReorderEnabled.value) return
      const { col, row } = args || {}
      const location = vtableInstance.getCellLocation?.(col, row)
      if (location !== 'body') return
      const event = args?.event as MouseEvent | undefined
      if (!event || event.button !== 0) return
      rowDragState = { active: true, dragging: false, sourceRow: row, sourceCol: col, startX: event.clientX, startY: event.clientY }
      document.addEventListener('mousemove', rowDragMoveHandler!)
      document.addEventListener('mouseup', rowDragUpHandler!)
    })
  }

  vtableInstance.on?.('mouseenter_cell', (args: any) => {
    const { col, row } = args || {};
    const location = vtableInstance.getCellLocation?.(col, row);
    if (location !== 'body') {
      cellTooltip.value = { ...cellTooltip.value, visible: false };
      return;
    }
    const value = vtableInstance.getCellValue?.(col, row);
    if (value === undefined || value === null || String(value).trim() === '') {
      cellTooltip.value = { ...cellTooltip.value, visible: false };
      return;
    }
    const rect = (vtableInstance.getCellRelativeRect?.(col, row))
      ?? (vtableInstance.getCellRect?.(col, row));
    if (!rect || !vtableRef.value || !tableWrapperRef.value) {
      cellTooltip.value = { ...cellTooltip.value, visible: false };
      return;
    }
    const wrapperRect = tableWrapperRef.value.getBoundingClientRect();
    const tableRect = vtableRef.value.getBoundingClientRect();
    const x = tableRect.left - wrapperRect.left + rect.left + rect.width / 2;
    const y = tableRect.top - wrapperRect.top + rect.top;
    cellTooltip.value = {
      visible: true,
      content: String(value),
      x,
      y,
    };
  });

  vtableInstance.on?.('mouseleave_cell', () => {
    cellTooltip.value = { ...cellTooltip.value, visible: false };
  });
};

onMounted(async () => {
  await initializeTablePreference()
  tablePreferenceReady.value = true
  nextTick(renderVTable);
});

watch([
  () => visibleOrderedColumns.value,
  () => dragReorderEnabled.value,
  () => calculationModes.value,
  () => sortKey.value,
  () => sortOrder.value
], () => {
  if (!tablePreferenceReady.value) {
    return
  }
  nextTick(renderVTable);
});

// 数据变化时只更新记录，不重建 VTable（避免树形展开状态重置）
watch(
  () => displayData.value,
  (newData) => {
    if (!tablePreferenceReady.value) {
      return
    }
    if (vtableInstance?.setRecords) {
      const summaryRecord = buildSummaryRecord()
      const records = summaryRecord ? [...newData, summaryRecord] : newData
      vtableInstance.setRecords(records)
    } else {
      nextTick(renderVTable)
    }
  },
  { deep: false }
);

const headerFilterAnchors = ref<Array<{ key: string; left: number; top: number }>>([])
const headerFilterPanelVisible = ref(false)
const headerFilterPanelKey = ref<string | null>(null)

const activeHeaderFilterColumn = computed(() => {
  if (!headerFilterPanelKey.value) {
    return null
  }
  return enhancedColumns.value.find((column) => column.key === headerFilterPanelKey.value) ?? null
})

const headerFilterPanelStyle = computed(() => {
  const anchor = headerFilterAnchors.value.find((item) => item.key === headerFilterPanelKey.value)
  const containerWidth = vtableRef.value?.clientWidth ?? 0
  const left = anchor ? Math.max(8, Math.min(anchor.left - HEADER_FILTER_PANEL_WIDTH + 18, containerWidth - HEADER_FILTER_PANEL_WIDTH - 8)) : 8
  const top = anchor ? anchor.top + HEADER_FILTER_ICON_SIZE + 8 : 32
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${HEADER_FILTER_PANEL_WIDTH}px`
  }
})

const updateHeaderFilterAnchors = () => {
  if (!vtableInstance || !vtableRef.value) {
    headerFilterAnchors.value = []
    return
  }

  const visibleFilterKeys = new Set(getVisibleFilterColumnKeys())
  const anchors: Array<{ key: string; left: number; top: number }> = []

  const containerOffsetLeft = vtableRef.value.offsetLeft || 0
  const containerOffsetTop = vtableRef.value.offsetTop || 0

  visibleOrderedColumns.value
    .filter((column) => column.prop)
    .forEach((column) => {
      if (!visibleFilterKeys.has(column.key)) {
        return
      }

      const colIndex = vtableInstance.getTableIndexByField?.(column.prop)
      if (!Number.isFinite(colIndex) || colIndex < 0) {
        return
      }

      let headerRowIndex = 0
      for (let r = 0; r <= 3; r += 1) {
        if (vtableInstance.getCellLocation?.(colIndex, r) === 'columnHeader') {
          headerRowIndex = r
          break
        }
      }

      const rect =
        vtableInstance.getCellRelativeRect?.(colIndex, headerRowIndex) ??
        vtableInstance.getCellRect?.(colIndex, headerRowIndex)
      if (!rect) {
        return
      }
      const filterLeft = containerOffsetLeft + rect.left
        + VTABLE_CELL_PADDING_LEFT
        + measureLabelWidth12(column.label || '')
        + (isColumnSortEnabled(column.key) ? VTABLE_SORT_ICON_TOTAL_WIDTH : 0)
      anchors.push({
        key: column.key,
        left: Math.max(4, filterLeft),
        top: Math.max(2, containerOffsetTop + rect.top + Math.floor((rect.height - HEADER_FILTER_ICON_SIZE) / 2))
      })
    })

  headerFilterAnchors.value = anchors

  if (
    headerFilterPanelKey.value &&
    !anchors.some((anchor) => anchor.key === headerFilterPanelKey.value)
  ) {
    closeHeaderFilterPanel()
  }
}

const openHeaderFilterPanel = (columnKey: string) => {
  headerFilterPanelKey.value = columnKey
  setDraftFilterValues(columnKey, getAppliedFilterValues(columnKey))
  headerFilterPanelVisible.value = true
}

const closeHeaderFilterPanel = () => {
  headerFilterPanelVisible.value = false
  headerFilterPanelKey.value = null
}

const hideTextSelectOverlay = () => {
  textSelectOverlay.value = {
    ...textSelectOverlay.value,
    visible: false,
    text: ''
  }
  textSelectDragState.value = {
    ...textSelectDragState.value,
    active: false
  }
}

const extractClientX = (args: any): number | null => {
  const evt = args?.event?.nativeEvent ?? args?.event ?? null
  if (typeof evt?.clientX === 'number') {
    return evt.clientX
  }
  return null
}

const resolveSelectionIndex = (text: string, clientX: number, contentLeftClient: number, contentWidth: number) => {
  if (!text.length || contentWidth <= 0) {
    return 0
  }
  const ratio = Math.min(1, Math.max(0, (clientX - contentLeftClient) / contentWidth))
  return Math.round(text.length * ratio)
}

const applyOverlaySelection = (start: number, end: number) => {
  const input = textSelectTextareaRef.value
  if (!input) {
    return
  }
  const from = Math.min(start, end)
  const to = Math.max(start, end)
  input.focus({ preventScroll: true })
  input.setSelectionRange(from, to)
}

const handleTextSelectDragMove = (event: MouseEvent) => {
  if (!textSelectDragState.value.active || !textSelectOverlay.value.visible) {
    return
  }
  const endIndex = resolveSelectionIndex(
    textSelectOverlay.value.text,
    event.clientX,
    textSelectDragState.value.contentLeftClient,
    textSelectDragState.value.contentWidth
  )
  applyOverlaySelection(textSelectDragState.value.anchorIndex, endIndex)
}

const handleTextSelectDragEnd = () => {
  textSelectDragState.value = {
    ...textSelectDragState.value,
    active: false
  }
  document.removeEventListener('mousemove', handleTextSelectDragMove)
  document.removeEventListener('mouseup', handleTextSelectDragEnd)
}

const startTextSelectionOverlay = (args: any) => {
  if (!vtableInstance || !vtableRef.value || !tableWrapperRef.value) {
    return
  }
  // 行拖拽激活时不启动文字选择
  if (rowDragState?.active) {
    return
  }
  const mouseButton = args?.event?.button ?? args?.button ?? 0
  if (mouseButton !== 0) {
    return
  }
  const { col, row } = args || {}
  const location = vtableInstance.getCellLocation?.(col, row)
  if (location !== 'body') {
    hideTextSelectOverlay()
    return
  }
  const rawValue = vtableInstance.getCellValue?.(col, row)
  if (rawValue === undefined || rawValue === null) {
    hideTextSelectOverlay()
    return
  }
  const text = String(rawValue)
  if (!text.trim()) {
    hideTextSelectOverlay()
    return
  }
  const rect = vtableInstance.getCellRelativeRect?.(col, row) ?? vtableInstance.getCellRect?.(col, row)
  if (!rect) {
    hideTextSelectOverlay()
    return
  }

  const wrapperRect = tableWrapperRef.value.getBoundingClientRect()
  const tableRect = vtableRef.value.getBoundingClientRect()
  const cellLeftClient = tableRect.left + rect.left
  const cellWidth = rect.width
  const contentLeftClient = cellLeftClient + VTABLE_CELL_PADDING_LEFT
  const contentWidth = Math.max(1, cellWidth - VTABLE_CELL_PADDING_LEFT - VTABLE_CELL_PADDING_RIGHT)
  const left = cellLeftClient - wrapperRect.left
  const top = tableRect.top - wrapperRect.top + rect.top
  const clientX = extractClientX(args) ?? (cellLeftClient + cellWidth / 2)
  const anchorIndex = resolveSelectionIndex(text, clientX, contentLeftClient, contentWidth)

  textSelectOverlay.value = {
    visible: true,
    text,
    left,
    top,
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height)
  }
  textSelectDragState.value = {
    active: true,
    anchorIndex,
    contentLeftClient,
    contentWidth
  }
  suppressNextTextOverlayGlobalClose.value = true
  setTimeout(() => {
    suppressNextTextOverlayGlobalClose.value = false
  }, 0)
  cellTooltip.value = { ...cellTooltip.value, visible: false }

  nextTick(() => {
    applyOverlaySelection(anchorIndex, anchorIndex)
  })

  document.removeEventListener('mousemove', handleTextSelectDragMove)
  document.removeEventListener('mouseup', handleTextSelectDragEnd)
  document.addEventListener('mousemove', handleTextSelectDragMove)
  document.addEventListener('mouseup', handleTextSelectDragEnd)
}

const handleGlobalLeftClickCloseHeaderFilter = (event: MouseEvent) => {
  if (event.button !== 0 || !headerFilterPanelVisible.value) {
    return
  }
  const target = event.target as HTMLElement | null
  if (target?.closest('.common-table-header-filter-panel')) {
    return
  }
  if (target?.closest('.common-table-header-filter-btn')) {
    return
  }
  closeHeaderFilterPanel()
}

const handleGlobalLeftClickCloseTextOverlay = (event: MouseEvent) => {
  if (event.button !== 0 || !textSelectOverlay.value.visible) {
    return
  }
  if (suppressNextTextOverlayGlobalClose.value) {
    return
  }
  const target = event.target as HTMLElement | null
  if (target?.closest('.common-table-text-select-overlay')) {
    return
  }
  hideTextSelectOverlay()
}

const handleHeaderFilterDraftChange = (values: FilterValue[]) => {
  if (!activeHeaderFilterColumn.value) {
    return
  }
  updateDraftFilterValues(activeHeaderFilterColumn.value.key, values)
}

const handleHeaderFilterReset = () => {
  if (!activeHeaderFilterColumn.value) {
    return
  }
  resetFilters(activeHeaderFilterColumn.value.key)
}

const handleHeaderFilterConfirm = () => {
  if (!activeHeaderFilterColumn.value) {
    return
  }
  confirmFilters(activeHeaderFilterColumn.value.key)
  closeHeaderFilterPanel()
}

export interface CommonTableColumn {
  prop?: string
  label: string
  width?: string | number
  minWidth?: string | number
  align?: 'left' | 'center' | 'right'
  slotName?: string
  className?: string
  showOverflowTooltip?: boolean
  sortable?: boolean | 'custom'
  sortMethod?: (a: any, b: any) => number
  sortBy?: string | string[] | ((row: any, index: number) => any)
  sortOrders?: Array<'ascending' | 'descending' | null>
  filters?: Array<{ text: string; value: string | number | boolean }>
  filterMethod?: (value: string | number | boolean, row: any, column: any) => boolean
  filterPlacement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'
  filterMultiple?: boolean
  filteredValue?: Array<string | number | boolean>
  columnKey?: string
  formatter?: (row: any, column: any, cellValue: any, index: number) => string
}

// EnhancedColumn 继承 CommonTableColumn，保留所有外部属性
interface EnhancedColumn extends CommonTableColumn {
  key: string
  filterOptions?: Array<{ text: string; value: FilterValue }>
  canSort: boolean
  isSortable: boolean
}

type FilterValue = string | number | boolean

type CommonTableSortConfig = {
  prop: string
  order: 'ascending' | 'descending' | null
}

type CalculationMode = 'none' | 'sum' | 'avg' | 'min' | 'max'

const calculationModeLabels: Record<CalculationMode, string> = {
  none: '',
  sum: '求和',
  avg: '平均值',
  min: '最小值',
  max: '最大值'
}

// 只允许外部传递基础信息，功能性由内部控制

// （已在前面声明 props，这里移除重复声明）

const emit = defineEmits<{
  'row-reorder': [data: any[]]
  'update:currentPage': [value: number]
  'update:pageSize': [value: number]
  'pagination-change': [payload: { currentPage: number; pageSize: number; reason: 'page' | 'size' | 'reset' }]
}>()

const internalCurrentPage = ref(props.currentPage)
const internalPageSize = ref(props.pageSizes[0] ?? 100)
const pendingPaginationReload = ref(false)
const isPaginationEnabled = computed(() => props.paginationEnabled !== false)

const handleCurrentPageChange = (value: number) => {
  internalCurrentPage.value = value
  pendingPaginationReload.value = true
  emit('update:currentPage', value)
  emit('pagination-change', {
    currentPage: value,
    pageSize: internalPageSize.value,
    reason: 'page'
  })
}

const handlePageSizeChange = (value: number) => {
  internalPageSize.value = value
  if (internalCurrentPage.value !== 1) {
    internalCurrentPage.value = 1
  }
  pendingPaginationReload.value = true
  emit('update:pageSize', value)
  emit('pagination-change', {
    currentPage: internalCurrentPage.value,
    pageSize: value,
    reason: 'size'
  })
}

const resetPagination = () => {
  internalCurrentPage.value = 1
  pendingPaginationReload.value = true
  emit('update:currentPage', 1)
  emit('pagination-change', {
    currentPage: 1,
    pageSize: internalPageSize.value,
    reason: 'reset'
  })
}

const resolvedPaginationLayout = computed(() => {
  const tokens = (props.paginationLayout || '')
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token && token !== 'jumper' && token !== 'total')

  if (!tokens.length) {
    return 'prev, pager, next, sizes'
  }

  return tokens.join(', ')
})

watch(
  () => props.data,
  () => {
    if (pendingPaginationReload.value) {
      pendingPaginationReload.value = false
      return
    }
    internalCurrentPage.value = 1
  }
)

defineExpose({
  resetPagination
})

const resolvedHeight = computed(() => {
  if (props.height !== undefined) {
    return props.height
  }
  return props.fillHeight ? '100%' : undefined
})



const hasChildrenRows = (rows: any[]): boolean => {
  return rows.some((row) => {
    const children = row?.children
    return Array.isArray(children) && children.length > 0
  })
}


const hasTreeData = computed(() => hasChildrenRows(props.data))

const ensureInternalRowKey = (row: any): string => {
  if (!row || typeof row !== 'object') {
    internalRowKeySeed += 1
    return `row-${internalRowKeySeed}`
  }
  const existing = internalRowKeyMap.get(row)
  if (existing) {
    return existing
  }
  internalRowKeySeed += 1
  const next = `row-${internalRowKeySeed}`
  internalRowKeyMap.set(row, next)
  return next
}

const getRowIdentity = (row: any): string | number => {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(row)
  }
  if (props.rowKey) {
    const key = row?.[props.rowKey as string]
    if (key !== undefined && key !== null && key !== '') {
      return key
    }
  }
  return ensureInternalRowKey(row)
}

const resolvedRowKey = (row: any) => getRowIdentity(row)

const treeProps = computed(() => ({ children: 'children' }))

const collectTreeRows = (rows: any[]): any[] => {
  const result: any[] = []
  const walk = (items: any[]) => {
    items.forEach((item) => {
      const children = item?.children
      if (Array.isArray(children) && children.length) {
        result.push(item)
        walk(children)
      }
    })
  }
  walk(rows)
  return result
}

const allTreeRowKeys = computed<Array<string | number>>(() => {
  if (!hasTreeData.value) return []
  return collectTreeRows(props.data).map((row) => getRowIdentity(row))
})

const syncTreeExpansion = (expandedKeys: Array<string | number>) => {
  const expandedKeySet = new Set(expandedKeys)
  const rows = collectTreeRows(props.data)
  nextTick(() => {
    rows.forEach((row) => {
      tableRef.value?.toggleRowExpansion?.(row, expandedKeySet.has(getRowIdentity(row)))
    })
  })
}

// 递归清除所有记录上 VTable 写入的 hierarchyState 属性，以便 setRecords 重新初始化
const clearAllHierarchyState = (rows: any[]) => {
  rows.forEach(row => {
    delete row.hierarchyState
    if (Array.isArray(row.children)) clearAllHierarchyState(row.children)
  })
}

// 使用 setRecords 重新初始化树形，level 控制默认展开深度（level=999全展开，level=1全收起）
const setRecordsWithLevel = (level: number) => {
  if (!vtableInstance) return
  clearAllHierarchyState(props.data)
  const origLevel = vtableInstance.options.hierarchyExpandLevel
  vtableInstance.options.hierarchyExpandLevel = level
  const summaryRecord = buildSummaryRecord()
  const records = summaryRecord ? [...props.data, summaryRecord] : props.data.slice()
  vtableInstance.setRecords(records)
  vtableInstance.options.hierarchyExpandLevel = origLevel
}

const expandAllTreeRows = () => {
  setRecordsWithLevel(999)
}

const collapseAllTreeRows = () => {
  setRecordsWithLevel(1)
}

const handleTreeExpandChange = (row: any) => {
  if (!hasTreeData.value) return
  const rowKey = getRowIdentity(row)
  const next = new Set(expandedTreeRowKeys.value)
  if (next.has(rowKey)) {
    next.delete(rowKey)
  } else {
    next.add(rowKey)
  }
  expandedTreeRowKeys.value = Array.from(next)
}

onMounted(() => {
  if (hasTreeData.value) {
    expandedTreeRowKeys.value = []
    syncTreeExpansion(expandedTreeRowKeys.value)
  }
  document.addEventListener('mousedown', handleGlobalLeftClickCloseHeaderFilter)
  document.addEventListener('mousedown', handleGlobalLeftClickCloseTextOverlay)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleGlobalLeftClickCloseHeaderFilter)
  document.removeEventListener('mousedown', handleGlobalLeftClickCloseTextOverlay)
  document.removeEventListener('mousemove', handleTextSelectDragMove)
  document.removeEventListener('mouseup', handleTextSelectDragEnd)
  if (rowDragMoveHandler) document.removeEventListener('mousemove', rowDragMoveHandler)
  if (rowDragUpHandler) document.removeEventListener('mouseup', rowDragUpHandler)
  if (tablePreferenceSaveTimer) clearTimeout(tablePreferenceSaveTimer)
})

// ── 行拖拽排序 ──

const resolvedOrderColumnKey = computed(() => {
  const field = props.orderField || 'order'
  const matched = props.columns.find(
    (column) => column.prop === field || column.columnKey === field || getColumnKey(column) === field
  )
  return matched ? getColumnKey(matched) : null
})

const isRowReorderEnabled = computed(() => {
  return Boolean(props.rowDraggable && resolvedOrderColumnKey.value)
})

// 返回包含该 key 的那个数组（同级列表）
const findSiblingContext = (key: string, items: any[]): { list: any[]; index: number } | null => {
  for (const item of items) {
    const index = items.indexOf(item)
    if (String(getRowIdentity(item)) === key) return { list: items, index }
    if (Array.isArray(item.children)) {
      const found = findSiblingContext(key, item.children)
      if (found) return found
    }
  }
  return null
}

const findSiblingList = (key: string, items: any[]): any[] | null => {
  return findSiblingContext(key, items)?.list ?? null
}

const applySiblingOrder = (rows: any[]) => {
  const field = props.orderField || 'order'
  rows.forEach((row, index) => {
    if (row && typeof row === 'object') {
      row[field] = index + 1
    }
  })
}

const isOrderColumn = (column: EnhancedColumn) => {
  return Boolean(resolvedOrderColumnKey.value && column.key === resolvedOrderColumnKey.value)
}

const getColumnClassName = (column: EnhancedColumn) => {
  const className = column.className || (hasResolvedColumnWidth(column) ? 'common-table-col-fixed' : 'common-table-col-auto')
  if (isOrderColumn(column)) {
    return `${className} common-table-order-drag-col`
  }
  return className
}

const getBodyRecordByCellAddress = (address: { col?: number; row?: number } | null | undefined) => {
  if (!vtableInstance) {
    return null
  }
  const col = Number(address?.col)
  const row = Number(address?.row)
  if (!Number.isFinite(col) || !Number.isFinite(row)) {
    return null
  }
  const location = vtableInstance.getCellLocation?.(col, row)
  if (location !== 'body') {
    return null
  }
  const record = vtableInstance.getCellOriginRecord?.(col, row)
  if (!record || typeof record !== 'object') {
    return null
  }
  // 仅允许移动真实数据行（过滤掉汇总行等衍生行）——支持树形子节点
  const isInData = (rows: any[]): boolean => rows.some(r => r === record || (Array.isArray(r.children) && isInData(r.children)))
  if (!isInData(displayData.value)) {
    return null
  }
  return record
}

const validateVTableDragOrder = (source: { col: number; row: number }, target: { col: number; row: number }) => {
  if (!isRowReorderEnabled.value) {
    return true
  }

  const sourceRecord = getBodyRecordByCellAddress(source)
  const targetRecord = getBodyRecordByCellAddress(target)

  // 列拖拽场景不在这里拦截
  if (!sourceRecord || !targetRecord) {
    return true
  }

  if (props.isRowAnchor?.(sourceRecord)) {
    return false
  }

  const sourceKey = String(getRowIdentity(sourceRecord))
  const targetKey = String(getRowIdentity(targetRecord))
  const sourceSiblings = findSiblingList(sourceKey, props.data)
  const targetSiblings = findSiblingList(targetKey, props.data)
  return Boolean(sourceSiblings && targetSiblings && sourceSiblings === targetSiblings)
}

const handleVTableRowReorder = (args: any) => {
  if (!isRowReorderEnabled.value) {
    return
  }
  const source = args?.source
  const target = args?.target
  if (!source || !target) {
    return
  }

  const sourceRecord = getBodyRecordByCellAddress(source)
  const targetRecord = getBodyRecordByCellAddress(target)
  if (!sourceRecord || !targetRecord || sourceRecord === targetRecord) {
    return
  }

  if (props.isRowAnchor?.(sourceRecord)) {
    return
  }

  const sourceKey = String(getRowIdentity(sourceRecord))
  const targetKey = String(getRowIdentity(targetRecord))

  const sourceSiblings = findSiblingList(sourceKey, props.data)
  const targetSiblings = findSiblingList(targetKey, props.data)
  if (!sourceSiblings || sourceSiblings !== targetSiblings) {
    return
  }

  const newSiblings = sourceSiblings.slice()
  const fromIdx = newSiblings.findIndex((row) => String(getRowIdentity(row)) === sourceKey)
  if (fromIdx < 0) {
    return
  }
  const [draggedRow] = newSiblings.splice(fromIdx, 1)

  const targetIdx = newSiblings.findIndex((row) => String(getRowIdentity(row)) === targetKey)
  if (targetIdx < 0) {
    return
  }
  const movingDown = Number(target.row) > Number(source.row)
  const toIdx = movingDown ? targetIdx + 1 : targetIdx
  newSiblings.splice(Math.max(0, Math.min(toIdx, newSiblings.length)), 0, draggedRow)

  applySiblingOrder(newSiblings)
  sourceSiblings.splice(0, sourceSiblings.length, ...newSiblings)
  emit('row-reorder', props.data.slice())
  // props.data 内部原地修改，computed 不会重算，需手动刷新 VTable 记录
  // hierarchyState 属性已保留在 record 对象上（VTable 直接修改 record），setRecords 时 !record.hierarchyState 判断会跳过已有状态
  // 所以展开状态自动保留，无需额外保存/恢复
  nextTick(() => {
    if (!vtableInstance?.setRecords) return
    const summaryRecord = buildSummaryRecord()
    const records = summaryRecord ? [...props.data, summaryRecord] : props.data.slice()
    vtableInstance.setRecords(records)
  })
}

const measureLabelWidth = (() => {
  let ctx: CanvasRenderingContext2D | null = null
  return (text: string) => {
    if (typeof document === 'undefined') {
      return Math.max(40, text.length * 14)
    }
    if (!ctx) {
      const canvas = document.createElement('canvas')
      ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.font = '14px sans-serif'
      }
    }
    if (!ctx) {
      return Math.max(40, text.length * 14)
    }
    return Math.ceil(ctx.measureText(text).width)
  }
})()

const measureLabelWidth12 = (() => {
  let ctx12: CanvasRenderingContext2D | null = null
  return (text: string) => {
    if (typeof document === 'undefined') {
      return Math.max(40, text.length * 12)
    }
    if (!ctx12) {
      const canvas = document.createElement('canvas')
      ctx12 = canvas.getContext('2d')
      if (ctx12) {
        ctx12.font = '12px sans-serif'
      }
    }
    if (!ctx12) {
      return Math.max(40, text.length * 12)
    }
    return Math.ceil(ctx12.measureText(text).width)
  }
})()

const getColumnTextMinWidth = (label: string) => {
  // 文字宽度 + 标题单元格基础留白（提高冗余，避免挤压）
  return measureLabelWidth(label || '') + 34
}

const getColumnHeaderActionWidth = (column: EnhancedColumn) => {
  if (!column.prop) {
    return 0
  }

  let width = 0
  const hasSort = isColumnSortEnabled(column.key)
  const hasFilter = Boolean(column.filterOptions?.length) && isColumnFilterEnabled(column.key)

  // 保守估算标题区操作按钮占位，拖拽列宽时确保不会把图标区域挤掉。
  if (hasSort) {
    width += 20
  }
  if (hasFilter) {
    width += 18
  }
  if (hasSort && hasFilter) {
    width += 4
  }

  // 筛选图标在“未开排序”时会左移贴近文字，需要额外预留被左移占用的空间。
  if (hasFilter && !hasSort) {
    width += 14 // extra shift when filter shows without sort
  }

  // header 中 actions 容器与 label 的 gap
  if (width > 0) {
    width += 8
  }

  return width
}

const getResolvedColumnMinWidth = (column: EnhancedColumn) => {
  const hasSort = isColumnSortEnabled(column.key)
  const hasFilter = Boolean(column.filterOptions?.length) && isColumnFilterEnabled(column.key)
  // 左padding + 文字宽度(12px) + 排序图标 + 筛选图标 + 右padding
  let min = VTABLE_CELL_PADDING_LEFT + measureLabelWidth12(column.label || '') + VTABLE_CELL_PADDING_LEFT
  if (hasSort) min += VTABLE_SORT_ICON_TOTAL_WIDTH
  if (hasFilter) min += HEADER_FILTER_ICON_SIZE + 4
  return Math.ceil(min)
}

const getResolvedColumnWidth = (column: EnhancedColumn) => {
  const hasResized = Object.prototype.hasOwnProperty.call(resizedColumnWidths.value, column.key)
  if (hasResized) {
    const resized = resizedColumnWidths.value[column.key]
    return Math.max(resized, getResolvedColumnMinWidth(column))
  }
  // 默认不设置固定宽度，交由 min-width + 表格布局自动计算
  return undefined
}

const hasResolvedColumnWidth = (column: EnhancedColumn) => {
  return getResolvedColumnWidth(column) !== undefined
}

const getRuntimeColumnKey = (runtimeColumn: any): string | null => {
  return runtimeColumn?.columnKey ?? runtimeColumn?.property ?? runtimeColumn?.label ?? null
}

const resolveMinWidthByColumnKey = (columnKey: string, fallbackLabel?: string) => {
  const column = getEnhancedColumn(columnKey)
  if (column) {
    return getResolvedColumnMinWidth(column)
  }
  // 兜底：至少按表头文字宽度限制
  return getColumnTextMinWidth(fallbackLabel || '')
}

const handleColumnResizeEnd = (newWidth: number, _oldWidth: number, runtimeColumn: any) => {
  const columnKey = getRuntimeColumnKey(runtimeColumn)
  if (!columnKey) {
    return
  }
  const min = resolveMinWidthByColumnKey(columnKey, runtimeColumn?.label)
  const normalizedWidth = Number.isFinite(newWidth) ? newWidth : min
  const clampedWidth = Math.max(normalizedWidth, min)

  resizedColumnWidths.value = {
    ...resizedColumnWidths.value,
    [columnKey]: clampedWidth
  }

  // 同步运行时列宽，避免连续拖拽时内部状态短暂覆盖导致突破最小值
  if (runtimeColumn && typeof runtimeColumn === 'object') {
    runtimeColumn.width = clampedWidth
    runtimeColumn.realWidth = clampedWidth
  }

  // 连续拖拽场景下，强制表格重新布局避免宽度被内部状态压缩
  nextTick(() => {
    tableRef.value?.doLayout?.()
  })
}

const reClampResizedWidthsByCurrentMin = () => {
  const nextState: Record<string, number> = {}
  let changed = false

  orderedEnhancedColumns.value.forEach((column) => {
    const hasResized = Object.prototype.hasOwnProperty.call(resizedColumnWidths.value, column.key)
    if (!hasResized) {
      return
    }
    const current = resizedColumnWidths.value[column.key]
    const min = getResolvedColumnMinWidth(column)
    const clamped = Math.max(current, min)
    nextState[column.key] = clamped
    if (clamped !== current) {
      changed = true
    }
  })

  if (changed) {
    resizedColumnWidths.value = {
      ...resizedColumnWidths.value,
      ...nextState
    }
    nextTick(() => {
      tableRef.value?.doLayout?.()
    })
  }
}




const defaultFilterMethod = (value: FilterValue, row: any, column: any) => {
  const prop = column?.property
  if (!prop) {
    return true
  }
  return row?.[prop] === value
}

const cloneFilterValues = (values: FilterValue[]) => values.slice()

// const enhancedColumns = computed<EnhancedColumn[]>(() => {
//   return props.columns.map((column) => {
//     const key = getColumnKey(column)
//     const filterOptions = buildAutoFilters(column.prop)
//     return {
//       ...column,
//       key,
//       filterOptions,
//       canSort: Boolean(column.prop),
//       isSortable: Boolean(column.prop) && isColumnSortEnabled(key)
//     }
//   })
// })

const normalizeColumnOrderKeys = (nextKeys: string[]) => {
  const keySet = new Set(nextKeys)
  const kept = columnOrderKeys.value.filter((key) => keySet.has(key))
  const missing = nextKeys.filter((key) => !kept.includes(key))
  return [...kept, ...missing]
}

watch(
  () => enhancedColumns.value.map((column) => column.key).join(','),
  () => {
    const nextKeys = enhancedColumns.value.map((column) => column.key)
    columnOrderKeys.value = normalizeColumnOrderKeys(nextKeys)
    const nextKeySet = new Set(nextKeys)
    visibleColumnKeys.value = visibleColumnKeys.value.filter((key) => nextKeySet.has(key))
    if (!visibleColumnKeys.value.length && nextKeys.length) {
      visibleColumnKeys.value = nextKeys.slice()
    }

    const keepSet = new Set(nextKeys)
    const nextWidths: Record<string, number> = {}
    Object.entries(resizedColumnWidths.value).forEach(([key, width]) => {
      if (keepSet.has(key)) {
        nextWidths[key] = width
      }
    })
    resizedColumnWidths.value = nextWidths
  },
  { immediate: true }
)

// const orderedEnhancedColumns = computed<EnhancedColumn[]>(() => {
//   const columnMap = new Map(enhancedColumns.value.map((column) => [column.key, column]))
//   return columnOrderKeys.value
//     .map((key) => columnMap.get(key))
//     .filter((column): column is EnhancedColumn => Boolean(column))
// })

// const visibleColumnSet = computed(() => new Set(visibleColumnKeys.value))

// const visibleOrderedColumns = computed<EnhancedColumn[]>(() => {
//   return orderedEnhancedColumns.value.filter((column) => visibleColumnSet.value.has(column.key))
// })

const filterableColumns = computed(() => {
  return orderedEnhancedColumns.value.filter((column) => Boolean(column.prop))
})


const sortableColumns = computed(() => {
  return orderedEnhancedColumns.value.filter((column) => column.canSort)
})

// 只保留当前可用列
const keepValidEnabledKeys = (
  currentKeys: string[],
  nextKeys: string[]
): string[] => {
  const nextKeySet = new Set(nextKeys)
  return currentKeys.filter((key) => nextKeySet.has(key))
}

// 列筛选全开/全关
const enableAllFilters = () => {
  filterEnabledKeys.value = filterableColumns.value.map((c) => c.key)
}
const disableAllFilters = () => {
  filterEnabledKeys.value = []
}

// 列排序全开/全关
const enableAllSorts = () => {
  sortEnabledKeys.value = sortableColumns.value.map((c) => c.key)
}
const disableAllSorts = () => {
  sortEnabledKeys.value = []
}

// 列显示全开/全关
const enableAllColumnsVisible = () => {
  visibleColumnKeys.value = orderedEnhancedColumns.value.map((c) => c.key)
}

const disableAllColumnsVisible = () => {
  visibleColumnKeys.value = []
}

watch(
  () => filterableColumns.value.map((c) => c.key).join(','),
  () => {
    const validKeys = keepValidEnabledKeys(
      filterEnabledKeys.value,
      filterableColumns.value.map((c) => c.key)
    )
    filterEnabledKeys.value = validKeys
  },
  { immediate: true }
)

watch(
  () => sortableColumns.value.map((c) => c.key).join(','),
  () => {
    const validKeys = keepValidEnabledKeys(
      sortEnabledKeys.value,
      sortableColumns.value.map((c) => c.key)
    )
    sortEnabledKeys.value = validKeys
  },
  { immediate: true }
)

watch(filterEnabledKeys, () => {
  const enabledSet = new Set(filterEnabledKeys.value)
  const nextAppliedState: Record<string, FilterValue[]> = {}
  Object.entries(appliedFilterState.value).forEach(([columnKey, values]) => {
    if (enabledSet.has(columnKey)) {
      nextAppliedState[columnKey] = values
    }
  })
  appliedFilterState.value = nextAppliedState

  const nextDraftState: Record<string, FilterValue[]> = {}
  Object.entries(draftFilterState.value).forEach(([columnKey, values]) => {
    if (enabledSet.has(columnKey)) {
      nextDraftState[columnKey] = values
    }
  })
  draftFilterState.value = nextDraftState
})

watch(sortEnabledKeys, () => {
  if (sortKey.value && !sortEnabledSet.value.has(sortKey.value)) {
    sortKey.value = null
    sortOrder.value = null
  }
})

watch([filterEnabledKeys, sortEnabledKeys], () => {
  reClampResizedWidthsByCurrentMin()
})

watch(
  [visibleColumnKeys, columnOrderKeys, filterEnabledKeys, sortEnabledKeys, resizedColumnWidths, internalPageSize],
  () => {
    scheduleSaveTablePreference()
  },
  { deep: true }
)

watch(
  () => allTreeRowKeys.value.join('|'),
  () => {
    if (!hasTreeData.value) return
    const validKeys = new Set(allTreeRowKeys.value)
    expandedTreeRowKeys.value = expandedTreeRowKeys.value.filter((key) => validKeys.has(key))
    syncTreeExpansion(expandedTreeRowKeys.value)
  }
)

const getEnhancedColumn = (columnKey: string) => {
  return enhancedColumns.value.find((column) => column.key === columnKey)
}

const getDefaultColumnOrderKeys = () => {
  return props.columns.map((column) => getColumnKey(column))
}

const getTablePreferenceRoutePath = () => {
  return route.path || '/'
}

const getTablePreferenceTableKey = () => {
  const nameKey = props.name?.trim()
  if (nameKey) {
    return nameKey
  }
  const schemaKey = getDefaultColumnOrderKeys().join('|')
  return schemaKey || 'default'
}

const sanitizePreferenceKeys = (keys: string[], validKeys: string[]) => {
  const validKeySet = new Set(validKeys)
  const normalized: string[] = []
  keys.forEach((key) => {
    if (validKeySet.has(key) && !normalized.includes(key)) {
      normalized.push(key)
    }
  })
  return normalized
}

const mergePreferenceOrderKeys = (keys: string[], validKeys: string[]) => {
  const normalized = sanitizePreferenceKeys(keys, validKeys)
  const missing = validKeys.filter((key) => !normalized.includes(key))
  return [...normalized, ...missing]
}

const sanitizePreferenceWidths = (raw: Record<string, number>) => {
  const validKeySet = new Set(getDefaultColumnOrderKeys())
  const normalized: Record<string, number> = {}
  Object.entries(raw).forEach(([key, width]) => {
    if (!validKeySet.has(key)) {
      return
    }
    const nextWidth = Number(width)
    if (Number.isFinite(nextWidth) && nextWidth > 0) {
      normalized[key] = nextWidth
    }
  })
  return normalized
}

const buildTablePreferenceSnapshot = (): CommonTablePreference => {
  return {
    visibleColumnKeys: visibleColumnKeys.value.slice(),
    columnOrderKeys: columnOrderKeys.value.slice(),
    filterEnabledKeys: filterEnabledKeys.value.slice(),
    sortEnabledKeys: sortEnabledKeys.value.slice(),
    resizedColumnWidths: sanitizePreferenceWidths(resizedColumnWidths.value),
    pageSize: internalPageSize.value
  }
}

const applyTablePreference = (preference: CommonTablePreference) => {
  applyingTablePreference.value = true

  const allColumnKeys = getDefaultColumnOrderKeys()
  const filterableKeys = filterableColumns.value.map((column) => column.key)
  const sortableKeys = sortableColumns.value.map((column) => column.key)

  columnOrderKeys.value = mergePreferenceOrderKeys(preference.columnOrderKeys, allColumnKeys)
  visibleColumnKeys.value = sanitizePreferenceKeys(preference.visibleColumnKeys, allColumnKeys)
  filterEnabledKeys.value = sanitizePreferenceKeys(preference.filterEnabledKeys, filterableKeys)
  sortEnabledKeys.value = sanitizePreferenceKeys(preference.sortEnabledKeys, sortableKeys)
  resizedColumnWidths.value = sanitizePreferenceWidths(preference.resizedColumnWidths)

  const nextPageSize = Number(preference.pageSize)
  if (Number.isFinite(nextPageSize) && nextPageSize > 0) {
    internalPageSize.value = nextPageSize
  }

  applyingTablePreference.value = false
}

const initializeTablePreference = async () => {
  const routePath = getTablePreferenceRoutePath()
  if (routePath === '/login') {
    return
  }

  const preference = await loadCommonTablePreference(routePath, getTablePreferenceTableKey())
  if (preference) {
    applyTablePreference(preference)
  }
}

const scheduleSaveTablePreference = () => {
  if (!tablePreferenceReady.value || applyingTablePreference.value) {
    return
  }

  const routePath = getTablePreferenceRoutePath()
  if (routePath === '/login') {
    return
  }

  if (tablePreferenceSaveTimer) {
    clearTimeout(tablePreferenceSaveTimer)
  }

  tablePreferenceSaveTimer = window.setTimeout(() => {
    tablePreferenceSaveTimer = null
    void saveCommonTablePreference(
      routePath,
      getTablePreferenceTableKey(),
      buildTablePreferenceSnapshot()
    )
  }, 300)
}

const resetColumnOrder = () => {
  columnOrderKeys.value = normalizeColumnOrderKeys(getDefaultColumnOrderKeys())
}

const reorderColumnKeys = (sourceKey: string, targetKey: string, insertAfter = false) => {
  if (sourceKey === targetKey) {
    return
  }
  const nextKeys = columnOrderKeys.value.slice()
  const sourceIndex = nextKeys.indexOf(sourceKey)
  const targetIndex = nextKeys.indexOf(targetKey)
  if (sourceIndex === -1 || targetIndex === -1) {
    return
  }

  nextKeys.splice(sourceIndex, 1)
  const removedBeforeTarget = sourceIndex < targetIndex
  const baseTargetIndex = removedBeforeTarget ? targetIndex - 1 : targetIndex
  const insertIndex = insertAfter ? baseTargetIndex + 1 : baseTargetIndex
  nextKeys.splice(insertIndex, 0, sourceKey)
  columnOrderKeys.value = nextKeys
}

const getHeaderDragClass = (columnKey: string) => {
  return {
    'is-draggable': dragReorderEnabled.value,
    'is-dragging': dragReorderEnabled.value && draggingColumnKey.value === columnKey,
    'is-drag-over-left':
      dragReorderEnabled.value &&
      dragOverColumnKey.value === columnKey &&
      draggingColumnKey.value !== columnKey &&
      dragInsertSide.value === 'left',
    'is-drag-over-right':
      dragReorderEnabled.value &&
      dragOverColumnKey.value === columnKey &&
      draggingColumnKey.value !== columnKey &&
      dragInsertSide.value === 'right'
  }
}

const handleHeaderDragStart = (columnKey: string, event: DragEvent) => {
  if (!dragReorderEnabled.value) {
    return
  }
  draggingColumnKey.value = columnKey
  dragOverColumnKey.value = columnKey
  dragInsertSide.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', columnKey)
  }
}

const handleHeaderDragOver = (columnKey: string, event: DragEvent) => {
  if (!dragReorderEnabled.value || !draggingColumnKey.value) {
    return
  }
  dragOverColumnKey.value = columnKey
  const rect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect()
  if (!rect) {
    dragInsertSide.value = null
    return
  }
  const midpoint = rect.left + rect.width / 2
  dragInsertSide.value = event.clientX >= midpoint ? 'right' : 'left'
}

const handleHeaderDrop = (columnKey: string, event: DragEvent) => {
  if (!dragReorderEnabled.value) {
    return
  }
  const sourceKey = draggingColumnKey.value || event.dataTransfer?.getData('text/plain') || null
  if (!sourceKey || sourceKey === columnKey) {
    handleHeaderDragEnd()
    return
  }
  const insertAfter = dragInsertSide.value === 'right'
  reorderColumnKeys(sourceKey, columnKey, insertAfter)
  handleHeaderDragEnd()
}

const handleHeaderDragEnd = () => {
  draggingColumnKey.value = null
  dragOverColumnKey.value = null
  dragInsertSide.value = null
}

const getCalculationMode = (columnKey: string) => {
  return calculationModes.value[columnKey] ?? props.calculationDefaultMode ?? 'none'
}

const hasActiveCalculation = computed(() => {
  return enhancedColumns.value.some((column) => column.prop && getCalculationMode(column.key) !== 'none')
})

const showSummaryRow = computed(() => {
  return props.calculationEnabled && hasActiveCalculation.value && displayData.value.length > 0
})

const updateCalculationMode = (columnKey: string, mode: CalculationMode) => {
  calculationModes.value = {
    ...calculationModes.value,
    [columnKey]: mode
  }
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const formatAverage = (value: number) => {
  const text = String(value)
  const parts = text.split('.')
  if (parts.length === 2 && parts[1].length > 3) {
    return value.toFixed(3)
  }
  return text
}

const buildSummaryRow = () => {
  return visibleOrderedColumns.value.map((column, index) => {
    if (index === 0 && props.calculationRowLabel) {
      return props.calculationRowLabel
    }
    if (!column.prop) {
      return ''
    }
    const mode = getCalculationMode(column.key)
    if (mode === 'none') {
      return ''
    }
    const values: number[] = []
    displayData.value.forEach((row) => {
      const value = toNumber(row?.[column.prop as string])
      if (value !== null) {
        values.push(value)
      }
    })
    if (!values.length) {
      return ''
    }

    let result: number | null
    let formatted: string | null = null
    switch (mode) {
      case 'sum':
        result = values.reduce((acc, value) => acc + value, 0)
        break
      case 'avg':
        result = values.reduce((acc, value) => acc + value, 0) / values.length
        formatted = formatAverage(result)
        break
      case 'min':
        result = Math.min(...values)
        break
      case 'max':
        result = Math.max(...values)
        break
      default:
        result = null
    }

    if (result === null || Number.isNaN(result)) {
      return ''
    }

    const label = calculationModeLabels[mode]
    const valueText = formatted ?? `${result}`
    const text = label ? `${label}: ${valueText}` : valueText
    return h('span', { class: 'common-table-summary-value' }, text)
  })
}

const getAppliedFilterValues = (columnKey: string) => {
  return cloneFilterValues(appliedFilterState.value[columnKey] || [])
}

const getDraftFilterValues = (columnKey: string) => {
  return cloneFilterValues(draftFilterState.value[columnKey] || [])
}

const setAppliedFilterValues = (columnKey: string, values: FilterValue[]) => {
  appliedFilterState.value = {
    ...appliedFilterState.value,
    [columnKey]: cloneFilterValues(values)
  }
}

const setDraftFilterValues = (columnKey: string, values: FilterValue[]) => {
  draftFilterState.value = {
    ...draftFilterState.value,
    [columnKey]: cloneFilterValues(values)
  }
}

const isFilterPopoverVisible = (columnKey: string) => {
  return Boolean(filterPopoverVisible.value[columnKey])
}

const handleFilterPopoverVisibleChange = (columnKey: string, visible: boolean) => {
  filterPopoverVisible.value = {
    ...filterPopoverVisible.value,
    [columnKey]: visible
  }

  if (visible) {
    setDraftFilterValues(columnKey, getAppliedFilterValues(columnKey))
  }
}

const updateDraftFilterValues = (columnKey: string, values: FilterValue[]) => {
  setDraftFilterValues(columnKey, values)
}

const hasAppliedFilter = (columnKey: string) => {
  if (!isColumnFilterEnabled(columnKey)) {
    return false
  }
  return getAppliedFilterValues(columnKey).length > 0
}

const getFilterValueText = (column: EnhancedColumn, value: FilterValue) => {
  const target = column.filterOptions?.find((option) => option.value === value)
  return target ? target.text : String(value)
}

const activeFilterSummaries = computed(() => {
  return enhancedColumns.value
    .filter((column) => Boolean(column.prop) && isColumnFilterEnabled(column.key))
    .map((column) => {
      const appliedValues = getAppliedFilterValues(column.key)
      return {
        key: column.key,
        label: column.label,
        valuesText: appliedValues.map((value) => getFilterValueText(column, value)).join('、')
      }
    })
    .filter((item) => item.valuesText)
})

const clearFilterSummary = (columnKey: string) => {
  resetFilters(columnKey)
}

const showSelectAllIndicator = (columnKey: string, total: number) => {
  if (!total) {
    return false
  }
  const selected = getDraftFilterValues(columnKey).length
  return selected === total
}

const selectAllFilters = (
  columnKey: string,
  options: Array<{ text: string; value: FilterValue }>
) => {
  setDraftFilterValues(
    columnKey,
    options.map((item) => item.value)
  )
}

const toFilterValueKey = (value: FilterValue) => {
  return `${typeof value}:${String(value)}`
}

const invertFilters = (
  columnKey: string,
  options: Array<{ text: string; value: FilterValue }>
) => {
  const selected = new Set(getDraftFilterValues(columnKey).map(toFilterValueKey))
  const nextValues = options
    .map((item) => item.value)
    .filter((value) => !selected.has(toFilterValueKey(value)))

  setDraftFilterValues(columnKey, nextValues)
}

const confirmFilters = (columnKey: string) => {
  setAppliedFilterValues(columnKey, getDraftFilterValues(columnKey))
  handleFilterPopoverVisibleChange(columnKey, false)
}

const resetFilters = (columnKey: string) => {
  setDraftFilterValues(columnKey, [])
  setAppliedFilterValues(columnKey, [])
}

const getSortValue = (row: any, column: EnhancedColumn, index: number) => {
  if (typeof column.sortBy === 'function') {
    return column.sortBy(row, index)
  }

  if (typeof column.sortBy === 'string') {
    return row?.[column.sortBy]
  }

  if (Array.isArray(column.sortBy)) {
    for (const key of column.sortBy) {
      const value = row?.[key]
      if (value !== undefined && value !== null) {
        return value
      }
    }
  }

  return column.prop ? row?.[column.prop] : undefined
}

const compareValues = (left: any, right: any) => {
  if (left == null && right == null) {
    return 0
  }
  if (left == null) {
    return -1
  }
  if (right == null) {
    return 1
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }

  return String(left).localeCompare(String(right), 'zh-CN', {
    numeric: true,
    sensitivity: 'base'
  })
}

// ── 排序 UI helpers ──
/** 获取某列当前排序方向 */
const getSortOrder = (columnKey: string): 'ascending' | 'descending' | null => {
  return sortKey.value === columnKey ? sortOrder.value : null
}

/** 排序按钮 class：激活态高亮 */
const getSortBtnClass = (columnKey: string) => ({
  'common-table-sort-btn--active': sortKey.value === columnKey && sortOrder.value !== null
})

/** 排序按钮 title 提示 */
const getSortBtnTitle = (columnKey: string) => {
  const order = getSortOrder(columnKey)
  if (order === 'ascending') return '当前升序，点击切换降序'
  if (order === 'descending') return '当前降序，点击取消排序'
  return '点击升序排序'
}

/**
 * 三态循环：null → ascending → descending → null
 * 切换列时先重置为 ascending
 */
const toggleSort = (columnKey: string) => {
  if (!isColumnSortEnabled(columnKey)) return

  if (sortKey.value !== columnKey) {
    // 切换到新列，从升序开始
    sortKey.value = columnKey
    sortOrder.value = 'ascending'
    return
  }

  // 同列循环
  if (sortOrder.value === 'ascending') {
    sortOrder.value = 'descending'
  } else if (sortOrder.value === 'descending') {
    sortKey.value = null
    sortOrder.value = null
  } else {
    sortOrder.value = 'ascending'
  }
}

// const displayData = computed(() => {
//   let rows = props.data.slice()

//   orderedEnhancedColumns.value.forEach((column) => {
//     const selectedValues = getAppliedFilterValues(column.key)
//     if (!selectedValues.length || !column.prop || !isColumnFilterEnabled(column.key)) {
//       return
//     }
//     const filterMethod = column.filterMethod ?? defaultFilterMethod
//     rows = rows.filter((row) =>
//       selectedValues.some((value) =>
//         filterMethod(value, row, { property: column.prop })
//       )
//     )
//   })

//   // 应用列排序
//   if (!sortKey.value || !sortOrder.value || !isColumnSortEnabled(sortKey.value)) {
//     return rows
//   }

//   const sortColumn = getEnhancedColumn(sortKey.value)
//   if (!sortColumn) return rows

//   const factor = sortOrder.value === 'descending' ? -1 : 1

//   return rows.slice().sort((a, b) => {
//     if (sortColumn.sortMethod) {
//       return sortColumn.sortMethod(a, b) * factor
//     }
//     const aVal = getSortValue(a, sortColumn, 0)
//     const bVal = getSortValue(b, sortColumn, 1)
//     return compareValues(aVal, bVal) * factor
//   })
// })

// ── 导出 Excel ──
const exportToExcel = () => {
  const exportCols = visibleOrderedColumns.value.filter((c) => c.prop)

  // 表头行
  const header = exportCols.map((c) => c.label)

  // 数据行：使用当前已过滤/排序的 displayData，formatter 优先
  const rows = displayData.value.map((row) =>
    exportCols.map((col) => {
      const rawValue = row?.[col.prop as string]
      if (col.formatter) {
        const result = col.formatter(row, col as any, rawValue, 0)
        return result ?? rawValue ?? ''
      }
      return rawValue ?? ''
    })
  )

  const wsData = [header, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 自动列宽
  ws['!cols'] = exportCols.map((col, colIdx) => {
    const maxLen = wsData.reduce((max, row) => {
      const cell = String(row[colIdx] ?? '')
      // 中文字符按 2 计算
      const len = [...cell].reduce((s, c) => s + (c.charCodeAt(0) > 127 ? 2 : 1), 0)
      return Math.max(max, len)
    }, col.label.length * 2)
    return { wch: Math.min(maxLen + 2, 50) }
  })

  const exportName = props.name || '导出数据'
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, props.exportSheetName)
  XLSX.writeFile(wb, `${exportName}_${timestamp}.xlsx`)
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

.common-table-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  background: #ffffff;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
}

.common-table-toolbar-title {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  flex-shrink: 0;
}

.common-table-toolbar-divider {
  width: 1px;
  height: 18px;
  background: #dcdfe6;
  margin: 0 4px;
}

.common-table-toolbar-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-right: 4px;
  flex-shrink: 0;
}

.common-table-toolbar-switch__label {
  font-size: 12px;
  color: #606266;
}

.common-table-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #ffffff;
  color: #606266;
  cursor: pointer;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
}

.common-table-toolbar-btn:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background: #ecf5ff;
}

.common-table-toolbar-btn--export {
  color: #ffffff;
  border-color: #67c23a;
  background: #67c23a;
}

.common-table-toolbar-btn--export:hover {
  color: #ffffff;
  border-color: #85ce61;
  background: #85ce61;
}

.common-table-toolbar-panel {
  padding: 4px 0;
}

.common-table-toolbar-group {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.common-table-vtable-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
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

.common-table-header-filter-panel {
  position: absolute;
  z-index: 30;
  display: flex;
  flex-direction: column;
  max-height: 280px;
  padding: 10px 12px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.common-table-pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-top: 1px solid #ebeef5;
  background: #fff;
  min-width: 0;
}

.common-table-pagination-left {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.common-table-pagination-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.common-table-pagination-total {
  color: #606266;
  font-size: 12px;
  white-space: nowrap;
}

.common-table-filter-summary-list {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
}

.common-table-filter-summary-item {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 320px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 2px 8px;
  background: #fff;
  color: #606266;
  font-size: 12px;
  line-height: 1.4;
}

.common-table-filter-summary-item__field {
  flex-shrink: 0;
  color: #303133;
}

.common-table-filter-summary-item__values {
  min-width: 0;
  margin-left: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.common-table-filter-summary-item__close {
  margin-left: 6px;
  border: none;
  background: transparent;
  color: #909399;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}

.common-table-filter-summary-item__close:hover {
  color: #606266;
}

:deep(.common-table-pagination .el-pagination) {
  font-size: 12px;
}

:deep(.common-table-pagination .el-pager li),
:deep(.common-table-pagination .btn-prev),
:deep(.common-table-pagination .btn-next) {
  min-width: 24px;
  height: 24px;
  line-height: 24px;
}

:deep(.common-table-wrapper .el-table) {
  flex: 1;
  min-height: 0;
  font-size: 12px;
}

:deep(.common-table-wrapper .el-table__body-wrapper) {
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

/* 排序三角图标 */
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

/* 工具栏全开/全关快捷按钮 */
.common-table-toolbar-quickbar {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.common-table-toolbar-quick-btn {
  padding: 3px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #f5f7fa;
  color: #606266;
  font-size: 12px;
  cursor: pointer;
  line-height: 1.4;
}

.common-table-toolbar-quick-btn:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background: #ecf5ff;
}


:deep(.common-table-col-auto .cell) {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 表头/行高压缩到与文字更贴合 */
:deep(.el-table__header-wrapper th.el-table__cell),
:deep(.el-table__body-wrapper td.el-table__cell),
:deep(.el-table__footer-wrapper td.el-table__cell) {
  padding-top: 4px;
  padding-bottom: 4px;
}

:deep(.el-table__header-wrapper th.el-table__cell .cell),
:deep(.el-table__body-wrapper td.el-table__cell .cell),
:deep(.el-table__footer-wrapper td.el-table__cell .cell) {
  line-height: 20px;
  font-size: 12px;
}

:deep(.el-table__header-wrapper th.el-table__cell) {
  background-color: #f5f7fa;
}

:deep(.el-table__body tr td.el-table__cell) {
  background-color: #ffffff;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background-color: #eaf3ff;
}

:deep(.el-table__footer tr td.el-table__cell) {
  background-color: #f5f7fa;
  font-weight: 500;
}

:deep(.el-table__footer .common-table-summary-value) {
  color: #f56c6c;
}

:deep(.el-table__body tr:hover > td.el-table__cell) {
  background-color: #dbeafe;
}

:deep(.el-table__body tr.common-table-row-draggable > td.el-table__cell),
:deep(.el-table__body tr.common-table-row-draggable > td.el-table__cell .cell) {
  cursor: grab;
  user-select: none;
}

/* 树结构行色：父级浅蓝，子级白色 */
:deep(.el-table__body tr.common-table-row-parent > td.el-table__cell),
:deep(.el-table--striped .el-table__body tr.common-table-row-parent > td.el-table__cell),
:deep(.el-table__body tr.common-table-row-parent:hover > td.el-table__cell) {
  background-color: #eaf3ff;
}

:deep(.el-table__body tr.common-table-row-child > td.el-table__cell),
:deep(.el-table--striped .el-table__body tr.common-table-row-child.el-table__row--striped > td.el-table__cell),
:deep(.el-table__body tr.common-table-row-child:hover > td.el-table__cell) {
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

/* 拖拽列排序样式 */
.common-table-header-cell.is-draggable {
  cursor: grab;
  user-select: none;
}

.common-table-header-cell.is-draggable.is-dragging {
  opacity: 0.55;
}

.common-table-header-cell.is-draggable.is-drag-over-left::before,
.common-table-header-cell.is-draggable.is-drag-over-right::after {
  content: '';
  position: absolute;
  top: 1px;
  bottom: 1px;
  width: 3px;
  background: #409eff;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.22);
  z-index: 3;
}

.common-table-header-cell.is-draggable.is-drag-over-left::before {
  left: -4px;
}

.common-table-header-cell.is-draggable.is-drag-over-right::after {
  right: -4px;
}

.common-table-header-cell.is-draggable.is-drag-over-left,
.common-table-header-cell.is-draggable.is-drag-over-right {
  background: rgba(64, 158, 255, 0.08);
  border-radius: 4px;
}

/* 行拖拽把手 */
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

:deep(.common-table-order-drag-col .cell) {
  cursor: grab;
  user-select: none;
}

:deep(.common-table-order-drag-col .cell::before) {
  content: '⠿';
  display: inline-block;
  margin-right: 6px;
  color: #c0c4cc;
}

/* 拖拽中行高亮 */
:deep(.sortable-ghost) {
  opacity: 0.4;
  background: #e6f0ff !important;
}

:deep(.sortable-chosen) {
  background: #f0f7ff !important;
}
</style>
