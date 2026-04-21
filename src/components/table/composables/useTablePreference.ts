import { useRoute } from 'vue-router'
import type { Ref, ComputedRef } from 'vue'
import type { EnhancedColumn } from '../types'
import {
  loadCommonTablePreference,
  saveCommonTablePreference,
  type CommonTablePreference
} from '../tablePreference'
import {
  sanitizePreferenceKeys,
  mergePreferenceOrderKeys,
  sanitizePreferenceWidths
} from '../utils/preferenceUtils'

interface TablePreferenceOptions {
  preferenceEnabled: boolean
  repairVisibleColumnsWhenEmpty: boolean
  tableName: string
  tablePreferenceReady: Ref<boolean>
  applyingTablePreference: Ref<boolean>
  columnOrderKeys: Ref<string[]>
  visibleColumnKeys: Ref<string[]>
  filterEnabledKeys: Ref<string[]>
  sortEnabledKeys: Ref<string[]>
  resizedColumnWidths: Ref<Record<string, number>>
  internalPageSize: Ref<number>
  filterableColumns: ComputedRef<EnhancedColumn[]>
  sortableColumns: ComputedRef<EnhancedColumn[]>
  getDefaultColumnOrderKeys: () => string[]
}

// 管理表格偏好的加载、应用与节流保存

export function useTablePreference(options: TablePreferenceOptions) {
  const {
    preferenceEnabled,
    repairVisibleColumnsWhenEmpty,
    tableName,
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
  } = options

  const route = useRoute()
  let tablePreferenceSaveTimer: ReturnType<typeof window.setTimeout> | null = null

  // 获取当前路由路径作为偏好命名空间

  const getTablePreferenceRoutePath = () => route.path || '/'

  // 计算表格偏好键：优先表名，其次列结构

  const getTablePreferenceTableKey = () => {
    const nameKey = tableName?.trim()
    if (nameKey) return nameKey
    const schemaKey = getDefaultColumnOrderKeys().join('|')
    return schemaKey || 'default'
  }

  // 构建待保存的偏好快照（过滤和排序固定为开启，不保存其启用状态）

  const buildTablePreferenceSnapshot = (): CommonTablePreference => ({
    visibleColumnKeys: visibleColumnKeys.value.slice(),
    columnOrderKeys: columnOrderKeys.value.slice(),
    resizedColumnWidths: sanitizePreferenceWidths(
      resizedColumnWidths.value,
      getDefaultColumnOrderKeys()
    ),
    pageSize: internalPageSize.value
  })

  const saveTablePreferenceSnapshot = (routePath: string) => {
    void saveCommonTablePreference(
      routePath,
      getTablePreferenceTableKey(),
      buildTablePreferenceSnapshot()
    )
  }

  // 将持久化偏好应用到当前表格状态（过滤和排序状态由组件自动初始化，不从偏好恢复）

  const applyTablePreference = (preference: CommonTablePreference) => {
    applyingTablePreference.value = true
    const routePath = getTablePreferenceRoutePath()
    const allColumnKeys = getDefaultColumnOrderKeys()

    columnOrderKeys.value = mergePreferenceOrderKeys(preference.columnOrderKeys, allColumnKeys)
    const sanitizedVisibleKeys = sanitizePreferenceKeys(preference.visibleColumnKeys, allColumnKeys)
    if (repairVisibleColumnsWhenEmpty && !sanitizedVisibleKeys.length && allColumnKeys.length) {
      visibleColumnKeys.value = allColumnKeys.slice()
    } else {
      visibleColumnKeys.value = sanitizedVisibleKeys
    }
    resizedColumnWidths.value = sanitizePreferenceWidths(
      preference.resizedColumnWidths,
      allColumnKeys
    )

    const nextPageSize = Number(preference.pageSize)
    if (Number.isFinite(nextPageSize) && nextPageSize > 0) {
      internalPageSize.value = nextPageSize
    }

    applyingTablePreference.value = false

    if (repairVisibleColumnsWhenEmpty && !sanitizedVisibleKeys.length && allColumnKeys.length) {
      saveTablePreferenceSnapshot(routePath)
    }
  }

  const initializeTablePreference = async () => {
    if (!preferenceEnabled) return
    const routePath = getTablePreferenceRoutePath()
    if (routePath === '/login') return
    const preference = await loadCommonTablePreference(routePath, getTablePreferenceTableKey())
    if (preference) applyTablePreference(preference)
  }

  // 延迟保存偏好，合并短时间内多次变更

  const scheduleSaveTablePreference = () => {
    if (!preferenceEnabled) return
    if (!tablePreferenceReady.value || applyingTablePreference.value) return
    const routePath = getTablePreferenceRoutePath()
    if (routePath === '/login') return
    if (tablePreferenceSaveTimer) clearTimeout(tablePreferenceSaveTimer)
    tablePreferenceSaveTimer = window.setTimeout(() => {
      tablePreferenceSaveTimer = null
      saveTablePreferenceSnapshot(routePath)
    }, 300)
  }

  // 清理待执行的保存定时器

  const clearSaveTimer = () => {
    if (tablePreferenceSaveTimer) {
      clearTimeout(tablePreferenceSaveTimer)
      tablePreferenceSaveTimer = null
    }
  }

  return {
    initializeTablePreference,
    scheduleSaveTablePreference,
    buildTablePreferenceSnapshot,
    applyTablePreference,
    clearSaveTimer
  }
}
