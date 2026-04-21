import { ref, computed, nextTick, onUnmounted } from 'vue'
import type { ComputedRef } from 'vue'

interface RowReorderProps {
  rowDraggable?: boolean
  orderField?: string
  isRowAnchor?: (row: any) => boolean
  columns: any[]
}

/**
 * 行拖拽重排控制器。
 * 功能包含：合法性校验、拖拽指示线绘制、重排落地与顺序字段回填。
 */

export function useRowReorder(
  props: RowReorderProps,
  sourceData: ComputedRef<any[]>,
  displayData: ComputedRef<any[]>,
  selectedRowKeys: ComputedRef<Set<string>>,
  getRowIdentity: (row: any) => string | number,
  resolvedOrderColumnKey: ComputedRef<string | null>,
  getVtableInstance: () => any,
  vtableRef: ComputedRef<HTMLElement | null>,
  tableWrapperRef: ComputedRef<HTMLElement | null>,
  buildSummaryRecord: () => Record<string, string> | null,
  emit: (...args: any[]) => void
) {
  const rowDragIndicator = ref<{ visible: boolean; top: number; left: number; width: number }>({
    visible: false,
    top: 0,
    left: 0,
    width: 0
  })

  // 内部过程态：记录起点、是否进入拖拽、鼠标起始坐标。
  let rowDragState: {
    active: boolean
    dragging: boolean
    sourceRow: number
    sourceCol: number
    startX: number
    startY: number
  } | null = null
  let rowDragMoveHandler: ((e: MouseEvent) => void) | null = null
  let rowDragUpHandler: ((e: MouseEvent) => void) | null = null

  // 拖拽仅在 rowDraggable 打开且存在排序列时生效。
  const isRowReorderEnabled = computed(() =>
    Boolean(props.rowDraggable && resolvedOrderColumnKey.value)
  )

  // 供外层读取过程态（例如做交互联动/调试）。
  const getRowDragState = () => rowDragState

  // 在树结构中定位指定行的“同级列表 + 索引”，用于同层级拖拽约束。

  const findSiblingContext = (
    key: string,
    items: any[]
  ): { list: any[]; index: number } | null => {
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

  // 只返回同级列表，不暴露索引。

  const findSiblingList = (key: string, items: any[]): any[] | null =>
    findSiblingContext(key, items)?.list ?? null

  // 重排后回写顺序字段（默认 order，从 1 开始）。

  const applySiblingOrder = (rows: any[]) => {
    const field = props.orderField || 'order'
    rows.forEach((row, index) => {
      if (row && typeof row === 'object') row[field] = index + 1
    })
  }

  // 将单元格坐标映射为真实数据行，仅允许 body 区且必须来自 displayData。

  const getBodyRecordByCellAddress = (
    address: { col?: number; row?: number } | null | undefined
  ) => {
    const vtableInstance = getVtableInstance()
    if (!vtableInstance) return null
    const col = Number(address?.col)
    const row = Number(address?.row)
    if (!Number.isFinite(col) || !Number.isFinite(row)) return null
    const location = vtableInstance.getCellLocation?.(col, row)
    if (location !== 'body') return null
    const record = vtableInstance.getCellOriginRecord?.(col, row)
    if (!record || typeof record !== 'object') return null
    // 排除汇总/衍生行：仅处理当前数据集中的真实业务行。
    const isInData = (rows: any[]): boolean =>
      rows.some(
        (r) => r === record || (Array.isArray(r.children) && isInData(r.children))
      )
    if (!isInData(displayData.value)) return null
    return record
  }

  // 约束：源行不可为锚点行，且 source/target 必须同层级。

  const validateVTableDragOrder = (
    source: { col: number; row: number },
    target: { col: number; row: number }
  ) => {
    if (!isRowReorderEnabled.value) return true
    const sourceRecord = getBodyRecordByCellAddress(source)
    const targetRecord = getBodyRecordByCellAddress(target)
    if (!sourceRecord || !targetRecord) return true
    if (props.isRowAnchor?.(sourceRecord)) return false
    const sourceKey = String(getRowIdentity(sourceRecord))
    const targetKey = String(getRowIdentity(targetRecord))
    const sourceSiblings = findSiblingList(sourceKey, sourceData.value)
    const targetSiblings = findSiblingList(targetKey, sourceData.value)
    return Boolean(sourceSiblings && targetSiblings && sourceSiblings === targetSiblings)
  }

  // 执行重排：支持“选中多行跟随拖动”，并在落地后刷新 VTable 记录。

  const handleVTableRowReorder = (args: any) => {
    if (!isRowReorderEnabled.value) return
    const source = args?.source
    const target = args?.target
    if (!source || !target) return
    const sourceRecord = getBodyRecordByCellAddress(source)
    const targetRecord = getBodyRecordByCellAddress(target)
    if (!sourceRecord || !targetRecord || sourceRecord === targetRecord) return
    if (props.isRowAnchor?.(sourceRecord)) return

    const sourceKey = String(getRowIdentity(sourceRecord))
    const targetKey = String(getRowIdentity(targetRecord))
    const sourceSiblings = findSiblingList(sourceKey, sourceData.value)
    const targetSiblings = findSiblingList(targetKey, sourceData.value)
    if (!sourceSiblings || sourceSiblings !== targetSiblings) return

    const newSiblings = sourceSiblings.slice()
    const siblingSelectedKeys = new Set(
      newSiblings
        .map((row) => String(getRowIdentity(row)))
        .filter((key) => selectedRowKeys.value.has(key))
    )
    const movingKeys = siblingSelectedKeys.has(sourceKey)
      ? newSiblings
        .map((row) => String(getRowIdentity(row)))
        .filter((key) => siblingSelectedKeys.has(key))
      : [sourceKey]
    const draggedRows = newSiblings.filter((row) => movingKeys.includes(String(getRowIdentity(row))))
    if (!draggedRows.length) return
    const sourceIndexes = newSiblings
      .map((row, index) => (movingKeys.includes(String(getRowIdentity(row))) ? index : -1))
      .filter((index) => index >= 0)
    const remainingRows = newSiblings.filter((row) => !movingKeys.includes(String(getRowIdentity(row))))
    const targetIdx = remainingRows.findIndex((row) => String(getRowIdentity(row)) === targetKey)
    if (targetIdx < 0) return
    const movingDown = sourceIndexes.length > 0 && Math.max(...sourceIndexes) < Number(target.row)
    const toIdx = movingDown ? targetIdx + 1 : targetIdx
    remainingRows.splice(Math.max(0, Math.min(toIdx, remainingRows.length)), 0, ...draggedRows)

    applySiblingOrder(remainingRows)
    sourceSiblings.splice(0, sourceSiblings.length, ...remainingRows)
    emit('row-reorder', sourceData.value.slice())

    nextTick(() => {
      const vtableInstance = getVtableInstance()
      if (!vtableInstance?.setRecords) return
      const summaryRecord = buildSummaryRecord()
      const records = summaryRecord ? [...sourceData.value, summaryRecord] : sourceData.value.slice()
      vtableInstance.setRecords(records)
    })
  }

  // 安装拖拽监听：按移动阈值判定是否进入真实拖拽，并实时绘制插入指示线。

  const setupRowDragListeners = () => {
    const vtableInstance = getVtableInstance()
    if (!vtableInstance || !isRowReorderEnabled.value) return

    if (rowDragMoveHandler) document.removeEventListener('mousemove', rowDragMoveHandler)
    if (rowDragUpHandler) document.removeEventListener('mouseup', rowDragUpHandler)
    rowDragState = null

    rowDragMoveHandler = (e: MouseEvent) => {
      if (!rowDragState) return
      const dx = e.clientX - rowDragState.startX
      const dy = e.clientY - rowDragState.startY
      if (!rowDragState.dragging && Math.sqrt(dx * dx + dy * dy) < 5) return
      rowDragState.dragging = true

      const vtable = getVtableInstance()
      if (!vtable || !vtableRef.value || !tableWrapperRef.value) return
      const tableRect = vtableRef.value.getBoundingClientRect()
      const relX = e.clientX - tableRect.left
      const relY = e.clientY - tableRect.top
      const cell = vtable.getCellAtRelativePosition?.(relX, relY)
      if (!cell) { rowDragIndicator.value = { ...rowDragIndicator.value, visible: false }; return }
      const loc = vtable.getCellLocation?.(cell.col, cell.row)
      if (loc !== 'body') { rowDragIndicator.value = { ...rowDragIndicator.value, visible: false }; return }
      const cellRect =
        vtable.getCellRelativeRect?.(cell.col, cell.row) ??
        vtable.getCellRect?.(cell.col, cell.row)
      if (!cellRect) return
      const wrapperRect = tableWrapperRef.value.getBoundingClientRect()
      const insertAfter = cell.row >= rowDragState.sourceRow
      const lineTop =
        tableRect.top - wrapperRect.top + cellRect.top + (insertAfter ? cellRect.height : 0)
      rowDragIndicator.value = {
        visible: true,
        top: lineTop,
        left: tableRect.left - wrapperRect.left,
        width: tableRect.width
      }
    }

    rowDragUpHandler = (e: MouseEvent) => {
      document.removeEventListener('mousemove', rowDragMoveHandler!)
      document.removeEventListener('mouseup', rowDragUpHandler!)
      rowDragIndicator.value = { ...rowDragIndicator.value, visible: false }
      const state = rowDragState
      rowDragState = null
      if (!state?.dragging || !vtableRef.value) return
      const vtable = getVtableInstance()
      if (!vtable) return
      const tableRect = vtableRef.value.getBoundingClientRect()
      const relX = e.clientX - tableRect.left
      const relY = e.clientY - tableRect.top
      const cell = vtable.getCellAtRelativePosition?.(relX, relY)
      if (!cell) return
      const loc = vtable.getCellLocation?.(cell.col, cell.row)
      if (loc !== 'body' || cell.row === state.sourceRow) return
      handleVTableRowReorder({
        source: { col: state.sourceCol, row: state.sourceRow },
        target: { col: cell.col, row: cell.row }
      })
    }

    vtableInstance.on?.('mousedown_cell', (args: any) => {
      if (!isRowReorderEnabled.value) return
      const { col, row } = args || {}
      const location = vtableInstance.getCellLocation?.(col, row)
      if (location !== 'body') return
      const event = args?.event as MouseEvent | undefined
      if (!event || event.button !== 0) return
      rowDragState = {
        active: true,
        dragging: false,
        sourceRow: row,
        sourceCol: col,
        startX: event.clientX,
        startY: event.clientY
      }
      document.addEventListener('mousemove', rowDragMoveHandler!)
      document.addEventListener('mouseup', rowDragUpHandler!)
    })
  }

  // 统一释放全局 mousemove/mouseup 监听，避免内存泄漏。

  const cleanupRowDragListeners = () => {
    if (rowDragMoveHandler) document.removeEventListener('mousemove', rowDragMoveHandler)
    if (rowDragUpHandler) document.removeEventListener('mouseup', rowDragUpHandler)
  }

  onUnmounted(cleanupRowDragListeners)

  return {
    rowDragIndicator,
    isRowReorderEnabled,
    getRowDragState,
    validateVTableDragOrder,
    handleVTableRowReorder,
    setupRowDragListeners,
    cleanupRowDragListeners
  }
}
