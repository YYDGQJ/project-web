import { ref, computed, nextTick } from 'vue'
import type { ComputedRef } from 'vue'
import { getColumnKey } from '../utils/columnUtils'

// 管理树形数据展开层级与批量展开/收起行为

export function useTreeManager(
  props: {
    data: any[]
    rowKey?: string | ((row: any) => string | number)
  },
  getRowIdentity: (row: any) => string | number,
  getVtableInstance: () => any,
  buildSummaryRecord: () => Record<string, string> | null
) {
  const expandedTreeRowKeys = ref<Array<string | number>>([])
  const vtableHierarchyExpandLevel = ref(1)

  // 判断数据中是否包含子节点

  const hasChildrenRows = (rows: any[]): boolean =>
    rows.some((row) => {
      const children = row?.children
      return Array.isArray(children) && children.length > 0
    })

  const hasTreeData = computed(() => hasChildrenRows(props.data))

  // 收集全部父节点行（用于展开控制）

  const collectTreeRows = (rows: any[]): any[] => {
    const result: any[] = []
    // 深度优先遍历树结构并收集父节点
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

  // 清除记录上的层级状态，便于按新层级重建

  const clearAllHierarchyState = (rows: any[]) => {
    rows.forEach((row) => {
      delete row.hierarchyState
      if (Array.isArray(row.children)) clearAllHierarchyState(row.children)
    })
  }

  // 以指定展开层级重置表格记录

  const setRecordsWithLevel = (level: number) => {
    const vtableInstance = getVtableInstance()
    if (!vtableInstance) return
    clearAllHierarchyState(props.data)
    const origLevel = vtableInstance.options.hierarchyExpandLevel
    vtableInstance.options.hierarchyExpandLevel = level
    const summaryRecord = buildSummaryRecord()
    const records = summaryRecord
      ? [...props.data, summaryRecord]
      : props.data.slice()
    vtableInstance.setRecords(records)
    vtableInstance.options.hierarchyExpandLevel = origLevel
  }

  // 展开所有层级

  const expandAllTreeRows = () => setRecordsWithLevel(999)
  // 收起到首层
  const collapseAllTreeRows = () => setRecordsWithLevel(1)

  // 切换单行展开状态

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

  return {
    expandedTreeRowKeys,
    vtableHierarchyExpandLevel,
    hasTreeData,
    collectTreeRows,
    allTreeRowKeys,
    clearAllHierarchyState,
    setRecordsWithLevel,
    expandAllTreeRows,
    collapseAllTreeRows,
    handleTreeExpandChange
  }
}
