import { ref, computed, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { EnhancedColumn, FilterValue } from '../types'
import {
  cloneFilterValues,
  toFilterValueKey,
  getFilterValueText
} from '../utils/filterUtils'

/**
 * 列筛选状态管理。
 * 状态分层：
 * 1) enabled: 当前允许参与筛选的列。
 * 2) draft: 面板内临时勾选值（未生效）。
 * 3) applied: 已确认并参与数据过滤的值。
 */

export function useFilterManager(
  filterableColumns: ComputedRef<EnhancedColumn[]>,
  enhancedColumns: ComputedRef<EnhancedColumn[]>
) {
  const filterEnabledKeys = ref<string[]>([])
  const filterPopoverVisible = ref<Record<string, boolean>>({})
  const appliedFilterState = ref<Record<string, FilterValue[]>>({})
  const draftFilterState = ref<Record<string, FilterValue[]>>({})

  const filterEnabledSet = computed(() => new Set(filterEnabledKeys.value))

  // 某列仅在启用后才允许出现“已筛选”状态。
  const isColumnFilterEnabled = (columnKey: string) => filterEnabledSet.value.has(columnKey)

  // 批量启用/禁用筛选能力，不直接修改具体筛选值。
  const enableAllFilters = () => {
    filterEnabledKeys.value = filterableColumns.value.map((c) => c.key)
  }

  const disableAllFilters = () => {
    filterEnabledKeys.value = []
  }

  // 读取时统一返回副本，避免调用方误改内部状态。
  const getAppliedFilterValues = (columnKey: string): FilterValue[] =>
    cloneFilterValues(appliedFilterState.value[columnKey] || [])

  const getDraftFilterValues = (columnKey: string): FilterValue[] =>
    cloneFilterValues(draftFilterState.value[columnKey] || [])

  // 写入时使用整体替换，确保引用变更可被响应式系统稳定追踪。
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

  const isFilterPopoverVisible = (columnKey: string) =>
    Boolean(filterPopoverVisible.value[columnKey])

  // 面板打开时，以已应用值初始化草稿，避免草稿脏数据跨次打开残留。
  const handleFilterPopoverVisibleChange = (columnKey: string, visible: boolean) => {
    filterPopoverVisible.value = { ...filterPopoverVisible.value, [columnKey]: visible }
    if (visible) {
      setDraftFilterValues(columnKey, getAppliedFilterValues(columnKey))
    }
  }

  const updateDraftFilterValues = (columnKey: string, values: FilterValue[]) => {
    setDraftFilterValues(columnKey, values)
  }

  // 只有“列已启用 + 已应用值非空”才标记为筛选激活。
  const hasAppliedFilter = (columnKey: string) => {
    if (!isColumnFilterEnabled(columnKey)) return false
    return getAppliedFilterValues(columnKey).length > 0
  }

  // 供分页区展示“当前筛选摘要”，用于快速感知过滤条件。
  const activeFilterSummaries = computed(() => {
    return enhancedColumns.value
      .filter((column) => Boolean(column.prop) && isColumnFilterEnabled(column.key))
      .map((column) => {
        const appliedValues = getAppliedFilterValues(column.key)
        return {
          key: column.key,
          label: column.label,
          valuesText: appliedValues
            .map((value) => getFilterValueText(column, value))
            .join('、')
        }
      })
      .filter((item) => item.valuesText)
  })

  const clearFilterSummary = (columnKey: string) => {
    resetFilters(columnKey)
  }

  // 面板工具条“全选”状态判断。
  const showSelectAllIndicator = (
    columnKey: string,
    total: number
  ) => {
    if (!total) return false
    const selected = getDraftFilterValues(columnKey).length
    return selected === total
  }

  const selectAllFilters = (
    columnKey: string,
    options: Array<{ text: string; value: FilterValue }>
  ) => {
    setDraftFilterValues(columnKey, options.map((item) => item.value))
  }

  // 反选以值 key 做比较，兼容 number/boolean/string 混合类型。
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

  // 确认时从 draft 提交到 applied，并主动关闭面板。
  const confirmFilters = (columnKey: string) => {
    setAppliedFilterValues(columnKey, getDraftFilterValues(columnKey))
    handleFilterPopoverVisibleChange(columnKey, false)
  }

  // 清空当前列所有筛选状态（草稿 + 已应用）。
  const resetFilters = (columnKey: string) => {
    setDraftFilterValues(columnKey, [])
    setAppliedFilterValues(columnKey, [])
  }

  // 列定义变化时，清理已不存在列的启用状态。
  watch(
    () => filterableColumns.value.map((c) => c.key).join(','),
    () => {
      const validKeys = filterableColumns.value.map((c) => c.key)
      const validKeySet = new Set(validKeys)
      filterEnabledKeys.value = filterEnabledKeys.value.filter((k) => validKeySet.has(k))
    },
    { immediate: true }
  )

  // 启用集合变化后，联动清理被禁用列的草稿/已应用值，避免幽灵筛选条件。
  watch(filterEnabledKeys, () => {
    const enabledSet = new Set(filterEnabledKeys.value)
    const nextApplied: Record<string, FilterValue[]> = {}
    Object.entries(appliedFilterState.value).forEach(([key, values]) => {
      if (enabledSet.has(key)) nextApplied[key] = values
    })
    appliedFilterState.value = nextApplied

    const nextDraft: Record<string, FilterValue[]> = {}
    Object.entries(draftFilterState.value).forEach(([key, values]) => {
      if (enabledSet.has(key)) nextDraft[key] = values
    })
    draftFilterState.value = nextDraft
  })

  return {
    filterEnabledKeys,
    filterPopoverVisible,
    appliedFilterState,
    draftFilterState,
    filterEnabledSet,
    isColumnFilterEnabled,
    enableAllFilters,
    disableAllFilters,
    getAppliedFilterValues,
    getDraftFilterValues,
    setAppliedFilterValues,
    setDraftFilterValues,
    isFilterPopoverVisible,
    handleFilterPopoverVisibleChange,
    updateDraftFilterValues,
    hasAppliedFilter,
    activeFilterSummaries,
    clearFilterSummary,
    showSelectAllIndicator,
    selectAllFilters,
    invertFilters,
    confirmFilters,
    resetFilters
  }
}
