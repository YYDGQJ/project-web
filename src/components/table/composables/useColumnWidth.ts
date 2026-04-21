import { ref, nextTick } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { EnhancedColumn } from '../types'
import {
  measureLabelWidth12,
  getColumnTextMinWidth
} from '../utils/measureUtils'
import {
  VTABLE_CELL_PADDING_LEFT,
  VTABLE_SORT_ICON_TOTAL_WIDTH,
  HEADER_FILTER_ICON_SIZE
} from '../constants'

// 管理列宽计算、缩放落地与最小宽度约束

export function useColumnWidth(
  orderedEnhancedColumns: ComputedRef<EnhancedColumn[]>,
  isColumnSortEnabled: (key: string) => boolean,
  isColumnFilterEnabled: (key: string) => boolean
) {
  const resizedColumnWidths = ref<Record<string, number>>({})

  // 估算表头操作区（排序/筛选图标）占用宽度

  const getColumnHeaderActionWidth = (column: EnhancedColumn) => {
    if (!column.prop) return 0
    let width = 0
    const hasSort = isColumnSortEnabled(column.key)
    const hasFilter = Boolean(column.filterOptions?.length) && isColumnFilterEnabled(column.key)
    if (hasSort) width += 20
    if (hasFilter) width += 18
    if (hasSort && hasFilter) width += 4
    if (hasFilter && !hasSort) width += 14
    if (width > 0) width += 8
    return width
  }

  // 计算列最小宽度，避免标题与图标重叠

  const getResolvedColumnMinWidth = (column: EnhancedColumn) => {
    const hasSort = isColumnSortEnabled(column.key)
    const hasFilter = Boolean(column.filterOptions?.length) && isColumnFilterEnabled(column.key)
    let min = VTABLE_CELL_PADDING_LEFT + measureLabelWidth12(column.label || '') + VTABLE_CELL_PADDING_LEFT
    if (hasSort) min += VTABLE_SORT_ICON_TOTAL_WIDTH
    if (hasFilter) min += HEADER_FILTER_ICON_SIZE + 4
    return Math.ceil(min)
  }

  // 获取列实际宽度：优先用户拖拽宽度，其次自动宽度

  const getResolvedColumnWidth = (column: EnhancedColumn) => {
    const hasResized = Object.prototype.hasOwnProperty.call(
      resizedColumnWidths.value,
      column.key
    )
    if (hasResized) {
      const resized = resizedColumnWidths.value[column.key]
      return Math.max(resized, getResolvedColumnMinWidth(column))
    }
    return undefined
  }

  // 判断列是否存在显式宽度

  const hasResolvedColumnWidth = (column: EnhancedColumn) =>
    getResolvedColumnWidth(column) !== undefined

  // 从运行时列对象提取列键

  const getRuntimeColumnKey = (runtimeColumn: any): string | null =>
    runtimeColumn?.columnKey ?? runtimeColumn?.property ?? runtimeColumn?.label ?? null

  // 根据列键计算最小宽度，找不到列时使用标题兜底

  const resolveMinWidthByColumnKey = (
    columnKey: string,
    fallbackLabel?: string
  ) => {
    const column = orderedEnhancedColumns.value.find((c) => c.key === columnKey)
    if (column) return getResolvedColumnMinWidth(column)
    return getColumnTextMinWidth(fallbackLabel || '')
  }

  // 处理列缩放结束：写入状态并夹紧到最小宽度

  const handleColumnResizeEnd = (
    newWidth: number,
    _oldWidth: number,
    runtimeColumn: any,
    tableRef?: Ref<{ doLayout?: () => void } | null>
  ) => {
    const columnKey = getRuntimeColumnKey(runtimeColumn)
    if (!columnKey) return
    const min = resolveMinWidthByColumnKey(columnKey, runtimeColumn?.label)
    const normalizedWidth = Number.isFinite(newWidth) ? newWidth : min
    const clampedWidth = Math.max(normalizedWidth, min)
    resizedColumnWidths.value = { ...resizedColumnWidths.value, [columnKey]: clampedWidth }
    if (runtimeColumn && typeof runtimeColumn === 'object') {
      runtimeColumn.width = clampedWidth
      runtimeColumn.realWidth = clampedWidth
    }
    nextTick(() => {
      tableRef?.value?.doLayout?.()
    })
  }

  // 按当前最小宽度重新校正所有已拖拽列宽

  const reClampResizedWidthsByCurrentMin = (tableRef?: Ref<{ doLayout?: () => void } | null>) => {
    const nextState: Record<string, number> = {}
    let changed = false
    orderedEnhancedColumns.value.forEach((column) => {
      const hasResized = Object.prototype.hasOwnProperty.call(
        resizedColumnWidths.value,
        column.key
      )
      if (!hasResized) return
      const current = resizedColumnWidths.value[column.key]
      const min = getResolvedColumnMinWidth(column)
      const clamped = Math.max(current, min)
      nextState[column.key] = clamped
      if (clamped !== current) changed = true
    })
    if (changed) {
      resizedColumnWidths.value = { ...resizedColumnWidths.value, ...nextState }
      nextTick(() => { tableRef?.value?.doLayout?.() })
    }
  }

  return {
    resizedColumnWidths,
    getColumnHeaderActionWidth,
    getResolvedColumnMinWidth,
    getResolvedColumnWidth,
    hasResolvedColumnWidth,
    getRuntimeColumnKey,
    resolveMinWidthByColumnKey,
    handleColumnResizeEnd,
    reClampResizedWidthsByCurrentMin
  }
}
