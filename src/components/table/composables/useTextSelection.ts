import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import type { ComputedRef } from 'vue'
import { VTABLE_CELL_PADDING_LEFT, VTABLE_CELL_PADDING_RIGHT } from '../constants'

// 管理单元格文字选择浮层与拖拽选区交互

export function useTextSelection(
  vtableRef: ComputedRef<HTMLElement | null>,
  tableWrapperRef: ComputedRef<HTMLElement | null>,
  isRowDragActive: () => boolean
) {
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
  let textMeasureCanvas: HTMLCanvasElement | null = null

  // 隐藏文字选择浮层并重置拖拽状态

  const hideTextSelectOverlay = () => {
    textSelectOverlay.value = { ...textSelectOverlay.value, visible: false, text: '' }
    textSelectDragState.value = { ...textSelectDragState.value, active: false }
  }

  // 从事件参数中提取鼠标横坐标

  const extractClientX = (args: any): number | null => {
    const evt = args?.event?.nativeEvent ?? args?.event ?? null
    if (typeof evt?.clientX === 'number') return evt.clientX
    return null
  }

  // 获取文本测量上下文（用于精确计算鼠标落点对应字符）

  const getTextMeasureContext = () => {
    if (!textMeasureCanvas) {
      textMeasureCanvas = document.createElement('canvas')
    }
    return textMeasureCanvas.getContext('2d')
  }

  const getOverlayFont = () => {
    const textarea = textSelectTextareaRef.value
    if (!textarea) return '12px sans-serif'
    const style = window.getComputedStyle(textarea)
    const fontStyle = style.fontStyle || 'normal'
    const fontWeight = style.fontWeight || '400'
    const fontSize = style.fontSize || '12px'
    const fontFamily = style.fontFamily || 'sans-serif'
    return `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`
  }

  // 按点击位置将文本映射为字符索引

  const resolveSelectionIndex = (
    text: string,
    clientX: number,
    contentLeftClient: number,
    contentWidth: number
  ) => {
    if (!text.length || contentWidth <= 0) return 0
    const localX = Math.min(contentWidth, Math.max(0, clientX - contentLeftClient))
    const context = getTextMeasureContext()
    if (!context) {
      const ratio = Math.min(1, Math.max(0, localX / contentWidth))
      return Math.round(text.length * ratio)
    }

    context.font = getOverlayFont()
    let low = 0
    let high = text.length
    while (low < high) {
      const mid = Math.floor((low + high) / 2)
      const width = context.measureText(text.slice(0, mid)).width
      if (width < localX) {
        low = mid + 1
      } else {
        high = mid
      }
    }

    const leftIndex = Math.max(0, low - 1)
    const leftWidth = context.measureText(text.slice(0, leftIndex)).width
    const rightWidth = context.measureText(text.slice(0, low)).width
    if (Math.abs(localX - leftWidth) <= Math.abs(rightWidth - localX)) {
      return leftIndex
    }
    return Math.min(text.length, low)
  }

  // 在浮层文本域中应用选区范围

  const applyOverlaySelection = (start: number, end: number) => {
    const input = textSelectTextareaRef.value
    if (!input) return
    const from = Math.min(start, end)
    const to = Math.max(start, end)
    input.focus({ preventScroll: true })
    input.setSelectionRange(from, to)
  }

  // 拖拽过程中实时更新文本选区

  const handleTextSelectDragMove = (event: MouseEvent) => {
    if (!textSelectDragState.value.active || !textSelectOverlay.value.visible) return
    const endIndex = resolveSelectionIndex(
      textSelectOverlay.value.text,
      event.clientX,
      textSelectDragState.value.contentLeftClient,
      textSelectDragState.value.contentWidth
    )
    applyOverlaySelection(textSelectDragState.value.anchorIndex, endIndex)
  }

  // 结束文本拖拽并清理监听

  const handleTextSelectDragEnd = () => {
    textSelectDragState.value = { ...textSelectDragState.value, active: false }
    document.removeEventListener('mousemove', handleTextSelectDragMove)
    document.removeEventListener('mouseup', handleTextSelectDragEnd)
  }

  // 在点击单元格时创建文字选择浮层

  const startTextSelectionOverlay = (
    args: any,
    vtableInstance: any,
    options?: { selectAll?: boolean; disableDrag?: boolean }
  ) => {
    if (!vtableInstance || !vtableRef.value || !tableWrapperRef.value) return
    if (isRowDragActive()) return

    const mouseButton = args?.event?.button ?? args?.button ?? 0
    if (mouseButton !== 0) return

    const { col, row } = args || {}
    const location = vtableInstance.getCellLocation?.(col, row)
    if (location !== 'body') { hideTextSelectOverlay(); return }

    const rawValue = vtableInstance.getCellValue?.(col, row)
    if (rawValue === undefined || rawValue === null) { hideTextSelectOverlay(); return }
    const text = String(rawValue)
    if (!text.trim()) { hideTextSelectOverlay(); return }

    const rect = vtableInstance.getCellRelativeRect?.(col, row) ?? vtableInstance.getCellRect?.(col, row)
    if (!rect) { hideTextSelectOverlay(); return }

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
    const shouldSelectAll = options?.selectAll === true
    const shouldDisableDrag = options?.disableDrag === true

    textSelectOverlay.value = {
      visible: true,
      text,
      left,
      top,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    }
    textSelectDragState.value = {
      active: !shouldDisableDrag,
      anchorIndex: shouldSelectAll ? 0 : anchorIndex,
      contentLeftClient,
      contentWidth
    }
    suppressNextTextOverlayGlobalClose.value = true
    setTimeout(() => { suppressNextTextOverlayGlobalClose.value = false }, 0)

    nextTick(() => {
      if (shouldSelectAll) {
        applyOverlaySelection(0, text.length)
        return
      }
      applyOverlaySelection(anchorIndex, anchorIndex)
    })

    document.removeEventListener('mousemove', handleTextSelectDragMove)
    document.removeEventListener('mouseup', handleTextSelectDragEnd)
    if (!shouldDisableDrag) {
      document.addEventListener('mousemove', handleTextSelectDragMove)
      document.addEventListener('mouseup', handleTextSelectDragEnd)
    }
  }

  // 处理全局点击：点击浮层外时关闭

  const handleGlobalLeftClickCloseTextOverlay = (event: MouseEvent) => {
    if (event.button !== 0 || !textSelectOverlay.value.visible) return
    if (suppressNextTextOverlayGlobalClose.value) return
    const target = event.target as HTMLElement | null
    if (target?.closest('.common-table-text-select-overlay')) return
    hideTextSelectOverlay()
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', handleTextSelectDragMove)
    document.removeEventListener('mouseup', handleTextSelectDragEnd)
  })

  return {
    textSelectTextareaRef,
    textSelectOverlay,
    suppressNextTextOverlayGlobalClose,
    hideTextSelectOverlay,
    startTextSelectionOverlay,
    handleGlobalLeftClickCloseTextOverlay
  }
}
