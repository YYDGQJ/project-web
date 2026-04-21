import { ref, computed, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { EnhancedColumn } from '../types'

// 管理列排序能力与排序状态切换

export function useSortManager(
  sortableColumns: ComputedRef<EnhancedColumn[]>,
  getEnhancedColumn: (key: string) => EnhancedColumn | undefined,
  defaultSort?: { prop: string; order: 'ascending' | 'descending' | null }
) {
  const sortKey = ref<string | null>(defaultSort?.prop ?? null)
  const sortOrder = ref<'ascending' | 'descending' | null>(defaultSort?.order ?? null)
  const sortEnabledKeys = ref<string[]>([])

  const sortEnabledSet = computed(() => new Set(sortEnabledKeys.value))

  // 判断目标列是否允许排序

  const isColumnSortEnabled = (columnKey: string) => sortEnabledSet.value.has(columnKey)

  // 启用所有可排序列

  const enableAllSorts = () => {
    sortEnabledKeys.value = sortableColumns.value.map((c) => c.key)
  }

  // 关闭所有列排序能力

  const disableAllSorts = () => {
    sortEnabledKeys.value = []
  }

  // 获取指定列的当前排序方向

  const getSortOrder = (columnKey: string): 'ascending' | 'descending' | null =>
    sortKey.value === columnKey ? sortOrder.value : null

  // 生成排序按钮激活态样式

  const getSortBtnClass = (columnKey: string) => ({
    'common-table-sort-btn--active': sortKey.value === columnKey && sortOrder.value !== null
  })

  // 生成排序按钮提示文案

  const getSortBtnTitle = (columnKey: string) => {
    const order = getSortOrder(columnKey)
    if (order === 'ascending') return '当前升序，点击切换降序'
    if (order === 'descending') return '当前降序，点击取消排序'
    return '点击升序排序'
  }

  // 执行三态排序切换：升序/降序/取消

  const toggleSort = (columnKey: string) => {
    if (!isColumnSortEnabled(columnKey)) return
    if (sortKey.value !== columnKey) {
      sortKey.value = columnKey
      sortOrder.value = 'ascending'
      return
    }
    if (sortOrder.value === 'ascending') {
      sortOrder.value = 'descending'
    } else if (sortOrder.value === 'descending') {
      sortKey.value = null
      sortOrder.value = null
    } else {
      sortOrder.value = 'ascending'
    }
  }

  // 可排序列变化时，移除已失效的键
  watch(
    () => sortableColumns.value.map((c) => c.key).join(','),
    () => {
      const validKeySet = new Set(sortableColumns.value.map((c) => c.key))
      sortEnabledKeys.value = sortEnabledKeys.value.filter((k) => validKeySet.has(k))
    },
    { immediate: true }
  )

  // 禁用排序后，清除当前排序状态
  watch(sortEnabledKeys, () => {
    if (sortKey.value && !sortEnabledSet.value.has(sortKey.value)) {
      sortKey.value = null
      sortOrder.value = null
    }
  })

  return {
    sortKey,
    sortOrder,
    sortEnabledKeys,
    sortEnabledSet,
    isColumnSortEnabled,
    enableAllSorts,
    disableAllSorts,
    getSortOrder,
    getSortBtnClass,
    getSortBtnTitle,
    toggleSort
  }
}
