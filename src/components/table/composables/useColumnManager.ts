import { ref, computed, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { EnhancedColumn } from '../types'

/**
 * 列管理状态机。
 * 维护三类核心状态：列顺序、列可见性、列面板拖拽过程态。
 */

export function useColumnManager(
  enhancedColumns: ComputedRef<EnhancedColumn[]>,
  resizedColumnWidths: Ref<Record<string, number>>
) {
  const columnOrderKeys = ref<string[]>([])
  const visibleColumnKeys = ref<string[]>([])
  const colDraggingKey = ref<string | null>(null)
  const colDragOverKey = ref<string | null>(null)

  const orderedEnhancedColumns = computed<EnhancedColumn[]>(() => {
    const columnMap = new Map(enhancedColumns.value.map((col) => [col.key, col]))
    return columnOrderKeys.value
      .map((key) => columnMap.get(key))
      .filter((col): col is EnhancedColumn => Boolean(col))
  })

  const visibleColumnSet = computed(() => new Set(visibleColumnKeys.value))

  const visibleOrderedColumns = computed<EnhancedColumn[]>(() =>
    orderedEnhancedColumns.value.filter((col) => visibleColumnSet.value.has(col.key))
  )

  const filterableColumns = computed(() =>
    orderedEnhancedColumns.value.filter((col) => Boolean(col.prop))
  )

  const sortableColumns = computed(() =>
    orderedEnhancedColumns.value.filter((col) => col.canSort)
  )

  // 归一化顺序：尽量保留用户现有顺序，同时把新增列补到末尾。

  const normalizeColumnOrderKeys = (nextKeys: string[]) => {
    const keySet = new Set(nextKeys)
    const kept = columnOrderKeys.value.filter((key) => keySet.has(key))
    const missing = nextKeys.filter((key) => !kept.includes(key))
    return [...kept, ...missing]
  }

  // 从静态列配置推导初始顺序键（columnKey > prop > label）。

  const getDefaultColumnOrderKeys = (columns: { columnKey?: string; prop?: string; label: string }[]) =>
    columns.map((col) => col.columnKey ?? col.prop ?? col.label)

  // 对外提供“恢复默认顺序”能力。

  const resetColumnOrder = (defaultKeys: string[]) => {
    columnOrderKeys.value = normalizeColumnOrderKeys(defaultKeys)
  }

  // 精确重排：把 source 移到 target 前/后，用于程序化排序场景。

  const reorderColumnKeys = (sourceKey: string, targetKey: string, insertAfter = false) => {
    if (sourceKey === targetKey) return
    const nextKeys = columnOrderKeys.value.slice()
    const sourceIndex = nextKeys.indexOf(sourceKey)
    const targetIndex = nextKeys.indexOf(targetKey)
    if (sourceIndex === -1 || targetIndex === -1) return
    nextKeys.splice(sourceIndex, 1)
    const removedBeforeTarget = sourceIndex < targetIndex
    const baseTargetIndex = removedBeforeTarget ? targetIndex - 1 : targetIndex
    const insertIndex = insertAfter ? baseTargetIndex + 1 : baseTargetIndex
    nextKeys.splice(insertIndex, 0, sourceKey)
    columnOrderKeys.value = nextKeys
  }

  // 一键全显：以当前排序后的列集合为准。

  const enableAllColumnsVisible = () => {
    visibleColumnKeys.value = orderedEnhancedColumns.value.map((c) => c.key)
  }

  // 一键全隐：仅清空可见键，不改列顺序。

  const disableAllColumnsVisible = () => {
    visibleColumnKeys.value = []
  }

  // 单列显隐切换：保持 visibleColumnKeys 的不可变更新语义。

  const toggleColumnVisible = (key: string, checked: boolean) => {
    if (checked) {
      if (!visibleColumnKeys.value.includes(key)) {
        visibleColumnKeys.value = [...visibleColumnKeys.value, key]
      }
    } else {
      visibleColumnKeys.value = visibleColumnKeys.value.filter((k) => k !== key)
    }
  }

  // 列面板拖拽排序：记录拖拽源并写入 dataTransfer，兼容原生 DnD。
  const handleColOrderDragStart = (key: string, event: DragEvent) => {
    colDraggingKey.value = key
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', key)
    }
  }

  // 仅当 source 与 target 不同才更新悬停目标，避免自身高亮闪烁。

  const handleColOrderDragOver = (key: string) => {
    if (colDraggingKey.value && colDraggingKey.value !== key) {
      colDragOverKey.value = key
    }
  }

  // 离开当前悬停项时及时清理状态，保证视觉反馈准确。

  const handleColOrderDragLeave = (key: string) => {
    if (colDragOverKey.value === key) colDragOverKey.value = null
  }

  // 落点后执行重排并统一回收拖拽状态。

  const handleColOrderDrop = (targetKey: string) => {
    const sourceKey = colDraggingKey.value
    if (!sourceKey || sourceKey === targetKey) {
      colDraggingKey.value = null
      colDragOverKey.value = null
      return
    }
    const nextKeys = columnOrderKeys.value.slice()
    const fromIdx = nextKeys.indexOf(sourceKey)
    const toIdx = nextKeys.indexOf(targetKey)
    if (fromIdx === -1 || toIdx === -1) {
      colDraggingKey.value = null
      colDragOverKey.value = null
      return
    }
    nextKeys.splice(fromIdx, 1)
    nextKeys.splice(toIdx, 0, sourceKey)
    columnOrderKeys.value = nextKeys
    colDraggingKey.value = null
    colDragOverKey.value = null
  }

  // 拖拽结束兜底清理。

  const handleColOrderDragEnd = () => {
    colDraggingKey.value = null
    colDragOverKey.value = null
  }

  // 列定义变更时，统一同步顺序/显隐/宽度，保证三份状态不漂移。
  watch(
    () => enhancedColumns.value.map((col) => col.key).join(','),
    () => {
      const nextKeys = enhancedColumns.value.map((col) => col.key)
      columnOrderKeys.value = normalizeColumnOrderKeys(nextKeys)

      const nextKeySet = new Set(nextKeys)
      visibleColumnKeys.value = visibleColumnKeys.value.filter((key) => nextKeySet.has(key))
      if (!visibleColumnKeys.value.length && nextKeys.length) {
        visibleColumnKeys.value = nextKeys.slice()
      }

      // 清理已下线列的宽度缓存，避免脏配置回灌。
      const keepSet = new Set(nextKeys)
      const nextWidths: Record<string, number> = {}
      Object.entries(resizedColumnWidths.value).forEach(([key, width]) => {
        if (keepSet.has(key)) nextWidths[key] = width
      })
      resizedColumnWidths.value = nextWidths
    },
    { immediate: true }
  )

  return {
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
    getDefaultColumnOrderKeys,
    resetColumnOrder,
    reorderColumnKeys,
    enableAllColumnsVisible,
    disableAllColumnsVisible,
    toggleColumnVisible,
    handleColOrderDragStart,
    handleColOrderDragOver,
    handleColOrderDragLeave,
    handleColOrderDrop,
    handleColOrderDragEnd
  }
}
